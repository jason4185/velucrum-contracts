import { ethers } from "hardhat";

const VAULT = "0xdb9fdC3EB01C6A3a6022570aAd34701eb54A7FD6";
const YS = "0xCeb2c0511E083dD5fb10b61129ec2c2ADa211Aa7";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const ys = await ethers.getContractAt("MockYieldSource", YS, signer);

  const isHolder = await vault.isHolder(signer.address);
  const userDep = await vault.getUserDeposited(signer.address);
  const position = await ys.getPosition();
  const myPos = await vault.getMyYieldPosition();

  console.log("Is holder:", isHolder);
  console.log("User deposited:", ethers.formatUnits(userDep, 6));
  console.log("YS principal:", ethers.formatUnits(position[0], 6));
  console.log("YS pending:", ethers.formatUnits(position[1], 6));
  console.log("My pending:", ethers.formatUnits(myPos[1], 6));
}

main().catch(console.error);
