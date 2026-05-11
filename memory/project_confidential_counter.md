---
name: Confidential Counter project state
description: Deployed contract address, frontend location, and key technical details for the ConfidentialCounter app
type: project
---

ConfidentialCounter is deployed on Sepolia at **0x8C073467FB8eA3b16A98C417592AF451e70f0dc8** (deployed 2026-05-11).

Frontend lives in `frontend/` (React + Vite + TypeScript, as mandated by SKILL.md Step 7). Start it with `cd frontend && npm run dev`. Binds to port 5173+.

**Why:** Per-user private counters using FHEVM euint32. Each address has its own encrypted counter; only they can decrypt it via the ACL allow() grants.

**How to apply:** When making contract or frontend changes, the contract address constant is in `frontend/src/main.ts` (top-level `CONTRACT_ADDRESS`). Redeployment updates `deployments/sepolia/ConfidentialCounter.json` — update the frontend constant manually.

Key technical notes:
- `vite.config.ts` adds COOP/COEP headers (required for SharedArrayBuffer / multithreaded WASM)
- `optimizeDeps.exclude: ['@zama-fhe/relayer-sdk']` prevents Vite pre-bundling WASM
- User decrypt flow: generateKeypair → createEIP712 → signTypedData → userDecrypt
- `getCounter()` ABI return type is `bytes32` (euint32 wraps bytes32); compare zero handle to ethers.ZeroHash
