import { ethers } from "hardhat";

const CUSDT_ADDRESS = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT_ADDRESS = "0xf5C2bFcD15c6475297Cb45819fCde43274138015";

async function main() {
  const [signer] = await ethers.getSigners();
  const erc20 = await ethers.getContractAt("MockCUSDT", CUSDT_ADDRESS, signer);
  const tx = await erc20.approve(VAULT_ADDRESS, ethers.parseUnits("500000", 6));
  await tx.wait();
  console.log("✅ Vault approved to spend 500,000 cUSDT");
}

main().catch(console.error);
