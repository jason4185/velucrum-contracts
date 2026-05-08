# Velucrum

**Confidential Yield Vault — Deposit. Earn. Borrow. All encrypted.**

Velucrum is a DeFi vault where your financial position is private by default. Deposit stablecoins, earn yield, and borrow against your balance — without anyone on-chain knowing your numbers. Not the protocol. Not other users. Not even block explorers.

Privacy is enforced by Zama's Fully Homomorphic Encryption (FHE). Your balance exists on-chain as an encrypted ciphertext. The only way to read it is with your wallet's cryptographic signature.

---

## Live App

https://velucrum.vercel.app

---

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| VelucumVault | 0x0a3725651Be62CBeA893c5DFf45F3BFEe49c2e91 |
| MockYieldSource | 0x38f2bB97EE9e3fa2E279FF5FC7cD6Ec6a20BB306 |
| MockCUSDT | 0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0 |

---

## What Makes Velucrum Unique

Most DeFi protocols are fully transparent — your balance, your health factor, your yield, your loan amount are all visible to anyone on Etherscan. Velucrum is different.

Velucrum is the confidential version of a yield lending protocol. Think Compound Finance, but where your position is known only to you. The protocol does everything Compound does — deposit, earn yield, borrow against collateral — but it does all of it without ever seeing your actual numbers.

The collateral check for your loan happens entirely in encrypted space. The contract never decrypts your balance to verify you can borrow. It uses FHE arithmetic to check the condition privately and return a result. This is blind lending — and no other live DeFi protocol does this today.

---

## How It Works

### Feature 1 — Private Vault

You deposit cUSDT into the vault. Before the transaction is sent to the blockchain, your deposit amount is encrypted in the browser using Zama's FHE. The contract receives both an encrypted ciphertext and a plain amount. The plain amount is used for the ERC20 transfer. The encrypted amount becomes your vault balance stored as euint64 — unreadable by anyone on-chain.

Your earnings accumulate silently into your encrypted balance over time. When you want to see your balance, you sign a message with your wallet. That signature goes to the Zama Key Management System, which verifies you are the rightful owner and decrypts the value exclusively for you.

### Feature 2 — Blind Lending

You can borrow up to 70% of your vault balance without revealing what that balance is. The contract calculates your borrowing limit using FHE.mul and checks your loan request using FHE.le — entirely in encrypted space. Your balance is never decrypted during this process.

If your request is within the 70% limit, the loan is approved. If not, it is rejected. Either way, your balance stays hidden. Your loan amount is also stored encrypted — only you can reveal it by signing with your wallet.

Only you can check whether you have an active loan. The hasActiveLoan function uses msg.sender, meaning nobody else can query your loan status.

### Feature 3 — Confidential Auto-Compound

Every 100 blocks, your accrued yield can be compounded back into your vault balance. The compound amount is added to your encrypted balance using FHE.add. Nobody sees how much was added or what your new total is.

The yield source that generates returns only ever interacts with the vault contract address. It has no knowledge of individual users or their positions. This is the privacy proxy pattern — the vault acts as a shield between individual users and the yield source.

---

## How Deposit Privacy Works

When you deposit, two things happen simultaneously. Your deposit amount is encrypted in the browser before being sent to the contract, and the contract stores your balance as euint64. At the same time, a plain amount is sent for the ERC20 transfer.

This means your deposit amount is visible on Etherscan today because MockCUSDT is a standard ERC20 token. But once your funds are inside the vault, everything that happens to them — yield accrual, compounding, borrowing, repayment — is fully encrypted. Nobody can track your financial activity inside the protocol.

In production with Zama fhERC20, even the deposit amount disappears from Etherscan. The entire flow becomes private end to end.

---

## FHE Operations Used

Velucrum uses 10 distinct FHE operations across its three features.

| Operation | Purpose |
|-----------|---------|
| FHE.fromExternal | Encrypts user inputs on deposit, withdrawal, loan, and repayment |
| FHE.add | Adds yield to encrypted balance during harvest and auto-compound |
| FHE.sub | Subtracts from encrypted balance on withdrawal and loan repayment |
| FHE.mul | Calculates maximum borrowing limit from encrypted balance |
| FHE.le | Checks if loan amount is within the 70% collateral limit privately |
| FHE.lt | Checks if balance has fallen below loan amount for liquidation |
| FHE.select | Approves or rejects a loan without revealing the decision path |
| FHE.asEuint64 | Converts plain values to encrypted type for FHE operations |
| FHE.allowThis | Grants the contract permission to operate on an encrypted value |
| FHE.allow | Grants the user permission to decrypt their own values |

---

## Architecture

Velucrum uses a privacy proxy pattern. The yield source only ever sees the vault contract address — never individual users. All balance tracking, lending decisions, and yield distribution happen in encrypted state inside the vault.

    User Wallet
         |
         v
    VelucumVault
    (all balances, loans, and yield stored as encrypted euint64)
         |
         v
    YieldSource
    (only knows the vault address, never sees individual users)

---

## What Is Private

- Your vault balance
- Your yield earned
- Your loan amount
- Your loan status (only you can query it)
- Collateral check during lending
- Liquidation check

## What Is Public Today (Testnet Limitation)

- Deposit amount (ERC20 transfer visible on Etherscan)
- Withdrawal amount (same)
- Loan transfer amount (same)
- Total vault size (TVL)
- Number of depositors

---

## Known Limitations

**Deposit amounts visible on Etherscan.** MockCUSDT is a standard ERC20 token. Transfer amounts appear publicly. This is a testnet constraint only.

**Yield dilution on new deposits.** The current yield model is proportional. When a new user deposits, pending yield is shared across a larger pool. Production uses index-based yield checkpointing similar to Compound Finance.

**Single active loan per user.** Each wallet can only hold one active loan at a time. Must repay before opening a new loan.

---

## Production Plan

In production, Velucrum migrates to Zama's fhERC20 confidential token standard. Users wrap their USDT into fhERC20 cUSDT through Zama's confidential token wrapper — the same pattern used by Zama's own protocol. Every transfer becomes fully encrypted. Nothing appears on Etherscan.

The yield source would also be upgraded to a Zama-compatible confidential lending protocol such as a confidential Aave adapter. Interest accrual and liquidity operations would be encrypted end to end.

The core FHE logic of Velucrum — all 10 operations — requires no changes for this migration. Only the token interface layer is updated.

---

## Security

This codebase has not been formally audited. It is deployed on Sepolia testnet for demonstration purposes only. Do not use with real funds.

Key security properties:
- Collateral check enforced both in FHE and with a plain require statement
- Repay amount must exactly match the original loan amount
- Loan status is private — only the borrower can query it
- Emergency withdrawal function restricted to owner

---

## Setup

    git clone <repo-url>
    cd fhevm-hardhat-template
    npm install
    npx hardhat vars set INFURA_API_KEY <your-key>
    npx hardhat vars set PRIVATE_KEY <your-key>

## Deploy

    npx hardhat run scripts/deployFinal.ts --network sepolia

---

## Deployer

0x69885Aeb09f8cB62FFF8b2224C66791bFCaed317
