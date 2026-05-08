import { ethers } from "hardhat";

const ZAMA_CUSDT = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
const ZAMA_UNDERLYING_USDT = "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const VaultV2 = await ethers.getContractFactory("VelucumVaultV2");
  const vault = await VaultV2.deploy(ZAMA_CUSDT, ZAMA_UNDERLYING_USDT);
  await vault.waitForDeployment();

  console.log("✅ VelucumVaultV2 deployed:", await vault.getAddress());
  console.log("── cUSDT:", ZAMA_CUSDT);
  console.log("── Underlying USDT:", ZAMA_UNDERLYING_USDT);
}

main().catch(console.error);
