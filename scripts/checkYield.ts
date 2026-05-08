import { ethers } from "hardhat";

const VAULT = "0xD5e879bFF37Bf93bCab4b9Ba56C7Ef3c2182407C";
const YS = "0xb133B4C9e5dE32B198B9084923F026488CF76deD";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const ys = await ethers.getContractAt("MockYieldSource", YS, signer);

  const position = await ys.getPosition();
  const myPosition = await vault.getMyYieldPosition();

  console.log("Total principal:", ethers.formatUnits(position[0], 6), "cUSDT");
  console.log("Total pending:", ethers.formatUnits(position[1], 6), "cUSDT");
  console.log("My deposited:", ethers.formatUnits(myPosition[0], 6), "cUSDT");
  console.log("My pending:", ethers.formatUnits(myPosition[1], 6), "cUSDT");
}

main().catch(console.error);
