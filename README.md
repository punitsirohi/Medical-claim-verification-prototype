# MediChain — Blockchain-Based Medical Insurance Claim Verification

A beginner-friendly academic prototype demonstrating a medical insurance claim workflow with role-based access, MongoDB persistence, document hashing, and Solidity smart-contract audit records.

## What is included

- React + Vite frontend with Patient, Hospital, Insurance Admin, and System Admin views.
- Express REST API with JWT authentication and role-based authorization.
- MongoDB models for users, policies, and claims.
- Local document uploads; SHA-256 document hashes are recorded on-chain.
- Solidity contract with a claim state machine: Submitted → Hospital Verified → Approved / Rejected.
- Hardhat local blockchain and deployment script.
- Demo seed data and sample accounts.

> **Important:** This is an educational prototype, not a production insurance platform. Use synthetic data only. Do not upload real patient records. The backend uses a development operator wallet to write blockchain transactions. In this demo, application roles are enforced by the API; the contract records the resulting audit trail. Real deployment would require stronger identity, key management, privacy, security, legal, and compliance controls.

## Architecture

```text
React frontend
     |
     v
Express API ---- MongoDB (users, policies, claim metadata)
     |                 |
     |                 +---- Local uploads (documents)
     |
     +---- SHA-256 document hash
     |
     v
Hardhat local EVM ---- MediChainClaims.sol
     |
     +---- Claim state + immutable transaction events
```

Personal/medical details and files stay off-chain. Only a random claim ID, document hash, amount, status, and timestamps are written to the local blockchain.

## Requirements

- Node.js 20 LTS recommended
- npm
- Docker Desktop (recommended for MongoDB) OR a local MongoDB instance
- MetaMask is optional for this version; the backend development wallet submits local-chain transactions.

## 1. Start MongoDB

From the project root:

```bash
docker compose up -d
```

If you already have MongoDB, use its connection string in `backend/.env`.

## 2. Install dependencies

Open three terminals from the project root.

Terminal A:

```bash
cd blockchain
npm install
```

Terminal B:

```bash
cd backend
cp .env.example .env
npm install
```

Terminal C:

```bash
cd frontend
npm install
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## 3. Start the local blockchain

Terminal A:

```bash
cd blockchain
npx hardhat node
```

Keep this terminal running. Hardhat prints development accounts and private keys. These accounts are for local testing only.

## 4. Deploy the smart contract

Terminal B (or a fourth terminal):

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

Copy the printed contract address into `backend/.env` as `CONTRACT_ADDRESS`.

The default backend development private key in `.env.example` is the first Hardhat node account. It is intentionally a local-only test key. Never use it on a public network or with real funds.

## 5. Seed demo accounts and policy

```bash
cd backend
npm run seed
```

## 6. Start the backend

```bash
cd backend
npm run dev
```

API runs at `http://localhost:5000`. Health check: `http://localhost:5000/api/health`.

## 7. Start the frontend

```bash
cd frontend
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Demo logins

All demo passwords are `Demo@123`.

| Role | Email |
|---|---|
| Patient | `patient@medichain.demo` |
| Hospital | `hospital@medichain.demo` |
| Insurance Admin | `insurer@medichain.demo` |
| System Admin | `admin@medichain.demo` |

Demo policy number: `MC-HEALTH-1001`

## Suggested demo flow

1. Sign in as Patient and submit a claim with a small sample PDF/image.
2. Sign out and sign in as Hospital. Verify the submitted claim.
3. Sign out and sign in as Insurance Admin. Approve or reject the hospital-verified claim.
4. Sign back in as Patient and show the updated status and blockchain transaction hash.
5. Try submitting the same claim details again to demonstrate duplicate detection.

## API overview

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/claims`
- `POST /api/claims` (patient; multipart form with optional `document`)
- `PATCH /api/claims/:id/verify` (hospital)
- `PATCH /api/claims/:id/decision` (insurance admin; body: `{ "decision": "APPROVED" | "REJECTED", "reason": "..." }`)
- `GET /api/claims/:id`

## Limitations and future improvements

- Demo authentication uses seeded accounts; add production registration, password reset, MFA, and stronger identity checks.
- Local file storage is used for ease of setup. Replace it with private object storage and signed URLs before any real deployment.
- The backend operator key is a local development key. Use a secure signer/HSM or multisig design in a real system.
- The contract is deployed on a local Hardhat chain. Public testnet deployment is optional and should only use test data.
- Coverage checks are intentionally simple. Add policy dates, exclusions, deductibles, co-payments, and remaining coverage logic for a richer model.
- Add automated tests, audit logging, rate limits, malware scanning, encryption at rest, and privacy/compliance review before production.

## Troubleshooting

- **MongoDB connection error:** ensure Docker is running and `docker compose up -d` completed.
- **Blockchain not configured:** ensure Hardhat node is running, contract is deployed, and `CONTRACT_ADDRESS` is set in `backend/.env`.
- **Transaction fails:** redeploy the contract after restarting the Hardhat node; local chain state resets when the node stops.
- **Upload fails:** check that `backend/uploads` is writable and the file is under the configured 8 MB limit.
