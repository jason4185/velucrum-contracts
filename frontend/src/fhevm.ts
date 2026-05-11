import { ethers } from "ethers";

// ✅ CORRECT — use window.ethereum (EIP-1193 provider object)
// ❌ WRONG  — do NOT pass a string RPC URL
// ❌ WRONG  — do NOT cache the instance (causes stale provider errors)
export const getFhevmInstance = async () => {
  const ethereum = (window as any).ethereum;
  if (!ethereum)
    throw new Error("No wallet detected. Please install MetaMask.");

  const { createInstance, SepoliaConfig, initSDK } =
    await import("@zama-fhe/relayer-sdk/web");
  await initSDK();
  return createInstance({ ...SepoliaConfig, network: ethereum } as any);
};

// Browser-safe hex conversion — NEVER use Buffer.from() in the browser
export const toHex = (v: any): string => {
  if (typeof v === "string") return v.startsWith("0x") ? v : "0x" + v;
  if (typeof v === "bigint") return "0x" + v.toString(16).padStart(64, "0");
  return (
    "0x" +
    Array.from(v as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("")
  );
};

// Serialize EIP-712 data — JSON.stringify fails on BigInt fields
export const stringifyEIP712 = (eip712: any): string => {
  return JSON.stringify(eip712, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
};

// Encrypt a uint32 value before sending to the contract
export const encryptUint32 = async (
  value: number,
  contractAddress: string, // ✅ MUST match the contract you will call
  userAddress: string,
) => {
  const instance = await getFhevmInstance();
  // createEncryptedInput binds the proof to this specific contract + user pair
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add32(value);
  const encrypted = await input.encrypt();

  return {
    handle: toHex(encrypted.handles[0]),
    proof: toHex(encrypted.inputProof),
  };
};

// Copied exactly from SKILL.md Step 7 — User Decryption Flow
export const revealEncryptedValue = async (
  signer: ethers.Signer,
  contractAddress: string,
  userAddress: string,
  getHandleFn: () => Promise<bigint>, // e.g. () => contract.getCounter()
): Promise<number> => {
  const instance = await getFhevmInstance();
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;

  // Step 1 — Build EIP-712 signing request
  // SDK 0.4.2: createEIP712(publicKey, contractAddresses, startTimestamp, durationDays)
  // userAddress is NOT a parameter — passing it causes InvalidTypeError UintNumber string
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    [contractAddress],
    startTimestamp,
    durationDays,
  );

  // Step 2 — User signs with MetaMask
  // NOTE: use stringifyEIP712, not JSON.stringify — BigInt fields will crash
  const sig = await (signer as any).provider.send("eth_signTypedData_v4", [
    userAddress,
    stringifyEIP712(eip712),
  ]);

  // Step 3 — Get encrypted handle from contract
  const rawHandle = await getHandleFn();
  // NOTE: use ethers.getAddress() for EIP-55 checksum — lowercase causes "Bad address checksum"
  const checkedContract = ethers.getAddress(contractAddress);
  const handleHex = toHex(rawHandle);

  // Step 4 — Decrypt via Zama KMS (only this wallet can trigger this)
  const result = await instance.userDecrypt(
    [{ handle: handleHex, contractAddress: checkedContract }],
    keypair.privateKey,
    keypair.publicKey,
    sig,
    [checkedContract],
    userAddress,
    startTimestamp,
    durationDays,
  );

  const keys = Object.keys(result);
  return Number(result[keys[0]]);
};
