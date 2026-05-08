import { ethers } from "hardhat";

const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  const usdc = await ethers.getContractAt(
    ["function mint(address to, uint256 amount) external",
     "function balanceOf(address) view returns (uint256)",
     "function decimals() view returns (uint8)"],
    USDC,
    signer
  );

  const before = await usdc.balanceOf(signer.address);
  console.log("USDC balance before:", ethers.formatUnits(before, 6));

  // Try minting
  try {
    const tx = await usdc.mint(signer.address, ethers.parseUnits("10000", 6));
    await tx.wait();
    console.log("✅ Minted 10,000 USDC");
  } catch (e) {
    console.log("Mint not available — try Aave faucet UI");
  }

  const after = await usdc.balanceOf(signer.address);
  console.log("USDC balance after:", ethers.formatUnits(after, 6));
}

main().catch(console.error);
