---
name: userDecrypt SDK 0.4.2 — three required fixes
description: Three bugs that break userDecrypt in @zama-fhe/relayer-sdk@0.4.2 and their exact fixes
type: feedback
---

Three things that must be done correctly for `userDecrypt` to work in SDK 0.4.2:

**1. `createEIP712` does NOT take `userAddress`**
Signature: `createEIP712(publicKey, contractAddresses, startTimestamp, durationDays)`
Passing `userAddress` as the 3rd argument puts a string into the `startTimestamp` (UintNumber) slot → `InvalidTypeError undefined UintNumber string`.

**2. Checksummed addresses required**
`userDecrypt` and `createEIP712` expect `ChecksummedAddress`. Pass `ethers.getAddress(userAddress)` — lowercase addresses throw `ChecksummedAddressError`.

**3. Handle must be padded to 64 hex chars**
The `bytes32` handle returned from a Solidity getter may have leading zeros stripped. The SDK requires exactly 64 hex characters after `0x`. Pad with: `"0x" + handle.slice(2).padStart(64, "0")`.

**Bonus: BigInt-safe EIP-712 stringify**
`JSON.stringify` silently drops BigInt fields. Use a replacer: `JSON.stringify(eip712, (_, v) => typeof v === 'bigint' ? v.toString() : v)`.

**Why:** Discovered in production on Sepolia, SDK version 0.4.2. `stringifyEIP712` is NOT exported by the SDK — implement the replacer manually.

**How to apply:** Always use the `revealEncryptedValue` helper in `frontend/src/fhevm.ts` rather than calling `instance.userDecrypt` directly.
