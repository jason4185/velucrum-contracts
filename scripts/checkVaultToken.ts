import { ethers } from "hardhat";

const VAULT = "0xAEE9B4C17FD671eC4d611FBc9F7E3519F756250f";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);
  const cusdt = await vault.cUSDT();
  console.log("Vault uses cUSDT:", cusdt);
  
  const token = new ethers.Contract(cusdt, [
    "function name() view returns (string)",
    "function balanceOf(address) view returns (uint256)"
  ], signer);
  console.log("Token name:", await token.name());
  console.log("Your balance:", ethers.formatUnits(await token.balanceOf(signer.address), 6));
}

main().catch(console.error);
