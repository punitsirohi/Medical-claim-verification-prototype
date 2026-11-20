const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ABI = [
  "function submitClaim(bytes32 claimId, bytes32 documentHash, uint256 amount) external",
  "function updateStatus(bytes32 claimId, uint8 nextStatus) external",
  "function getClaim(bytes32 claimId) external view returns (bytes32,uint256,uint8,uint256,uint256,bool)"
];

function getContract() {
  const { RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;
  if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    throw new Error("Blockchain is not configured. Start Hardhat, deploy the contract, and set CONTRACT_ADDRESS in backend/.env.");
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
}

async function sendClaim(claimIdText, documentHashHex, amount) {
  const contract = getContract();
  const claimId = ethers.id(claimIdText);
  const tx = await contract.submitClaim(claimId, documentHashHex, BigInt(Math.round(amount * 100)));
  const receipt = await tx.wait();
  return { claimId, txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

async function changeStatus(claimId, status) {
  const contract = getContract();
  const statusNumber = { SUBMITTED: 0, HOSPITAL_VERIFIED: 1, APPROVED: 2, REJECTED: 3 }[status];
  const tx = await contract.updateStatus(claimId, statusNumber);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

async function readClaim(claimId) {
  const contract = getContract();
  const record = await contract.getClaim(claimId);
  const names = ["SUBMITTED", "HOSPITAL_VERIFIED", "APPROVED", "REJECTED"];
  return {
    documentHash: record[0],
    amountPaise: record[1].toString(),
    status: names[Number(record[2])],
    exists: record[5]
  };
}

module.exports = { sendClaim, changeStatus, readClaim };
