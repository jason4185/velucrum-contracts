import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy ConfidentialCounter
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with ConfidentialCounter
 *
 *   npx hardhat --network localhost task:address
 *   npx hardhat --network localhost task:decrypt-count
 *   npx hardhat --network localhost task:increment --value 2
 *   npx hardhat --network localhost task:decrement --value 1
 *   npx hardhat --network localhost task:reset
 *   npx hardhat --network localhost task:decrypt-count
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy ConfidentialCounter
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with ConfidentialCounter
 *
 *   npx hardhat --network sepolia task:address
 *   npx hardhat --network sepolia task:decrypt-count
 *   npx hardhat --network sepolia task:increment --value 2
 *   npx hardhat --network sepolia task:decrement --value 1
 *   npx hardhat --network sepolia task:reset
 *   npx hardhat --network sepolia task:decrypt-count
 *
 */

task("task:address", "Prints the ConfidentialCounter address").setAction(
  async function (_taskArguments: TaskArguments, hre) {
    const { deployments } = hre;
    const deployment = await deployments.get("ConfidentialCounter");
    console.log("ConfidentialCounter address is " + deployment.address);
  },
);

task("task:decrypt-count", "Decrypts and prints the caller's private counter")
  .addOptionalParam("address", "Optionally specify the ConfidentialCounter contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ConfidentialCounter");
    console.log(`ConfidentialCounter: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ConfidentialCounter", deployment.address);

    const encryptedHandle = await contract.connect(signers[0]).getCounter();
    if (encryptedHandle === ethers.ZeroHash) {
      console.log("counter handle : (uninitialized)");
      console.log("clear count    : 0");
      return;
    }

    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedHandle,
      deployment.address,
      signers[0],
    );
    console.log(`Encrypted handle: ${encryptedHandle}`);
    console.log(`Clear count     : ${clearCount}`);
  });

task("task:increment", "Adds an encrypted value to the caller's private counter")
  .addOptionalParam("address", "Optionally specify the ConfidentialCounter contract address")
  .addParam("value", "The plaintext increment value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`--value must be a positive integer`);
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ConfidentialCounter");
    console.log(`ConfidentialCounter: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ConfidentialCounter", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await contract
      .connect(signers[0])
      .increment(encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Waiting for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx status=${receipt?.status}`);
    console.log(`increment(${value}) succeeded!`);
  });

task("task:decrement", "Subtracts an encrypted value from the caller's private counter")
  .addOptionalParam("address", "Optionally specify the ConfidentialCounter contract address")
  .addParam("value", "The plaintext decrement value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`--value must be a positive integer`);
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ConfidentialCounter");
    console.log(`ConfidentialCounter: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ConfidentialCounter", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await contract
      .connect(signers[0])
      .decrement(encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Waiting for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx status=${receipt?.status}`);
    console.log(`decrement(${value}) succeeded!`);
  });

task("task:reset", "Resets the caller's private counter to zero")
  .addOptionalParam("address", "Optionally specify the ConfidentialCounter contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ConfidentialCounter");
    console.log(`ConfidentialCounter: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ConfidentialCounter", deployment.address);

    const tx = await contract.connect(signers[0]).reset();
    console.log(`Waiting for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx status=${receipt?.status}`);
    console.log("reset() succeeded!");
  });
