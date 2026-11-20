require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { User, Policy } = require("./models");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash("Demo@123", 10);
  const demoUsers = [
    { name: "Aarav Sharma", email: "patient@medichain.demo", role: "PATIENT" },
    { name: "CityCare Hospital", email: "hospital@medichain.demo", role: "HOSPITAL" },
    { name: "Priya Verma", email: "insurer@medichain.demo", role: "INSURER" },
    { name: "MediChain Administrator", email: "admin@medichain.demo", role: "ADMIN" }
  ];

  for (const item of demoUsers) {
    await User.findOneAndUpdate(
      { email: item.email },
      { ...item, passwordHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const patient = await User.findOne({ email: "patient@medichain.demo" });
  await Policy.findOneAndUpdate(
    { policyNumber: "MC-HEALTH-1001" },
    {
      policyNumber: "MC-HEALTH-1001",
      patient: patient._id,
      providerName: "MediCare Demo Insurance",
      coverageLimit: 200000,
      active: true,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    { upsert: true, new: true }
  );

  console.log("Demo data ready. Password for all accounts: Demo@123");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
