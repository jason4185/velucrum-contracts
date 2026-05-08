import { ethers } from "hardhat";
const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT = "0xAEE9B4C17FD671eC4d611FBc9F7E3519F756250f";
async function main() {
  const [signer] = await ethers.getSigners();
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  await (await cusdt.approve(VAULT, ethers.parseUnits("500000", 6))).wait();
  console.log("✅ Vault approved to spend 500,000 cUSDT");
}
main().catch(console.error);
