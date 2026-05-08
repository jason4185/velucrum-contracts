import { ethers } from "hardhat";
import { fhevm } from "hardhat";

const CUSDT        = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT        = "0xf860bccCE9b5d1AdE853a1038D82E6671cedD9af";
const YIELD_SOURCE = "0xaa49EAC1D45D1b9284CC0F72d61B228240926CF1";

async function main() {
  await fhevm.initializeCLIApi();
  const [signer] = await ethers.getSigners();

  const cusdt  = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  const vault  = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const ys     = await ethers.getContractAt("MockYieldSource", YIELD_SOURCE, signer);

  // Approve vault
  await (await cusdt.approve(VAULT, ethers.parseUnits("10000", 6))).wait();
  console.log("✅ Approved vault");

  // Deposit 1000 cUSDT
  const input = fhevm.createEncryptedInput(VAULT, signer.address);
  input.add64(1000000000n);
  const enc = await input.encrypt();
  await (await vault.deposit(enc.handles[0], enc.inputProof, 1, ethers.parseUnits("1000", 6))).wait();
  console.log("✅ Deposited 1000 cUSDT");
  console.log("Holders:", (await vault.holderCount()).toString());

  // Supply to yield source
  await (await vault.supplyToYieldSource(ethers.parseUnits("1000", 6))).wait();
  console.log("✅ Supplied to yield source");

  // Check pending yield
  const pending = await vault.getPendingYield();
  console.log("Pending yield:", ethers.formatUnits(pending, 6), "cUSDT");

  // Harvest yield
  await (await vault.harvestYield(signer.address)).wait();
  console.log("✅ Yield harvested and distributed privately via FHE");

  console.log("\n🎉 Full flow working!");
}

main().catch(console.error);
