import { ethers } from "hardhat";
import { expect } from "chai";

describe("ConfidentialYieldDistributor", function () {
  let contract: any;
  let owner: any;
  let holder1: any;
  let holder2: any;

  before(async function () {
    [owner, holder1, holder2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialYieldDistributor");
    contract = await Factory.connect(owner).deploy();
    await contract.waitForDeployment();
  });

  it("should deploy successfully", async function () {
    expect(await contract.getAddress()).to.be.properAddress;
  });

  it("should have zero holders after deployment", async function () {
    expect(await contract.holderCount()).to.equal(0);
  });

  it("should have compliance threshold of 100", async function () {
    expect(await contract.complianceThreshold()).to.equal(100);
  });

  it("should allow owner to update compliance threshold", async function () {
    await contract.connect(owner).setComplianceThreshold(150);
    expect(await contract.complianceThreshold()).to.equal(150);
  });

  it("should reject non-owner updating compliance threshold", async function () {
    await expect(
      contract.connect(holder1).setComplianceThreshold(50)
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
  });

  it("should show unregistered address as not registered", async function () {
    expect(await contract.isRegistered(holder1.address)).to.be.false;
  });
});
