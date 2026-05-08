import { ethers } from "hardhat";

const AAVE_FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D";
const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  const faucet = new ethers.Contract(
    AAVE_FAUCET,
    ["function mint(address token, address to, uint256 amount) external"],
    signer
  );

  const tx = await faucet.mint(
    USDC,
    signer.address,
    ethers.parseUnits("10000", 6)
  );
  await tx.wait();
  console.log("✅ Minted 10,000 USDC from Aave faucet");

  const usdc = new ethers.Contract(
    USDC,
    ["function balanceOf(address) view returns (uint256)"],
    signer
  );
  const bal = await usdc.balanceOf(signer.address);
  console.log("USDC balance:", ethers.formatUnits(bal, 6));
}

main().catch(console.error);
