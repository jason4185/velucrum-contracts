import { ethers } from "hardhat";

const VAULT = "0xf860bccCE9b5d1AdE853a1038D82E6671cedD9af";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  
  const isHolder = await vault.isHolder(signer.address);
  const count = await vault.holderCount();
  const pool = await vault.getPool(signer.address);
  const pending = await vault.getPendingYield();
  
  console.log("Is holder:", isHolder);
  console.log("Holder count:", count.toString());
  console.log("Pool:", pool.toString());
  console.log("Pending yield:", ethers.formatUnits(pending, 6), "cUSDT");
}

main().catch(console.error);
