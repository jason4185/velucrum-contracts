import { useState } from "react";
import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";
import { encryptUint32, revealEncryptedValue } from "./fhevm";
import "./App.css";

const CONTRACT_ADDRESS = "0x8C073467FB8eA3b16A98C417592AF451e70f0dc8";
const SEPOLIA_CHAIN_ID = 11155111;

// euint32 returns as uint256 BigInt in ethers.js — use uint256 in ABI (SKILL.md Step 7)
const ABI = [
  "function increment(bytes32 encryptedValue, bytes calldata inputProof) external",
  "function decrement(bytes32 encryptedValue, bytes calldata inputProof) external",
  "function reset() external",
  "function getCounter() external view returns (uint256)",
];

export default function App() {
  const [signer, setSigner]             = useState<JsonRpcSigner | null>(null);
  const [contract, setContract]         = useState<Contract | null>(null);
  const [walletAddr, setWalletAddr]     = useState("");
  const [counterDisplay, setCounterDisplay] = useState("—");
  const [incValue, setIncValue]         = useState(1);
  const [decValue, setDecValue]         = useState(1);
  const [status, setStatus]             = useState("");
  const [statusType, setStatusType]     = useState<"ok" | "error" | "">("");
  const [busy, setBusy]                 = useState(false);

  const showStatus = (msg: string, type: "ok" | "error" | "" = "") => {
    setStatus(msg);
    setStatusType(type);
  };

  const connectWallet = async () => {
    const eth = (window as any).ethereum;
    if (!eth) { showStatus("MetaMask not found. Please install it.", "error"); return; }
    try {
      const p = new BrowserProvider(eth);
      await p.send("eth_requestAccounts", []);
      const network = await p.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        await p.send("wallet_switchEthereumChain", [{ chainId: "0xaa36a7" }]);
      }
      const s = await (new BrowserProvider(eth)).getSigner();
      setSigner(s);
      setContract(new Contract(CONTRACT_ADDRESS, ABI, s));
      setWalletAddr(await s.getAddress());
      setCounterDisplay("? (click Reveal)");
      showStatus("Wallet connected.", "ok");
    } catch (e: any) {
      showStatus(e?.message ?? "Connection failed.", "error");
    }
  };

  const reveal = async () => {
    if (!signer || !contract) return;
    setBusy(true);
    showStatus("⏳ Signing decryption request…");
    try {
      const userAddress = await signer.getAddress();
      const value = await revealEncryptedValue(
        signer,
        CONTRACT_ADDRESS,
        userAddress,
        async () => {
          const raw: bigint = await contract.getCounter();
          if (raw === 0n) {
            setCounterDisplay("0");
            showStatus("Counter not yet initialized — increment it first.", "ok");
            throw new Error("__skip__");
          }
          return raw;
        },
      );
      setCounterDisplay(value.toLocaleString());
      showStatus("Decrypted successfully.", "ok");
    } catch (e: any) {
      if (e?.message !== "__skip__") showStatus(e?.message ?? "Decryption failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const increment = async () => {
    if (!signer || !contract) return;
    setBusy(true);
    showStatus("⏳ Encrypting and sending…");
    try {
      const userAddress = await signer.getAddress();
      const { handle, proof } = await encryptUint32(incValue, CONTRACT_ADDRESS, userAddress);
      const tx = await contract.increment(handle, proof);
      showStatus(`⏳ tx ${tx.hash} — confirming…`);
      await tx.wait();
      showStatus(`Incremented by ${incValue}. Click Reveal to see your count.`, "ok");
    } catch (e: any) {
      showStatus(e?.message ?? "Increment failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const decrement = async () => {
    if (!signer || !contract) return;
    setBusy(true);
    showStatus("⏳ Encrypting and sending…");
    try {
      const userAddress = await signer.getAddress();
      const { handle, proof } = await encryptUint32(decValue, CONTRACT_ADDRESS, userAddress);
      const tx = await contract.decrement(handle, proof);
      showStatus(`⏳ tx ${tx.hash} — confirming…`);
      await tx.wait();
      showStatus(`Decremented by ${decValue}. Click Reveal to see your count.`, "ok");
    } catch (e: any) {
      showStatus(e?.message ?? "Decrement failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!signer || !contract) return;
    setBusy(true);
    showStatus("⏳ Sending reset…");
    try {
      const tx = await contract.reset();
      showStatus(`⏳ tx ${tx.hash} — confirming…`);
      await tx.wait();
      setCounterDisplay("0");
      showStatus("Counter reset to 0.", "ok");
    } catch (e: any) {
      showStatus(e?.message ?? "Reset failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const connected = !!signer;

  return (
    <div className="counter-card">
      <h1>Confidential Counter</h1>
      <p className="subtitle">Your count is encrypted on-chain — only you can read it.</p>

      {!connected ? (
        <button className="btn primary full" onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p className="wallet-info">{walletAddr}</p>
      )}

      <div className="counter-display">
        <div className="counter-value">{counterDisplay}</div>
        <div className="counter-label">encrypted on Sepolia · only visible to you</div>
      </div>

      <div className="actions">
        <div className="action-group">
          <span className="action-label">Increment</span>
          <div className="row">
            <input type="number" min={1} value={incValue}
              onChange={e => setIncValue(Number(e.target.value))}
              disabled={!connected || busy} />
            <button className="btn" onClick={increment} disabled={!connected || busy}>+ Add</button>
          </div>
        </div>

        <div className="action-group">
          <span className="action-label">Decrement</span>
          <div className="row">
            <input type="number" min={1} value={decValue}
              onChange={e => setDecValue(Number(e.target.value))}
              disabled={!connected || busy} />
            <button className="btn" onClick={decrement} disabled={!connected || busy}>− Subtract</button>
          </div>
        </div>

        <hr className="divider" />

        <div className="row">
          <button className="btn primary" style={{ flex: 1 }} onClick={reveal} disabled={!connected || busy}>
            Reveal my count
          </button>
          <button className="btn danger" onClick={reset} disabled={!connected || busy}>
            Reset to 0
          </button>
        </div>
      </div>

      {status && <p className={`status ${statusType}`}>{status}</p>}
    </div>
  );
}
