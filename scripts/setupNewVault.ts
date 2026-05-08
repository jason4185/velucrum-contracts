import { ethers } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT = "0x92bfb37065d74914a155e8cB297037Ac7b83DaF5";
const YIELD_SOURCE = "0xaa49EAC1D45D1b9284CC0F72d61B228240926CF1";

async function main() {
  const [signer] = await ethers.getSigners();
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);

  await (await cusdt.approve(VAULT, ethers.parseUnits("500000", 6))).wait();
  console.log("✅ Vault approved");

  await (await vault.setYieldSource(YIELD_SOURCE)).wait();
  console.log("✅ Yield source set");
}

main().catch(console.error);
