import { ethers } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT = "0xB3aB431D18fBA346601aD781f442A6AF56E70bC7";
const YS    = "0xBA24F3921989a84A7182A5988402FfB5B9Bc073e";

async function main() {
  const [signer] = await ethers.getSigners();
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  const ys = await ethers.getContractAt("MockYieldSource", YS, signer);

  await (await cusdt.approve(YS, ethers.parseUnits("50000", 6))).wait();
  await (await ys.seedYield(ethers.parseUnits("50000", 6))).wait();
  console.log("✅ Seeded 50,000 cUSDT");

  await (await cusdt.approve(VAULT, ethers.parseUnits("500000", 6))).wait();
  console.log("✅ Vault approved");

  console.log("\nREACT_APP_VAULT_ADDRESS=" + VAULT);
  console.log("REACT_APP_YIELD_SOURCE_ADDRESS=" + YS);
}

main().catch(console.error);
