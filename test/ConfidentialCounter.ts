import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ConfidentialCounter", function () {
  let counter: any;
  let alice: any;
  let bob: any;
  let fhevm: any;

  before(async function () {
    [alice, bob] = await ethers.getSigners();
    fhevm = (this as any).hre?.fhevm ?? (ethers as any).provider._hardhatProvider?._hre?.fhevm;
    // Access fhevm from the hardhat runtime via the global hre
    const hre = await import("hardhat");
    fhevm = (hre as any).fhevm;

    await fhevm.initializeCLIApi();

    const Factory = await ethers.getContractFactory("ConfidentialCounter");
    counter = await Factory.connect(alice).deploy();
    await counter.waitForDeployment();
  });

  it("deploys to a valid address", async function () {
    expect(await counter.getAddress()).to.be.properAddress;
  });

  it("returns zero handle before first write", async function () {
    const handle = await counter.connect(alice).getCounter();
    expect(handle).to.equal(ethers.ZeroHash);
  });

  it("alice can increment her counter and decrypt it", async function () {
    const contractAddress = await counter.getAddress();

    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, alice.address)
      .add32(5)
      .encrypt();

    await counter.connect(alice).increment(encrypted.handles[0], encrypted.inputProof);

    const handle = await counter.connect(alice).getCounter();
    expect(handle).to.not.equal(ethers.ZeroHash);

    const value = await fhevm.userDecryptEuint(FhevmType.euint32, handle, contractAddress, alice);
    expect(value).to.equal(5n);
  });

  it("alice can increment again — values accumulate", async function () {
    const contractAddress = await counter.getAddress();

    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, alice.address)
      .add32(3)
      .encrypt();

    await counter.connect(alice).increment(encrypted.handles[0], encrypted.inputProof);

    const handle = await counter.connect(alice).getCounter();
    const value = await fhevm.userDecryptEuint(FhevmType.euint32, handle, contractAddress, alice);
    expect(value).to.equal(8n);
  });

  it("alice can decrement her counter", async function () {
    const contractAddress = await counter.getAddress();

    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, alice.address)
      .add32(2)
      .encrypt();

    await counter.connect(alice).decrement(encrypted.handles[0], encrypted.inputProof);

    const handle = await counter.connect(alice).getCounter();
    const value = await fhevm.userDecryptEuint(FhevmType.euint32, handle, contractAddress, alice);
    expect(value).to.equal(6n);
  });

  it("alice can reset her counter to zero", async function () {
    const contractAddress = await counter.getAddress();

    await counter.connect(alice).reset();

    const handle = await counter.connect(alice).getCounter();
    const value = await fhevm.userDecryptEuint(FhevmType.euint32, handle, contractAddress, alice);
    expect(value).to.equal(0n);
  });

  it("bob has an independent counter — starts at zero handle", async function () {
    const handle = await counter.connect(bob).getCounter();
    expect(handle).to.equal(ethers.ZeroHash);
  });

  it("bob's counter is independent from alice's", async function () {
    const contractAddress = await counter.getAddress();

    const encryptedBob = await fhevm
      .createEncryptedInput(contractAddress, bob.address)
      .add32(99)
      .encrypt();

    await counter.connect(bob).increment(encryptedBob.handles[0], encryptedBob.inputProof);

    const bobHandle = await counter.connect(bob).getCounter();
    const bobValue = await fhevm.userDecryptEuint(FhevmType.euint32, bobHandle, contractAddress, bob);
    expect(bobValue).to.equal(99n);

    // alice's handle is different from bob's
    const aliceHandle = await counter.connect(alice).getCounter();
    expect(aliceHandle).to.not.equal(bobHandle);
  });

  it("alice cannot decrypt bob's counter handle", async function () {
    const contractAddress = await counter.getAddress();
    const bobHandle = await counter.connect(bob).getCounter();

    // userDecryptEuint should fail because alice was never granted allow() on bob's handle
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint32, bobHandle, contractAddress, alice)
    ).to.be.rejected;
  });
});
