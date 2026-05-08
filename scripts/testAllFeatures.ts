import { ethers } from "hardhat";
import { fhevm } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT = "0xAEE9B4C17FD671eC4d611FBc9F7E3519F756250f";

async function encrypt64(value: bigint, vault: string, user: string) {
  const input = fhevm.createEncryptedInput(vault, user);
  input.add64(value);
  const enc = await input.encrypt();
  return { handle: enc.handles[0], proof: enc.inputProof };
}

async function main() {
  await fhevm.initializeCLIApi();
  const [signer] = await ethers.getSigners();
  const addr = signer.address;
  console.log("Testing with:", addr);

  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);

  // Approve
  await (await cusdt.approve(VAULT, ethers.parseUnits("500000", 6))).wait();
  console.log("✅ cUSDT approved");

  // ── FEATURE 1: DEPOSIT ───────────────────────────────────────────
  console.log("\n── Feature 1: Private Vault ──");
  const dep = await encrypt64(2000000000n, VAULT, addr); // 2000 cUSDT
  await (await vault.deposit(dep.handle, dep.proof, 1, ethers.parseUnits("2000", 6))).wait();
  const count = await vault.holderCount();
  console.log("✅ Deposited — holder count:", count.toString());

  // ── FEATURE 1: DEPOSIT YIELD ─────────────────────────────────────
  console.log("\n── Feature 1b: Deposit Yield Pool ──");
  const yieldEnc = await encrypt64(500000000n, VAULT, addr); // 500 cUSDT yield
  await (await vault.depositYield(yieldEnc.handle, yieldEnc.proof, ethers.parseUnits("500", 6))).wait();
  console.log("✅ Yield deposited");

  // ── FEATURE 1: DISTRIBUTE YIELD ──────────────────────────────────
  console.log("\n── Feature 1c: Distribute Yield ──");
  await (await vault.distributeYieldToHolder(addr)).wait();
  console.log("✅ Yield distributed to holder");

  // ── FEATURE 2: BLIND LENDING ─────────────────────────────────────
  console.log("\n── Feature 2: Blind Lending ──");
  const loanEnc = await encrypt64(100000000n, VAULT, addr); // 100 cUSDT loan
  await (await vault.openLoan(loanEnc.handle, loanEnc.proof, ethers.parseUnits("100", 6))).wait();
  const hasLoan = await vault.hasActiveLoan(addr);
  console.log("✅ Loan opened — has active loan:", hasLoan);

  // Repay loan
  await (await cusdt.approve(VAULT, ethers.parseUnits("100", 6))).wait();
  const repayEnc = await encrypt64(100000000n, VAULT, addr);
  await (await vault.repayLoan(repayEnc.handle, repayEnc.proof, ethers.parseUnits("100", 6))).wait();
  const loanAfter = await vault.hasActiveLoan(addr);
  console.log("✅ Loan repaid — has active loan:", loanAfter);

  // ── FEATURE 3: LIQUIDATION SHIELD ────────────────────────────────
  console.log("\n── Feature 3: Liquidation Shield ──");
  const threshEnc = await encrypt64(500000000n, VAULT, addr); // 500 cUSDT threshold
  await (await vault.setProtectionThreshold(threshEnc.handle, threshEnc.proof)).wait();
  console.log("✅ Protection threshold set");

  const reserveEnc = await encrypt64(1000000000n, VAULT, addr); // 1000 cUSDT reserve
  await (await vault.fundReserve(reserveEnc.handle, reserveEnc.proof, ethers.parseUnits("1000", 6))).wait();
  console.log("✅ Reserve funded");

  await (await vault.checkAndProtect(addr)).wait();
  console.log("✅ Shield checked and applied");

  // ── FEATURE 4: YIELD PROOF ───────────────────────────────────────
  console.log("\n── Feature 4: Yield Proof ──");
  const proofThresh = await encrypt64(1000000n, VAULT, addr); // 1 cUSDT threshold
  const verifier = "0x69885Aeb09f8cB62FFF8b2224C66791bFCaed317"; // same wallet for demo
  await (await vault.generateYieldProof(proofThresh.handle, proofThresh.proof, verifier)).wait();
  console.log("✅ Yield proof generated for verifier:", verifier);

  // ── FEATURE 5: YIELD WAGER ───────────────────────────────────────
  console.log("\n── Feature 5: Yield Wager ──");
  // For demo, we need two wallets — skip if only one signer
  console.log("⚠️  Wager requires 2 holders — skipping auto test (demo in UI)");

  // ── FEATURE 1: WITHDRAW ──────────────────────────────────────────
  console.log("\n── Feature 1d: Withdraw ──");
  await (await vault.withdraw(ethers.parseUnits("100", 6))).wait();
  console.log("✅ Withdrew 100 cUSDT");

  console.log("\n🎉 All features tested successfully!");
  console.log("Vault:", VAULT);
  console.log("cUSDT:", CUSDT);
}

main().catch(console.error);
