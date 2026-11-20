const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MediChainClaims", function () {
  it("records a claim and enforces valid status transitions", async function () {
    const Factory = await ethers.getContractFactory("MediChainClaims");
    const contract = await Factory.deploy();
    const claimId = ethers.id("demo-claim-1");
    const documentHash = ethers.id("demo-document");

    await contract.submitClaim(claimId, documentHash, 12500);
    let record = await contract.getClaim(claimId);
    expect(record.exists).to.equal(true);
    expect(record.status).to.equal(0);

    await contract.updateStatus(claimId, 1);
    await contract.updateStatus(claimId, 2);
    record = await contract.getClaim(claimId);
    expect(record.status).to.equal(2);

    await expect(contract.updateStatus(claimId, 3)).to.be.revertedWith("Claim already final");
  });
});
