import { ethers } from "hardhat";

const CUSDT_ADDRESS = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying VelucumVault with:", deployer.address);

  const VelucumVault = await ethers.getContractFactory("VelucumVault");
  const vault = await VelucumVault.deploy(CUSDT_ADDRESS);
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("✅ VelucumVault deployed to:", address);
  console.log(`REACT_APP_VAULT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
