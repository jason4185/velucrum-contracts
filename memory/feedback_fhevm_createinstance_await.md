---
name: Always await getFhevmInstance / createInstance
description: createInstance from @zama-fhe/relayer-sdk returns a Promise — forgetting await gives a Promise object, not the FHE instance
type: feedback
---

Always `await` the result of `getFhevmInstance()` (or `createInstance()` directly). Without the await, `instance` is a Promise, which has no `.createEncryptedInput`, `.generateKeypair`, `.userDecrypt`, etc. — every method call silently fails with "X is not a function".

**Why:** `createInstance` from `@zama-fhe/relayer-sdk/web` is async. The SKILL.md pattern wraps it in `getFhevmInstance()` (also async), so every call site must `await getFhevmInstance()`.

**How to apply:** In `fhevm.ts`, export `getFhevmInstance` as an async function that returns `createInstance(...)`. In every caller, write `const instance = await getFhevmInstance()` — never `createInstance(...)` directly without await.
