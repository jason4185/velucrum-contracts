import { ethers } from "hardhat";

const CIRCLE_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const AAVE_USDC   = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

async function main() {
  const [signer] = await ethers.getSigners();
  
  for (const [name, addr] of [["Circle USDC", CIRCLE_USDC], ["Aave USDC", AAVE_USDC]]) {
    try {
      const usdc = new ethers.Contract(addr, [
        "function balanceOf(address) view returns (uint256)",
        "function name() view returns (string)"
      ], signer);
      const bal = await usdc.balanceOf(signer.address);
      const tokenName = await usdc.name();
      console.log(`${name} (${tokenName}): ${ethers.formatUnits(bal, 6)} USDC`);
    } catch (e) {
      console.log(`${name}: error reading`);
    }
  }
}

main().catch(console.error);
