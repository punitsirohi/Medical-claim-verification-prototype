const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["PATIENT", "HOSPITAL", "INSURER", "ADMIN"], required: true }
}, { timestamps: true });

const policySchema = new mongoose.Schema({
  policyNumber: { type: String, required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  providerName: { type: String, default: "MediCare Demo Insurance" },
  coverageLimit: { type: Number, required: true },
  active: { type: Boolean, default: true },
  validUntil: { type: Date, required: true }
}, { timestamps: true });

const claimSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  patientName: { type: String, required: true },
  policyNumber: { type: String, required: true },
  hospitalName: { type: String, required: true },
  treatmentDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  documentPath: String,
  documentHash: { type: String, required: true },
  fingerprint: { type: String, required: true, unique: true },
  status: { type: String, enum: ["SUBMITTED", "HOSPITAL_VERIFIED", "APPROVED", "REJECTED"], default: "SUBMITTED" },
  decisionReason: String,
  blockchainClaimId: String,
  blockchainTxs: [{ action: String, txHash: String, blockNumber: Number, at: Date }]
}, { timestamps: true });

module.exports = {
  User: mongoose.model("User", userSchema),
  Policy: mongoose.model("Policy", policySchema),
  Claim: mongoose.model("Claim", claimSchema)
};
