// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

// Each user has a private encrypted counter only they can read.
contract ConfidentialCounter is ZamaEthereumConfig {
    mapping(address => euint32) private counters;
    mapping(address => bool)    private initialized;

    event Incremented(address indexed user);
    event Decremented(address indexed user);
    event Reset(address indexed user);

    function increment(externalEuint32 encryptedValue, bytes calldata inputProof) external {
        euint32 val = FHE.fromExternal(encryptedValue, inputProof);

        if (!initialized[msg.sender]) {
            counters[msg.sender] = val;
            initialized[msg.sender] = true;
        } else {
            counters[msg.sender] = FHE.add(counters[msg.sender], val);
        }

        FHE.allowThis(counters[msg.sender]);
        FHE.allow(counters[msg.sender], msg.sender);
        emit Incremented(msg.sender);
    }

    function decrement(externalEuint32 encryptedValue, bytes calldata inputProof) external {
        euint32 val = FHE.fromExternal(encryptedValue, inputProof);
        counters[msg.sender] = FHE.sub(counters[msg.sender], val);
        initialized[msg.sender] = true;

        FHE.allowThis(counters[msg.sender]);
        FHE.allow(counters[msg.sender], msg.sender);
        emit Decremented(msg.sender);
    }

    function reset() external {
        counters[msg.sender] = FHE.asEuint32(0);
        initialized[msg.sender] = true;

        FHE.allowThis(counters[msg.sender]);
        FHE.allow(counters[msg.sender], msg.sender);
        emit Reset(msg.sender);
    }

    // Returns the encrypted handle. Returns 0 (ZeroHash) if never written.
    // Only the caller can retrieve their own handle — never an address parameter.
    function getCounter() external view returns (euint32) {
        return counters[msg.sender];
    }
}
