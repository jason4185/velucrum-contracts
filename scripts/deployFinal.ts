import { ethers } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy MockYieldSource
  const MockYieldSource = await ethers.getContractFactory("MockYieldSource");
  const yieldSource = await MockYieldSource.deploy(CUSDT);
  await yieldSource.waitForDeployment();
  const ysAddr = await yieldSource.getAddress();
  console.log("✅ MockYieldSource deployed:", ysAddr);

  // Deploy VelucumVault
  const VelucumVault = await ethers.getContractFactory("VelucumVault");
  const vault = await VelucumVault.deploy(CUSDT);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("✅ VelucumVault deployed:", vaultAddr);

  // Wire everything together
  await (await yieldSource.setVault(vaultAddr)).wait();
  console.log("✅ Vault set in yield source");

  await (await vault.setYieldSource(ysAddr)).wait();
  console.log("✅ Yield source set in vault");

  // Approve vault to spend cUSDT
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, deployer);
  await (await cusdt.approve(vaultAddr, ethers.parseUnits("500000", 6))).wait();
  console.log("✅ Vault approved");

  // Seed yield source with 50,000 cUSDT
  await (await cusdt.approve(ysAddr, ethers.parseUnits("50000", 6))).wait();
  await (await yieldSource.seedYield(ethers.parseUnits("50000", 6))).wait();
  console.log("✅ Yield source seeded with 50,000 cUSDT");

  console.log("\n── Update your .env ──");
  console.log(`REACT_APP_VAULT_ADDRESS=${vaultAddr}`);
  console.log(`REACT_APP_YIELD_SOURCE_ADDRESS=${ysAddr}`);
  console.log(`REACT_APP_CUSDT_ADDRESS=${CUSDT}`);
}

main().catch(console.error);
