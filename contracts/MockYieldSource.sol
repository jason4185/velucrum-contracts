// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockYieldSource
 * @notice Simulates Aave-style yield generation
 *         Only knows the vault address — individual users completely hidden
 *         Pluggable: replace with real Aave V3 adapter in production
 */
contract MockYieldSource is Ownable {

    IERC20 public immutable cUSDT;
    address public vault;

    uint256 public apyBps = 700; // 7% APY
    uint256 public constant BLOCKS_PER_YEAR = 2_628_000;

    uint256 public principal;
    uint256 public depositedBlock;

    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event YieldWithdrawn(uint256 amount);

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    constructor(address _cUSDT) Ownable(msg.sender) {
        cUSDT = IERC20(_cUSDT);
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    function deposit(uint256 amount) external onlyVault {
        require(amount > 0, "Amount must be > 0");
        require(cUSDT.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        // Don't reset depositedBlock — yield keeps accruing on existing principal
        if (depositedBlock == 0) depositedBlock = block.number;
        principal += amount;
        emit Deposited(amount);
    }

    function withdraw(uint256 amount) external onlyVault {
        require(amount <= principal, "Exceeds principal");
        principal -= amount;
        if (principal == 0) depositedBlock = 0;
        require(cUSDT.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(amount);
    }

    /**
     * @notice Vault requests specific yield amount for a user
     * @dev MockYieldSource never knows which user this is for
     */
    function withdrawYield(uint256 amount) external onlyVault {
        uint256 available = pendingYield();
        require(amount <= available, "Not enough yield");
        require(cUSDT.transfer(msg.sender, amount), "Transfer failed");
        emit YieldWithdrawn(amount);
    }

    function pendingYield() public view returns (uint256) {
        if (principal == 0 || depositedBlock == 0) return 0;
        uint256 blocksElapsed = block.number - depositedBlock;
        uint256 yield = (principal * apyBps * blocksElapsed) / (BLOCKS_PER_YEAR * 10_000);
        uint256 reserve = cUSDT.balanceOf(address(this)) > principal
            ? cUSDT.balanceOf(address(this)) - principal : 0;
        return yield > reserve ? reserve : yield;
    }

    function getPosition() external view returns (uint256 _principal, uint256 _pending) {
        return (principal, pendingYield());
    }

    function setAPY(uint256 _apyBps) external onlyOwner {
        require(_apyBps <= 5000, "Max 50%");
        apyBps = _apyBps;
    }

    function seedYield(uint256 amount) external onlyOwner {
        require(cUSDT.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
}
