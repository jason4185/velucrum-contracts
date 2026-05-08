import { ethers } from "hardhat";

const VAULT = "0x9347c5D16Aa4bE5Ad2B44F54EcAAbe6DD35B15E6";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  
  const count = await vault.holderCount();
  console.log("Holder count:", count.toString());
  
  const cusdt = await vault.cUSDT();
  console.log("cUSDT:", cusdt);
  
  const ratio = await vault.collateralRatio();
  console.log("Collateral ratio:", ratio.toString());

  const shield = await vault.shieldActive();
  console.log("Shield active:", shield);

  // Try a direct deposit with hardhat signer
  const MockCUSDT = await ethers.getContractAt(
    "MockCUSDT",
    "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0",
    signer
  );
  
  const bal = await MockCUSDT.balanceOf(signer.address);
  console.log("cUSDT balance:", ethers.formatUnits(bal, 6));
  
  const allowance = await MockCUSDT.allowance(signer.address, VAULT);
  console.log("Allowance:", ethers.formatUnits(allowance, 6));
}

main().catch(console.error);
