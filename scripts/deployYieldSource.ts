import { ethers } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockYieldSource with:", deployer.address);

  const MockYieldSource = await ethers.getContractFactory("MockYieldSource");
  const yieldSource = await MockYieldSource.deploy(CUSDT);
  await yieldSource.waitForDeployment();

  const address = await yieldSource.getAddress();
  console.log("✅ MockYieldSource deployed to:", address);
  console.log(`REACT_APP_YIELD_SOURCE_ADDRESS=${address}`);
}

main().catch(console.error);
