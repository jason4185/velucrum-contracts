import { ethers } from "hardhat";
async function main() {
  const [deployer] = await ethers.getSigners();
  const R = await ethers.getContractFactory("TestReceiver");
  const r = await R.deploy();
  await r.waitForDeployment();
  console.log("TestReceiver deployed:", await r.getAddress());
}
main().catch(console.error);
