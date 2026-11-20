require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { User, Policy, Claim } = require("./models");
const { requireAuth, allowRoles } = require("./auth");
const chain = require("./blockchain");

const app = express();
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname).slice(0, 10)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only PDF, PNG, and JPG files are accepted."), allowed.includes(file.mimetype));
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "MediChain API" }));

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: req.user }));

app.get("/api/claims", requireAuth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "PATIENT") filter.patient = req.user._id;
    if (req.user.role === "HOSPITAL") filter.status = "SUBMITTED";
    if (req.user.role === "INSURER") filter.status = "HOSPITAL_VERIFIED";
    const claims = await Claim.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/claims/:id", requireAuth, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).lean();
    if (!claim) return res.status(404).json({ message: "Claim not found." });
    if (req.user.role === "PATIENT" && String(claim.patient) !== String(req.user._id)) {
      return res.status(403).json({ message: "You cannot view this claim." });
    }
    res.json({ claim });
  } catch (error) {
    res.status(400).json({ message: "Invalid claim ID." });
  }
});

app.post("/api/claims", requireAuth, allowRoles("PATIENT"), upload.single("document"), async (req, res) => {
  try {
    const { policyNumber, hospitalName, treatmentDate, amount, description } = req.body;
    const numericAmount = Number(amount);
    if (!policyNumber || !hospitalName || !treatmentDate || !description || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Please complete all required fields with a valid amount." });
    }

    const policy = await Policy.findOne({ policyNumber, patient: req.user._id });
    if (!policy || !policy.active || policy.validUntil < new Date()) {
      return res.status(400).json({ message: "No active policy found for this policy number." });
    }
    if (numericAmount > policy.coverageLimit) {
      return res.status(400).json({ message: `Claim exceeds the demo policy coverage limit of ₹${policy.coverageLimit.toLocaleString("en-IN")}.` });
    }

    let documentHash;
    if (req.file) {
      const bytes = fs.readFileSync(req.file.path);
      documentHash = "0x" + crypto.createHash("sha256").update(bytes).digest("hex");
    } else {
      documentHash = "0x" + crypto.createHash("sha256").update(`${req.user._id}-${policyNumber}-${hospitalName}-${treatmentDate}-${numericAmount}`).digest("hex");
    }

    const fingerprint = crypto.createHash("sha256")
      .update([req.user._id, policyNumber, hospitalName.trim().toLowerCase(), new Date(treatmentDate).toISOString().slice(0, 10), numericAmount.toFixed(2)].join("|"))
      .digest("hex");

    const existing = await Claim.findOne({ fingerprint });
    if (existing) return res.status(409).json({ message: "Possible duplicate claim detected. A claim with the same patient, policy, hospital, date, and amount already exists." });

    const claim = await Claim.create({
      patient: req.user._id,
      patientName: req.user.name,
      policyNumber,
      hospitalName: hospitalName.trim(),
      treatmentDate: new Date(treatmentDate),
      amount: numericAmount,
      description: description.trim(),
      documentPath: req.file ? `/uploads/${path.basename(req.file.path)}` : "",
      documentHash,
      fingerprint
    });

    try {
      const chainResult = await chain.sendClaim(claim._id.toString(), documentHash, numericAmount);
      claim.blockchainClaimId = chainResult.claimId;
      claim.blockchainTxs.push({ action: "CLAIM_SUBMITTED", txHash: chainResult.txHash, blockNumber: chainResult.blockNumber, at: new Date() });
      await claim.save();
    } catch (chainError) {
      await Claim.findByIdAndDelete(claim._id);
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(503).json({ message: chainError.message });
    }

    res.status(201).json({ claim });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Duplicate claim detected." });
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/claims/:id/verify", requireAuth, allowRoles("HOSPITAL"), async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: "Claim not found." });
    if (claim.status !== "SUBMITTED") return res.status(409).json({ message: "Only submitted claims can be hospital-verified." });
    const tx = await chain.changeStatus(claim.blockchainClaimId, "HOSPITAL_VERIFIED");
    claim.status = "HOSPITAL_VERIFIED";
    claim.blockchainTxs.push({ action: "HOSPITAL_VERIFIED", ...tx, at: new Date() });
    await claim.save();
    res.json({ claim });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/claims/:id/decision", requireAuth, allowRoles("INSURER"), async (req, res) => {
  try {
    const decision = String(req.body.decision || "").toUpperCase();
    const reason = String(req.body.reason || "").trim();
    if (!["APPROVED", "REJECTED"].includes(decision)) return res.status(400).json({ message: "Decision must be APPROVED or REJECTED." });
    if (decision === "REJECTED" && !reason) return res.status(400).json({ message: "Please provide a rejection reason." });

    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: "Claim not found." });
    if (claim.status !== "HOSPITAL_VERIFIED") return res.status(409).json({ message: "Only hospital-verified claims can receive an insurance decision." });

    const tx = await chain.changeStatus(claim.blockchainClaimId, decision);
    claim.status = decision;
    claim.decisionReason = reason;
    claim.blockchainTxs.push({ action: decision, ...tx, at: new Date() });
    await claim.save();
    res.json({ claim });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ message: error.message || "Request failed." });
});

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error("Set MONGODB_URI and JWT_SECRET in backend/.env");
  await mongoose.connect(process.env.MONGODB_URI);
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`MediChain API running at http://localhost:${port}`));
}

start().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
