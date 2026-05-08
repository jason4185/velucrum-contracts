import { ethers } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const YIELD_SOURCE = "0xaa49EAC1D45D1b9284CC0F72d61B228240926CF1";
const VAULT = "0xAEE9B4C17FD671eC4d611FBc9F7E3519F756250f";

async function main() {
  const [signer] = await ethers.getSigners();

  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  const yieldSource = await ethers.getContractAt("MockYieldSource", YIELD_SOURCE, signer);

  // Approve yield source to spend cUSDT
  await (await cusdt.approve(YIELD_SOURCE, ethers.parseUnits("100000", 6))).wait();
  console.log("✅ Approved yield source");

  // Seed with 10,000 cUSDT to pay yield
  await (await yieldSource.seedYield(ethers.parseUnits("10000", 6))).wait();
  console.log("✅ Seeded 10,000 cUSDT as yield reserve");

  // Approve vault to interact with yield source
  await (await cusdt.approve(VAULT, ethers.parseUnits("500000", 6))).wait();
  console.log("✅ Vault approved");

  console.log("\nSetup complete:");
  console.log("Vault:", VAULT);
  console.log("YieldSource:", YIELD_SOURCE);
  console.log("cUSDT:", CUSDT);
}

main().catch(console.error);
