import { ethers } from "hardhat";

const CUSDT_ADDRESS = "0x7474202A8Bce979B43E2CE79D4eB2225F227fE8D";
const DISTRIBUTOR = "0x5dC7Ef05C4F220A31116E90fc14D5f81538b7508";

async function main() {
  const [signer] = await ethers.getSigners();
  const erc20 = await ethers.getContractAt("MockCUSDT", CUSDT_ADDRESS, signer);
  const tx = await erc20.approve(DISTRIBUTOR, ethers.parseUnits("500000", 6));
  await tx.wait();
  console.log("✅ Approved distributor to spend 500,000 cUSDT");
}

main().catch(console.error);
