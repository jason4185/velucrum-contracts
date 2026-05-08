import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  // Check old cUSDT balance
  const oldCUSDT = await ethers.getContractAt(
    "MockCUSDT",
    "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0",
    signer
  );

  const bal = await oldCUSDT.balanceOf(signer.address);
  console.log("Old cUSDT balance:", ethers.formatUnits(bal, 6));

  // No need to burn — just stop using it
  // The new vault will use real Sepolia USDC
  console.log("✅ Old cUSDT noted — new vault will use Sepolia USDC");
  console.log("Old cUSDT address (ignore going forward):", "0xEd0C55690776FA2C5214dc5A4F0A2450627f5Ca0");
  console.log("New USDC address:", "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8");
}

main().catch(console.error);
