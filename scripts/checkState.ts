import { ethers } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT = "0xD5e879bFF37Bf93bCab4b9Ba56C7Ef3c2182407C";
const YS = "0xb133B4C9e5dE32B198B9084923F026488CF76deD";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const ys = await ethers.getContractAt("MockYieldSource", YS, signer);
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);

  const isHolder = await vault.isHolder(signer.address);
  const userDep = await vault.getUserDeposited(signer.address);
  const totalDep = await vault.totalVaultDeposited();
  const vaultBal = await cusdt.balanceOf(VAULT);
  const ysBal = await cusdt.balanceOf(YS);
  const position = await ys.getPosition();

  console.log("Is holder:", isHolder);
  console.log("User deposited:", ethers.formatUnits(userDep, 6));
  console.log("Total deposited:", ethers.formatUnits(totalDep, 6));
  console.log("Vault cUSDT:", ethers.formatUnits(vaultBal, 6));
  console.log("YieldSource cUSDT:", ethers.formatUnits(ysBal, 6));
  console.log("YS principal:", ethers.formatUnits(position[0], 6));
  console.log("YS pending:", ethers.formatUnits(position[1], 6));
}

main().catch(console.error);
