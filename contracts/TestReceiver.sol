// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@fhevm/solidity/config/ZamaConfig.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

contract TestReceiver is ZamaEthereumConfig {
    event CallReceived(bytes4 selector, bytes data);

    fallback() external {
        emit CallReceived(msg.sig, msg.data);
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }
}
