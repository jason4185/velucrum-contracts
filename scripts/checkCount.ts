import { ethers } from "hardhat";
const VAULT = "0xD5e879bFF37Bf93bCab4b9Ba56C7Ef3c2182407C";
async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const count = await vault.holderCount();
  const isHolder = await vault.isHolder(signer.address);
  console.log("Holder count:", count.toString());
  console.log("Is holder:", isHolder);
}
main().catch(console.error);
