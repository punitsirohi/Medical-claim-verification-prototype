// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MediChainClaims
/// @notice Educational claim audit ledger. Personal/medical data must remain off-chain.
contract MediChainClaims {
    enum Status { Submitted, HospitalVerified, Approved, Rejected }

    struct Claim {
        bytes32 documentHash;
        uint256 amount;
        Status status;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    address public immutable operator;
    mapping(bytes32 => Claim) private claims;

    event ClaimSubmitted(bytes32 indexed claimId, bytes32 documentHash, uint256 amount, uint256 timestamp);
    event ClaimStatusChanged(bytes32 indexed claimId, Status status, uint256 timestamp);

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator");
        _;
    }

    constructor() {
        operator = msg.sender;
    }

    function submitClaim(bytes32 claimId, bytes32 documentHash, uint256 amount) external onlyOperator {
        require(!claims[claimId].exists, "Claim already exists");
        require(amount > 0, "Amount must be positive");
        require(documentHash != bytes32(0), "Document hash required");

        claims[claimId] = Claim({
            documentHash: documentHash,
            amount: amount,
            status: Status.Submitted,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        emit ClaimSubmitted(claimId, documentHash, amount, block.timestamp);
    }

    function updateStatus(bytes32 claimId, Status nextStatus) external onlyOperator {
        Claim storage claim = claims[claimId];
        require(claim.exists, "Claim not found");

        if (claim.status == Status.Submitted) {
            require(
                nextStatus == Status.HospitalVerified || nextStatus == Status.Rejected,
                "Invalid transition from Submitted"
            );
        } else if (claim.status == Status.HospitalVerified) {
            require(
                nextStatus == Status.Approved || nextStatus == Status.Rejected,
                "Invalid transition from HospitalVerified"
            );
        } else {
            revert("Claim already final");
        }

        claim.status = nextStatus;
        claim.updatedAt = block.timestamp;
        emit ClaimStatusChanged(claimId, nextStatus, block.timestamp);
    }

    function getClaim(bytes32 claimId) external view returns (
        bytes32 documentHash,
        uint256 amount,
        Status status,
        uint256 createdAt,
        uint256 updatedAt,
        bool exists
    ) {
        Claim memory claim = claims[claimId];
        return (
            claim.documentHash,
            claim.amount,
            claim.status,
            claim.createdAt,
            claim.updatedAt,
            claim.exists
        );
    }
}
