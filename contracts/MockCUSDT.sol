// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockCUSDT is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("Confidential USDT", "cUSDT") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** _DECIMALS);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet() external {
        _mint(msg.sender, 10_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
}
