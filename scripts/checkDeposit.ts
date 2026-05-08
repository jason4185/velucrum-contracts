import { ethers } from "hardhat";

const VAULT = "0x92bfb37065d74914a155e8cB297037Ac7b83DaF5";
const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);

  const isHolder = await vault.isHolder(signer.address);
  const count = await vault.holderCount();
  const vaultBal = await cusdt.balanceOf(VAULT);
  const walletBal = await cusdt.balanceOf(signer.address);

  console.log("Is holder:", isHolder);
  console.log("Holder count:", count.toString());
  console.log("Vault cUSDT balance:", ethers.formatUnits(vaultBal, 6));
  console.log("Your wallet cUSDT:", ethers.formatUnits(walletBal, 6));
}

main().catch(console.error);
