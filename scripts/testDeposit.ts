import { ethers } from "hardhat";
import { fhevm } from "hardhat";

const CUSDT = "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0";
const VAULT = "0xD5e879bFF37Bf93bCab4b9Ba56C7Ef3c2182407C";

async function main() {
  await fhevm.initializeCLIApi();
  const [signer] = await ethers.getSigners();
  const cusdt = await ethers.getContractAt("MockCUSDT", CUSDT, signer);
  const vault = await ethers.getContractAt("VelucumVault", VAULT, signer);

  await (await cusdt.approve(VAULT, ethers.parseUnits("10000", 6))).wait();
  console.log("✅ Approved");

  const input = fhevm.createEncryptedInput(VAULT, signer.address);
  input.add64(2000000000n);
  const enc = await input.encrypt();

  await (await vault.deposit(enc.handles[0], enc.inputProof, 1, ethers.parseUnits("2000", 6))).wait();
  console.log("✅ Deposited 2000 cUSDT");

  const deployed = await vault.getUserDeposited(signer.address);
  const total = await vault.totalVaultDeposited();
  console.log("Your deployed:", ethers.formatUnits(deployed, 6), "cUSDT");
  console.log("Total deployed:", ethers.formatUnits(total, 6), "cUSDT");
}

main().catch(console.error);
