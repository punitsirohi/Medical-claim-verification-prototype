const hre = require("hardhat");

async function main() {
  const Factory = await hre.ethers.getContractFactory("MediChainClaims");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log("MediChainClaims deployed to:", await contract.getAddress());
  console.log("Copy this address into backend/.env as CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
