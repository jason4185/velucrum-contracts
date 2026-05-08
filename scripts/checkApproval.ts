import { ethers } from "hardhat";
const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT = "0x5E1f01bA1887c8f9c4D71A1419F477fEeC30D258";
async function main() {
  const [signer] = await ethers.getSigners();
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  const allowance = await cusdt.allowance(signer.address, VAULT);
  console.log("Allowance:", ethers.formatUnits(allowance, 6));
  const bal = await cusdt.balanceOf(signer.address);
  console.log("Balance:", ethers.formatUnits(bal, 6));
  const vaultCusdt = await (await ethers.getContractAt("VelucumVault", VAULT, signer)).cUSDT();
  console.log("Vault cUSDT:", vaultCusdt);
  console.log("Expected:  ", CUSDT);
  console.log("Match:", vaultCusdt.toLowerCase() === CUSDT.toLowerCase());
}
main().catch(console.error);
