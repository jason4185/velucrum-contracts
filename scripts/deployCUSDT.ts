import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockCUSDT with:", deployer.address);

  const MockCUSDT = await ethers.getContractFactory("MockCUSDT");
  const token = await MockCUSDT.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("✅ MockCUSDT deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
