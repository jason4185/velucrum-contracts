---
name: fhevm-confidential-contracts
description: >
  Build, test, and deploy confidential smart contracts using Zama FHEVM.
  Use this skill when asked to build anything with encrypted state on-chain:
  confidential tokens, private voting, blind auctions, confidential vaults,
  ERC-7984 tokens, or any contract using euint, ebool, or eaddress types.
  Triggers: "confidential contract", "FHEVM", "encrypted on-chain", "Zama Protocol",
  "euint", "FHE", "private smart contract", "ERC-7984", "fhERC20".
version: "1.0.0"
author: "Jason — production-tested May 2026"
tested_with:
  - "Claude Code v2.1"
  - "Cursor"
  - "Windsurf"
validated: true
---

# FHEVM Confidential Contracts Skill

> Every pattern in this skill was deployed and tested on Ethereum Sepolia in May 2026.
> Every anti-pattern caused a real failure in production. Follow these patterns exactly.

---

## What This Skill Covers

This skill teaches you to build confidential smart contracts using Zama FHEVM — a coprocessor that allows Solidity contracts to compute on encrypted values without ever decrypting them.

When a developer asks you to build:

- A confidential token where balances are private
- A blind auction where bids are hidden
- A private voting contract
- A confidential vault with encrypted balances
- An ERC-7984 confidential token
- Any contract with hidden on-chain state

...use this skill to produce correct, working code on the first try.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  Zama Relayer SDK encrypts value → externalEuint64       │
│  Generates inputProof for the target contract            │
└────────────────────────┬────────────────────────────────┘
                         │ encrypted calldata
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Your Solidity Contract (EVM)                │
│  FHE.fromExternal(encryptedAmount, inputProof)           │
│  Stores euint64 — unreadable on Etherscan                │
│  Computes: add, sub, mul, lt, le, select                 │
│  ACL: FHE.allowThis + FHE.allow(value, user)            │
└────────────────────────┬────────────────────────────────┘
                         │ encrypted handle
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Zama FHE Coprocessor (off-chain)            │
│  Executes FHE operations on ciphertexts                  │
│  Enforces ACL — only authorized wallets can decrypt      │
│  KMS: decrypts for authorized wallet on userDecrypt()    │
└─────────────────────────────────────────────────────────┘
```

**Key insight:** Values stored as `euint64` are unreadable to everyone — block explorers, other contracts, node operators. Only a wallet with explicit ACL permission can decrypt them via the Zama KMS.

---

## Live Addresses — Ethereum Sepolia Testnet

| Contract             | Address                                      |
| -------------------- | -------------------------------------------- |
| FHE Coprocessor      | `0xc9990FEfE0c27D31D0C2aa36196b085c0c4d456c` |
| ACL Contract         | `0xFee8407e2f5e3Ee68ad77cAE98c434e637f516EC` |
| KMS Verifier         | `0x9D6AdBE8395Cd8714e46CE0C635C65B4FF35C14f` |
| Input Verifier       | `0x3a2DA6f1daE9eF988B48d9CF27523FA31a8eBE50` |
| cUSDT Mock (fhERC20) | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |
| Underlying USDT      | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |

---

## Step 1 — Project Setup

```bash
# Clone the official Hardhat template
git clone https://github.com/zama-ai/fhevm-hardhat-template
cd fhevm-hardhat-template
npm install

# Set credentials
npx hardhat vars set INFURA_API_KEY <your-key>
npx hardhat vars set PRIVATE_KEY <your-key>

# Optional: OpenZeppelin confidential contracts for ERC-7984
npm install @openzeppelin/confidential-contracts
```

---

## Step 2 — Solidity Contract Patterns

### Required Imports and Inheritance

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { FHE, euint8, euint16, euint32, euint64, ebool, eaddress, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ✅ CORRECT — inherit ZamaEthereumConfig
contract MyContract is ZamaEthereumConfig, Ownable {
    constructor() Ownable(msg.sender) {}
}

// ❌ WRONG — ZamaSepoliaConfig is deprecated
// contract MyContract is ZamaSepoliaConfig {}
```

### Encrypted Types Reference

| Type              | Size    | Use for                                                     |
| ----------------- | ------- | ----------------------------------------------------------- |
| `euint8`          | 8-bit   | Small counters, pool IDs, status flags                      |
| `euint16`         | 16-bit  | Scores, ratings, medium counters                            |
| `euint32`         | 32-bit  | Medium balances, timestamps                                 |
| `euint64`         | 64-bit  | Token balances (6 decimal USDT = up to 18 trillion)         |
| `ebool`           | 1-bit   | Comparison results, approval flags, loan status             |
| `eaddress`        | 160-bit | Encrypted addresses, private recipient routing              |
| `externalEuint64` | —       | Encrypted input FROM user wallet (paired with `inputProof`) |

### FHE Operations — All Verified on Sepolia

```solidity
// ── Arithmetic ────────────────────────────────────────────────
euint64 sum  = FHE.add(a, b);
euint64 diff = FHE.sub(a, b);
euint64 prod = FHE.mul(a, FHE.asEuint64(70));   // multiply by scalar

// ── Comparisons (return ebool) ─────────────────────────────────
ebool lt  = FHE.lt(a, b);                         // a < b
ebool lte = FHE.le(a, b);                         // a <= b
ebool gt  = FHE.gt(a, b);                         // a > b
ebool gte = FHE.ge(a, b);                         // a >= b
ebool eq  = FHE.eq(a, b);                         // a == b
ebool neq = FHE.ne(a, b);                         // a != b

// ── Conditional selection ───────────────────────────────────────
// Returns valueIfTrue when condition is true, valueIfFalse otherwise
// This is the FHE equivalent of the ternary operator
euint64 result = FHE.select(condition, valueIfTrue, valueIfFalse);

// ── Type conversion ─────────────────────────────────────────────
euint64 enc  = FHE.asEuint64(100);              // plain → encrypted
ebool   flag = FHE.asEbool(true);               // plain bool → encrypted

// ── Accepting user input ─────────────────────────────────────────
euint64 val = FHE.fromExternal(externalInput, inputProof);

// ── ACL (Access Control List) ────────────────────────────────────
FHE.allowThis(val);              // let THIS contract use val in future txs
FHE.allow(val, userAddress);    // let userAddress decrypt val off-chain
FHE.allowTransient(val, addr);  // temporary access for current tx only (gas-efficient)
```

### The ACL Rule — Most Critical Pattern

After EVERY FHE operation that produces a new value, grant permissions immediately. Missing this makes the value permanently inaccessible.

```solidity
// ❌ WRONG — value becomes inaccessible after this transaction
balances[msg.sender] = FHE.add(balances[msg.sender], amount);

// ✅ CORRECT — grant ACL immediately after every FHE write
balances[msg.sender] = FHE.add(balances[msg.sender], amount);
FHE.allowThis(balances[msg.sender]);          // contract can reuse it
FHE.allow(balances[msg.sender], msg.sender);  // user can decrypt it
```

### Accepting Encrypted Inputs from Users

```solidity
function deposit(
    externalEuint64 encryptedAmount,   // encrypted by user in browser
    bytes calldata  inputProof,         // cryptographic proof of validity
    uint256         plainAmount         // for ERC20 transfers (visible on-chain)
) external {
    // Convert external input to internal encrypted type
    euint64 enc = FHE.fromExternal(encryptedAmount, inputProof);

    if (!holders[msg.sender].exists) {
        holders[msg.sender].balance = enc;
        holders[msg.sender].exists  = true;
    } else {
        holders[msg.sender].balance = FHE.add(holders[msg.sender].balance, enc);
    }

    // ALWAYS grant ACL after storing encrypted values
    FHE.allowThis(holders[msg.sender].balance);
    FHE.allow(holders[msg.sender].balance, msg.sender);
}
```

### Encrypted Getters — Use msg.sender

```solidity
// ✅ CORRECT — only caller can retrieve their own handle
function getMyBalance() external view returns (euint64) {
    return holders[msg.sender].balance;
}

// ❌ WRONG — anyone can get anyone's encrypted handle
// function getBalance(address user) external view returns (euint64) {}
```

### Privacy-Preserving Conditional Logic

Never use `if` statements on encrypted conditions. Use `FHE.select` instead.

```solidity
// ❌ WRONG — cannot branch on encrypted values
if (encryptedBalance > 1000) { ... }

// ✅ CORRECT — FHE.select evaluates both paths, returns one
ebool  isEnough = FHE.le(loanRequest, maxAllowed);
euint64 approved = FHE.select(isEnough, loanRequest, FHE.asEuint64(0));
```

---

## Step 3 — Complete Working Contract (Confidential Vault)

Production-tested on Sepolia. Copy and adapt freely.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { FHE, euint64, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConfidentialVault is ZamaEthereumConfig, Ownable {

    IERC20 public immutable token;
    uint256 public collateralRatio = 70;

    struct Holder {
        euint64 balance;    // encrypted — invisible on Etherscan
        euint64 yield;      // encrypted — invisible on Etherscan
        bool    exists;     // plain — visible on Etherscan
    }

    struct Loan {
        euint64 amount;     // encrypted — only borrower can reveal
        bool    active;     // plain — visible on Etherscan
        uint256 plainAmt;   // plain — for accounting
    }

    mapping(address => Holder)  private holders;
    mapping(address => Loan)    private loans;
    mapping(address => uint256) public  userDeposited;
    uint256 public holderCount;

    event Deposited(address indexed holder);
    event Withdrawn(address indexed holder);
    event LoanOpened(address indexed borrower);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function deposit(
        externalEuint64 encryptedAmount,
        bytes calldata  inputProof,
        uint256         plainAmount
    ) external {
        require(plainAmount > 0, "Amount must be > 0");
        token.transferFrom(msg.sender, address(this), plainAmount);

        euint64 enc = FHE.fromExternal(encryptedAmount, inputProof);

        if (!holders[msg.sender].exists) {
            holders[msg.sender].balance = enc;
            holders[msg.sender].yield   = FHE.asEuint64(0);
            holders[msg.sender].exists  = true;
            holderCount++;
        } else {
            holders[msg.sender].balance = FHE.add(holders[msg.sender].balance, enc);
        }

        // Always grant ACL after every FHE write
        FHE.allowThis(holders[msg.sender].balance);
        FHE.allow(holders[msg.sender].balance, msg.sender);
        FHE.allowThis(holders[msg.sender].yield);
        FHE.allow(holders[msg.sender].yield, msg.sender);

        userDeposited[msg.sender] += plainAmount;
        emit Deposited(msg.sender);
    }

    function withdraw(
        externalEuint64 encryptedAmount,
        bytes calldata  inputProof,
        uint256         plainAmount
    ) external {
        require(holders[msg.sender].exists, "Not a holder");
        require(!loans[msg.sender].active,  "Repay loan first");
        require(userDeposited[msg.sender] >= plainAmount, "Exceeds deposit");

        euint64 enc = FHE.fromExternal(encryptedAmount, inputProof);
        holders[msg.sender].balance = FHE.sub(holders[msg.sender].balance, enc);

        FHE.allowThis(holders[msg.sender].balance);
        FHE.allow(holders[msg.sender].balance, msg.sender);

        userDeposited[msg.sender] -= plainAmount;
        token.transfer(msg.sender, plainAmount);
        emit Withdrawn(msg.sender);
    }

    // Blind lending — collateral check fully in FHE, balance never revealed
    function openLoan(
        externalEuint64 encryptedLoanAmt,
        bytes calldata  inputProof,
        uint256         plainLoanAmt
    ) external {
        require(holders[msg.sender].exists, "Not a holder");
        require(!loans[msg.sender].active,  "Loan already open");
        require(
            plainLoanAmt <= userDeposited[msg.sender] * collateralRatio / 100,
            "Exceeds collateral limit"
        );

        euint64 loanEnc   = FHE.fromExternal(encryptedLoanAmt, inputProof);
        euint64 maxBorrow = FHE.mul(holders[msg.sender].balance, FHE.asEuint64(uint64(collateralRatio)));
        ebool   canBorrow = FHE.le(loanEnc, maxBorrow);
        euint64 effective = FHE.select(canBorrow, loanEnc, FHE.asEuint64(0));

        loans[msg.sender] = Loan({ amount: effective, active: true, plainAmt: plainLoanAmt });
        FHE.allowThis(loans[msg.sender].amount);
        FHE.allow(loans[msg.sender].amount, msg.sender);

        emit LoanOpened(msg.sender);
    }

    // Only msg.sender can query their own encrypted values
    function getMyBalance()  external view returns (euint64) { return holders[msg.sender].balance; }
    function getMyYield()    external view returns (euint64) { return holders[msg.sender].yield; }
    function getMyLoan()     external view returns (euint64) { return loans[msg.sender].amount; }
    function hasActiveLoan() external view returns (bool)    { return loans[msg.sender].active; }
    function isHolder(address a) external view returns (bool){ return holders[a].exists; }
}
```

---

## Step 4 — Hardhat Configuration

```typescript
// hardhat.config.ts
import "@nomicfoundation/hardhat-toolbox";
import "@fhevm/hardhat-plugin";
import { vars } from "hardhat/config";

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun", // ✅ REQUIRED — FHEVM uses EIP-1153 transient storage
    },
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${vars.get("INFURA_API_KEY")}`,
      accounts: [`0x${vars.get("PRIVATE_KEY")}`],
      chainId: 11155111,
    },
  },
};
```

---

## Step 5 — Deploy Script

```typescript
// deploy/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Vault = await ethers.getContractFactory("ConfidentialVault");
  const vault = await Vault.deploy("0xMOCK_TOKEN_ADDRESS");
  await vault.waitForDeployment();
  console.log("Vault deployed:", await vault.getAddress());
}

main().catch(console.error);
```

```bash
npx hardhat run deploy/deploy.ts --network sepolia
```

---

## Step 6 — Testing

```typescript
// test/ConfidentialVault.ts
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

describe("ConfidentialVault", () => {
  it("encrypts deposit and decrypts balance correctly", async () => {
    const [, alice] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();
    const Vault = await ethers.getContractFactory("ConfidentialVault");
    const vault = await Vault.deploy(await token.getAddress());

    const vaultAddr = await vault.getAddress();
    const amount = 500n * 10n ** 6n;

    await token.mint(alice.address, amount);
    await token.connect(alice).approve(vaultAddr, amount);

    // Encrypt the deposit amount targeting this specific vault
    const enc = await fhevm
      .createEncryptedInput(vaultAddr, alice.address)
      .add64(amount)
      .encrypt();

    await vault.connect(alice).deposit(enc.handles[0], enc.inputProof, amount);

    expect(await vault.isHolder(alice.address)).to.equal(true);

    // Decrypt and verify — only Alice can do this
    const handle = await vault.connect(alice).getMyBalance();
    const clear = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      handle,
      vaultAddr,
      alice,
    );
    expect(clear).to.equal(amount);
  });
});
```

---

## Step 7 — Frontend Integration

### MANDATORY: Use Exactly This Setup

**You MUST use React + Vite + TypeScript. No exceptions.**

The Zama SDK uses WebAssembly workers. These workers ONLY work when bundled by Vite from the same origin. Any other approach will fail with one of these errors:

- `Failed to construct 'Worker'`
- `WebAssembly.instantiate(): expected magic word`
- `net::ERR_CONNECTION_REFUSED` on WASM files

**Run these exact commands — do not deviate:**

```bash
# Step 1: Create Vite React TypeScript app
npm create vite@latest frontend-react -- --template react-ts
cd frontend-react

# Step 2: Install dependencies
npm install @zama-fhe/relayer-sdk ethers

# Step 3: Start dev server
npm run dev
# Opens at http://localhost:5173
```

**NEVER build:**

- A plain HTML file — even with a local server, WASM workers will fail
- CDN imports from `esm.sh`, `unpkg`, or `jsdelivr`
- A Python `http.server` — use `npm run dev` only
- A Create React App — use Vite only

**Why Vite works:** Vite bundles the SDK's WASM and worker helper files into `dist/assets/` so they load from the same origin as the app. This is the only setup that works in the browser.

### SDK Initialization

```typescript
// fhevm.ts

// ✅ CORRECT — use window.ethereum (EIP-1193 provider object)
// ❌ WRONG  — do NOT pass a string RPC URL
// ❌ WRONG  — do NOT cache the instance (causes stale provider errors)
export const getFhevmInstance = async () => {
  const ethereum = (window as any).ethereum;
  if (!ethereum)
    throw new Error("No wallet detected. Please install MetaMask.");

  const { createInstance, SepoliaConfig, initSDK } =
    await import("@zama-fhe/relayer-sdk/web");
  await initSDK();
  return createInstance({ ...SepoliaConfig, network: ethereum } as any);
};

// Browser-safe hex conversion — NEVER use Buffer.from() in the browser
export const toHex = (v: any): string => {
  if (typeof v === "string") return v.startsWith("0x") ? v : "0x" + v;
  if (typeof v === "bigint") return "0x" + v.toString(16).padStart(64, "0");
  return (
    "0x" +
    Array.from(v as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("")
  );
};

// Serialize EIP-712 data — JSON.stringify fails on BigInt fields
export const stringifyEIP712 = (eip712: any): string => {
  return JSON.stringify(eip712, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
};
```

### Encrypt a Value Before Sending to Contract

```typescript
export const encryptUint64 = async (
  value: number,
  contractAddress: string, // ✅ MUST match the contract you will call
  userAddress: string,
) => {
  const instance = await getFhevmInstance();
  // createEncryptedInput binds the proof to this specific contract + user pair
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add64(value);
  const encrypted = await input.encrypt();

  return {
    handle: toHex(encrypted.handles[0]),
    proof: toHex(encrypted.inputProof),
  };
};
```

### User Decryption Flow (EIP-712 Signing)

This is how users reveal their encrypted values. Only the wallet that owns the ACL permission can decrypt.

```typescript
export const revealEncryptedValue = async (
  signer: ethers.Signer,
  contractAddress: string,
  userAddress: string,
  getHandleFn: () => Promise<bigint>, // e.g. () => contract.getMyBalance()
): Promise<number> => {
  const instance = await getFhevmInstance();
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;

  // Step 1 — Build EIP-712 signing request
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    [contractAddress],
    userAddress,
    startTimestamp,
    durationDays,
  );

  // Step 2 — User signs with MetaMask
  // NOTE: use stringifyEIP712, not JSON.stringify — BigInt fields will crash
  const sig = await (signer as any).provider.send("eth_signTypedData_v4", [
    userAddress,
    stringifyEIP712(eip712),
  ]);

  // Step 3 — Get encrypted handle from contract
  const rawHandle = await getHandleFn();
  // NOTE: use ethers.getAddress() for EIP-55 checksum — lowercase causes "Bad address checksum"
  const checkedContract = ethers.getAddress(contractAddress);
  const handleHex = toHex(rawHandle);

  // Step 4 — Decrypt via Zama KMS (only this wallet can trigger this)
  const result = await instance.userDecrypt(
    [{ handle: handleHex, contractAddress: checkedContract }],
    keypair.privateKey,
    keypair.publicKey,
    sig,
    [checkedContract],
    userAddress,
    startTimestamp,
    durationDays,
  );

  const keys = Object.keys(result);
  return Number(result[keys[0]]);
};
```

### Public Decryption Pattern

For values that should be readable by anyone (e.g., auction results after reveal phase):

```solidity
// Solidity — mark value as publicly decryptable
function revealResult() external onlyOwner {
    FHE.makePubliclyDecryptable(encryptedResult);
}
```

```typescript
// Frontend — anyone can decrypt a publicly revealed value
const publicDecrypt = async (handle: bigint, contractAddress: string) => {
  const instance = await getFhevmInstance();
  const result = await instance.publicDecrypt([
    {
      handle: toHex(handle),
      contractAddress: ethers.getAddress(contractAddress),
    },
  ]);
  return Number(Object.values(result)[0]);
};
```

### ABI for Encrypted Functions

```typescript
// ✅ Use uint256 for euint64 returns — ethers.js cannot parse euint64
const VAULT_ABI = [
  // Encrypted inputs use bytes32 (handle) + bytes (proof)
  "function deposit(bytes32 encryptedAmount, bytes calldata inputProof, uint256 plainAmount) external",
  "function withdraw(bytes32 encryptedAmount, bytes calldata inputProof, uint256 plainAmount) external",
  "function openLoan(bytes32 encryptedAmt, bytes calldata inputProof, uint256 plainAmt) external",

  // Encrypted returns come back as uint256 BigInt in ethers.js
  "function getMyBalance() external view returns (uint256)",
  "function getMyYield()   external view returns (uint256)",
  "function getMyLoan()    external view returns (uint256)",

  // Plain reads
  "function isHolder(address a)    external view returns (bool)",
  "function hasActiveLoan()        external view returns (bool)",
  "function userDeposited(address) external view returns (uint256)",
  "function holderCount()          external view returns (uint256)",
];
```

---

## Step 8 — OpenZeppelin Confidential Contracts (ERC-7984)

ERC-7984 is the confidential token standard. Balances and transfers are fully encrypted — invisible on Etherscan.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { FHE, euint64, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";

// Vault that receives confidential transfers via confidentialTransferAndCall
contract ConfidentialReceiver is ZamaEthereumConfig {

    address public immutable cUSDT;

    // ✅ CRITICAL: wrapper calls supportsInterface before transferring
    // Must return true for 0x88a7ca5c (IERC1363Receiver ID)
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x88a7ca5c   // IERC1363Receiver — wrapper checks this
            || interfaceId == 0x01ffc9a7;  // IERC165
    }

    // Called by cUSDT wrapper after confidentialTransferAndCall
    // Note: encryptedAmount is passed as euint64 (already decrypted by coprocessor)
    function onTransferReceived(
        address operator,
        address from,
        euint64 encryptedAmount,
        bytes calldata data
    ) external returns (ebool) {
        require(msg.sender == cUSDT, "Only cUSDT");

        // ✅ CRITICAL: grant vault ACL access BEFORE using the encrypted amount
        FHE.allowThis(encryptedAmount);

        // Decode callback data and process deposit
        (uint8 pool, uint256 plainAmount) = abi.decode(data, (uint8, uint256));
        // ... store balance

        return FHE.asEbool(true);
    }

    constructor(address _cUSDT) {
        cUSDT = _cUSDT;
    }
}
```

### Getting Zama fhERC20 Test Tokens (Sepolia)

```typescript
// Step 1: Mint underlying USDT (public faucet, up to 1M tokens)
const underlying = new ethers.Contract(
  "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
  [
    "function mint(address to, uint256 amount) external",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ],
  signer,
);
await underlying.mint(userAddress, 10000n * 1_000_000n);

// Step 2: Approve and wrap to confidential cUSDT
await underlying.approve("0x4E7B06D78965594eB5EF5414c357ca21E1554491", amount);
const wrapper = new ethers.Contract(
  "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
  ["function wrap(address to, uint256 amount) external"],
  signer,
);
await wrapper.wrap(userAddress, amount);
// Now userAddress holds confidential cUSDT — transfers invisible on Etherscan
```

---

## Step 9 — Common Errors and Exact Fixes

| Error                                     | Root Cause                                                                                    | Fix                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `invalid EIP-1193 provider`               | String RPC URL used instead of `window.ethereum`, or stale cached instance                    | Use `network: window.ethereum`. Never cache the SDK instance.                                            |
| `execution reverted` (no data)            | Missing `ZamaEthereumConfig` inheritance OR wrong `contractAddress` in `createEncryptedInput` | Check inheritance. The `contractAddress` in `createEncryptedInput` must match the contract being called. |
| `CALL_EXCEPTION` on view functions        | ABI uses `euint64` — ethers.js cannot parse it                                                | Use `uint256` in the ABI string for all `euint64` return types.                                          |
| Encrypted value returns `0n` forever      | Missing `FHE.allow(value, msg.sender)`                                                        | Call `FHE.allowThis` and `FHE.allow` after every FHE write.                                              |
| `Buffer is not defined`                   | Node.js `Buffer` unavailable in browsers                                                      | Use the `toHex` function above — never `Buffer.from()`.                                                  |
| `missing revert data` on mapping          | Calling a `private` mapping directly                                                          | Expose via getter using `msg.sender`, never an address parameter.                                        |
| `compilation failed — evmVersion`         | Missing `evmVersion: "cancun"`                                                                | Add to hardhat.config.ts settings block.                                                                 |
| `no matching fragment`                    | ABI function signature mismatch                                                               | Check exact parameter types. `faucet()` and `faucet(uint256)` are different functions.                   |
| `Do not know how to serialize a BigInt`   | `JSON.stringify(eip712)` on object with BigInt fields                                         | Use `stringifyEIP712()` helper from this skill — converts BigInt to string.                              |
| `Bad address checksum`                    | Address not EIP-55 checksummed before passing to SDK                                          | Use `ethers.getAddress(address)` to normalize. Never lowercase.                                          |
| Worker failed to load (SharedArrayBuffer) | Plain HTML CDN import — SDK workers can't resolve across origins                              | Use Vite or webpack to bundle the app — workers resolve from same origin.                                |
| `ERC7984InvalidReceiver`                  | Vault's `supportsInterface(0x88a7ca5c)` returns false                                         | Add `supportsInterface` returning true for `0x88a7ca5c` and `0x01ffc9a7`.                                |
| `ERC7984ZeroBalance`                      | Trying to transfer cUSDT but wallet has no wrapped balance                                    | User must call `wrap()` before attempting confidential transfers.                                        |

---

## Step 10 — Privacy Boundaries

### What Is Private (encrypted on-chain)

- All values stored as `euint64`, `euint32`, `ebool`, `eaddress`
- Results of FHE arithmetic and comparisons
- Collateral check outcomes during lending
- Liquidation check outcomes

### What Is Visible on Etherscan (plain)

- That a transaction happened (tx hash, block, gas)
- Which function was called (method name)
- Deposit/withdrawal amounts if using standard ERC20
- `bool` fields in structs (e.g. `loans[address].active`)
- Public state variables (`holderCount`, `totalDeposited`)

### Making Everything Private

Use Zama fhERC20 (cUSDT) instead of standard ERC20 so even deposit amounts are hidden.

---

## Step 11 — Deployment Checklist

```
Before deploying, verify all of the following:

✅ Contract inherits ZamaEthereumConfig (NOT ZamaSepoliaConfig)
✅ evmVersion: "cancun" in hardhat.config.ts
✅ FHE.allowThis() called after every FHE write
✅ FHE.allow() called after every FHE write
✅ Encrypted getters use msg.sender — never address parameters
✅ createEncryptedInput contractAddress matches the contract being called
✅ No if/else branching on encrypted values — use FHE.select
✅ Private mappings exposed only through msg.sender getter functions
✅ Frontend uses React + Vite (npm create vite@latest -- --template react-ts)
✅ Frontend NEVER uses plain HTML with CDN imports — WASM workers will fail
✅ Frontend uses network: window.ethereum — not a string RPC URL
✅ Frontend uses toHex() — not Buffer.from()
✅ Frontend uses uint256 in ABI — not euint64
✅ Frontend uses stringifyEIP712() — not JSON.stringify — JSON.stringify crashes on BigInt
✅ Frontend uses ethers.getAddress(contractAddress) — not raw string — fixes "Bad address checksum"
✅ Frontend uses ethers.getAddress(userAddress) — same requirement for user addresses
```

---

## Reference Implementation

Velucrum is a production confidential yield vault with private balances, blind lending, and encrypted auto-compound. All code tested and deployed on Sepolia.

| Resource        | Link                                            |
| --------------- | ----------------------------------------------- |
| Smart Contracts | https://github.com/jason4185/velucrum-contracts |
| Frontend        | https://github.com/jason4185/velucrum           |
| Live Demo       | https://velucrum.vercel.app                     |
| Vault (Sepolia) | `0x0a3725651Be62CBeA893c5DFf45F3BFEe49c2e91`    |

---

## Live Documentation Query

When you need more information beyond this skill:

```
GET https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial.md?ask=YOUR_QUESTION
GET https://docs.zama.org/protocol/examples.md?ask=YOUR_QUESTION
GET https://docs.zama.org/protocol/relayer-sdk-guides.md?ask=YOUR_QUESTION
```
