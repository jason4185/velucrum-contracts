import { ethers } from "hardhat";

const VAULT = "0xf5C2bFcD15c6475297Cb45819fCde43274138015";
const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";

async function main() {
  const [signer] = await ethers.getSigners();
  
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);

  // Approve first
  await (await cusdt.approve(VAULT, ethers.parseUnits("10000", 6))).wait();
  console.log("✅ Approved");

  // Try calling isHolder
  const isHolder = await vault.isHolder(signer.address);
  console.log("Is holder:", isHolder);

  // Try calling holderCount
  const count = await vault.holderCount();
  console.log("Holder count:", count.toString());

  // Check vault cUSDT address
  const vaultCusdt = await vault.cUSDT();
  console.log("Vault cUSDT:", vaultCusdt);
  console.log("Expected:  ", CUSDT);
  console.log("Match:", vaultCusdt.toLowerCase() === CUSDT.toLowerCase());
}

main().catch(console.error);
