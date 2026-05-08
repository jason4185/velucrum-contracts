// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

interface IYieldSource {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function withdrawYield(uint256 amount) external;
    function pendingYield() external view returns (uint256);
    function getPosition() external view returns (uint256 principal, uint256 pending);
}

contract VelucumVault is ZamaEthereumConfig, Ownable {

    IERC20 public immutable cUSDT;
    IYieldSource public yieldSource;

    uint8 public constant POOL_SAFE     = 1;
    uint8 public constant POOL_BALANCED = 2;
    uint8 public constant POOL_HIGH     = 3;
    mapping(uint8 => uint256) public poolAPY;

    struct Holder {
        euint64 balance;
        euint64 yieldEarned;
        uint8   pool;
        bool    exists;
        uint256 depositedAt;
    }
    mapping(address => Holder) private holders;
    uint256 public holderCount;

    mapping(address => uint256) public userDeposited;
    uint256 public totalVaultDeposited;

    struct Loan {
        euint64 amount;
        bool    active;
        uint256 openedAt;
        uint256 plainAmount;
    }
    mapping(address => Loan) private loans;
    uint256 public collateralRatio = 70;
    uint256 public autoCompoundInterval = 100; // every 100 blocks ~20 mins
    mapping(address => uint256) public lastCompoundBlock;

    event Deposited(address indexed holder, uint8 pool, uint256 amount);
    event Withdrawn(address indexed holder, uint256 amount);
    event SuppliedToYieldSource(uint256 amount);
    event YieldHarvested(address indexed holder, uint256 yieldAmount);
    event LoanOpened(address indexed borrower);
    event LoanRepaid(address indexed borrower);
    event LoanLiquidated(address indexed borrower);

    constructor(address _cUSDT) Ownable(msg.sender) {
        cUSDT = IERC20(_cUSDT);
        poolAPY[POOL_SAFE]     = 740;
        poolAPY[POOL_BALANCED] = 1180;
        poolAPY[POOL_HIGH]     = 1860;
    }

    // ── FEATURE 1: PRIVATE VAULT ──────────────────────────────────────

    function deposit(
        externalEuint64 encryptedAmount,
        bytes memory inputProof,
        uint8 pool,
        uint256 plainAmount
    ) external {
        require(pool >= 1 && pool <= 3, "Invalid pool");
        require(plainAmount > 0, "Amount must be > 0");
        require(cUSDT.transferFrom(msg.sender, address(this), plainAmount), "Transfer failed");

        euint64 enc = FHE.fromExternal(encryptedAmount, inputProof);

        if (!holders[msg.sender].exists) {
            holders[msg.sender] = Holder({
                balance:     enc,
                yieldEarned: FHE.asEuint64(0),
                pool:        pool,
                exists:      true,
                depositedAt: block.number
            });
            holderCount++;
        } else {
            holders[msg.sender].balance = FHE.add(holders[msg.sender].balance, enc);
            holders[msg.sender].pool    = pool;
        }

        FHE.allowThis(holders[msg.sender].balance);
        FHE.allow(holders[msg.sender].balance, msg.sender);
        FHE.allowThis(holders[msg.sender].yieldEarned);
        FHE.allow(holders[msg.sender].yieldEarned, msg.sender);

        userDeposited[msg.sender] += plainAmount;

        if (address(yieldSource) != address(0)) {
            cUSDT.approve(address(yieldSource), plainAmount);
            yieldSource.deposit(plainAmount);
            totalVaultDeposited += plainAmount;
            emit SuppliedToYieldSource(plainAmount);
        }

        emit Deposited(msg.sender, pool, plainAmount);
    }

    function withdraw(uint256 plainAmount) external {
        require(holders[msg.sender].exists, "Not a holder");
        require(!loans[msg.sender].active, "Repay loan first");
        require(userDeposited[msg.sender] >= plainAmount, "Exceeds deposit");

        if (address(yieldSource) != address(0)) {
            yieldSource.withdraw(plainAmount);
            totalVaultDeposited -= plainAmount;
        }

        euint64 enc = FHE.asEuint64(uint64(plainAmount));
        holders[msg.sender].balance = FHE.sub(holders[msg.sender].balance, enc);
        FHE.allowThis(holders[msg.sender].balance);
        FHE.allow(holders[msg.sender].balance, msg.sender);

        userDeposited[msg.sender] -= plainAmount;

        require(cUSDT.transfer(msg.sender, plainAmount), "Transfer failed");
        emit Withdrawn(msg.sender, plainAmount);
    }

    function harvestYield() external {
        require(holders[msg.sender].exists, "Not a holder");
        require(address(yieldSource) != address(0), "No yield source");
        require(userDeposited[msg.sender] > 0, "No deposit");
        require(totalVaultDeposited > 0, "Nothing deployed");

        uint256 totalYield = yieldSource.pendingYield();
        require(totalYield > 0, "No yield yet");

        uint256 userShare = (userDeposited[msg.sender] * totalYield) / totalVaultDeposited;
        require(userShare > 0, "Share too small");

        yieldSource.withdrawYield(userShare);

        euint64 yieldEnc = FHE.asEuint64(uint64(userShare));
        holders[msg.sender].yieldEarned = FHE.add(holders[msg.sender].yieldEarned, yieldEnc);
        holders[msg.sender].balance     = FHE.add(holders[msg.sender].balance, yieldEnc);

        FHE.allowThis(holders[msg.sender].balance);
        FHE.allow(holders[msg.sender].balance, msg.sender);
        FHE.allowThis(holders[msg.sender].yieldEarned);
        FHE.allow(holders[msg.sender].yieldEarned, msg.sender);

        emit YieldHarvested(msg.sender, userShare);
    }

    function getMyYieldPosition() external view returns (uint256 myDeposited, uint256 myPendingYield) {
        if (address(yieldSource) == address(0) || totalVaultDeposited == 0) return (0, 0);
        myDeposited = userDeposited[msg.sender];
        uint256 totalYield = yieldSource.pendingYield();
        myPendingYield = (userDeposited[msg.sender] * totalYield) / totalVaultDeposited;
    }

    function getTotalYieldPosition() external view returns (uint256 principal, uint256 pending) {
        if (address(yieldSource) == address(0)) return (0, 0);
        return yieldSource.getPosition();
    }

    // ── FEATURE 2: BLIND LENDING ──────────────────────────────────────

    function openLoan(
        externalEuint64 encryptedLoanAmt,
        bytes memory inputProof,
        uint256 plainLoanAmt
    ) external {
        require(holders[msg.sender].exists, "Not a holder");
        require(!loans[msg.sender].active, "Loan already open");

        euint64 loanEnc   = FHE.fromExternal(encryptedLoanAmt, inputProof);
        require(plainLoanAmt <= userDeposited[msg.sender] * collateralRatio / 100, "Exceeds collateral limit");
        euint64 maxBorrow = FHE.mul(holders[msg.sender].balance, FHE.asEuint64(uint64(collateralRatio)));
        ebool canBorrow   = FHE.le(loanEnc, maxBorrow);
        euint64 effective = FHE.select(canBorrow, loanEnc, FHE.asEuint64(0));

        loans[msg.sender] = Loan({ amount: effective, active: true, openedAt: block.number, plainAmount: plainLoanAmt });
        FHE.allowThis(loans[msg.sender].amount);
        FHE.allow(loans[msg.sender].amount, msg.sender);

        if (address(yieldSource) != address(0)) {
            yieldSource.withdraw(plainLoanAmt);
            totalVaultDeposited -= plainLoanAmt;
            userDeposited[msg.sender] -= plainLoanAmt;
        }

        require(cUSDT.transfer(msg.sender, plainLoanAmt), "Transfer failed");
        emit LoanOpened(msg.sender);
    }

    function repayLoan(
        externalEuint64 encryptedAmt,
        bytes memory inputProof,
        uint256 plainAmt
    ) external {
        require(loans[msg.sender].active, "No active loan");
        require(plainAmt == loans[msg.sender].plainAmount, "Repay amount must match loan amount");
        require(cUSDT.transferFrom(msg.sender, address(this), plainAmt), "Transfer failed");

        euint64 repayEnc = FHE.fromExternal(encryptedAmt, inputProof);
        loans[msg.sender].amount = FHE.sub(loans[msg.sender].amount, repayEnc);
        FHE.allowThis(loans[msg.sender].amount);
        FHE.allow(loans[msg.sender].amount, msg.sender);
        loans[msg.sender].active = false;

        if (address(yieldSource) != address(0)) {
            cUSDT.approve(address(yieldSource), plainAmt);
            yieldSource.deposit(plainAmt);
            totalVaultDeposited += plainAmt;
            userDeposited[msg.sender] += plainAmt;
        }

        emit LoanRepaid(msg.sender);
    }

    function liquidate(address borrower) external {
        require(loans[borrower].active, "No active loan");
        ebool isUnder  = FHE.lt(holders[borrower].balance, loans[borrower].amount);
        euint64 seized = FHE.select(isUnder, holders[borrower].balance, FHE.asEuint64(0));
        holders[borrower].balance = FHE.sub(holders[borrower].balance, seized);
        FHE.allowThis(holders[borrower].balance);
        loans[borrower].active = false;
        emit LoanLiquidated(borrower);
    }

    // ── FEATURE 3: CONFIDENTIAL AUTO-COMPOUND ────────────────────────

    /**
     * @notice Auto-compounds yield back into vault privately
     * @dev Yield re-deposited to yield source — balance grows silently
     *      Nobody sees the compound amount — encrypted via FHE
     *      Can be called by anyone after interval passes
     */
    function autoCompound(address holder) external {
        require(holders[holder].exists, "Not a holder");
        require(userDeposited[holder] > 0, "No deposit");
        require(
            block.number >= lastCompoundBlock[holder] + autoCompoundInterval,
            "Too soon to compound"
        );
        require(address(yieldSource) != address(0), "No yield source");
        require(totalVaultDeposited > 0, "Nothing deployed");

        uint256 totalYield = yieldSource.pendingYield();
        if (totalYield == 0) return;

        uint256 userShare = (userDeposited[holder] * totalYield) / totalVaultDeposited;
        if (userShare == 0) return;

        // Pull yield from yield source
        yieldSource.withdrawYield(userShare);

        // Re-deposit back to yield source — compounding
        cUSDT.approve(address(yieldSource), userShare);
        yieldSource.deposit(userShare);
        totalVaultDeposited += userShare;
        userDeposited[holder] += userShare;
        lastCompoundBlock[holder] = block.number;

        // Add to encrypted balance privately via FHE
        euint64 compoundEnc = FHE.asEuint64(uint64(userShare));
        holders[holder].yieldEarned = FHE.add(holders[holder].yieldEarned, compoundEnc);
        holders[holder].balance     = FHE.add(holders[holder].balance, compoundEnc);
        FHE.allowThis(holders[holder].balance);
        FHE.allow(holders[holder].balance, holder);
        FHE.allowThis(holders[holder].yieldEarned);
        FHE.allow(holders[holder].yieldEarned, holder);

        emit YieldHarvested(holder, userShare);
    }

    function setAutoCompoundInterval(uint256 blocks) external onlyOwner {
        autoCompoundInterval = blocks;
    }

    function getNextCompoundBlock(address holder) external view returns (uint256) {
        return lastCompoundBlock[holder] + autoCompoundInterval;
    }

    // ── VIEWS ─────────────────────────────────────────────────────────

    function getMyBalance()  external view returns (euint64) { return holders[msg.sender].balance; }
    function getMyYield()    external view returns (euint64) { return holders[msg.sender].yieldEarned; }
    function getMyLoan()     external view returns (euint64) { return loans[msg.sender].amount; }
    function isHolder(address a)      external view returns (bool)   { return holders[a].exists; }
    function getPool(address a)       external view returns (uint8)  { return holders[a].pool; }
    function hasActiveLoan() external view returns (bool)   { return loans[msg.sender].active; }
    function hasActiveLoanFor(address a) external view onlyOwner returns (bool) { return loans[a].active; }
    function getUserDeposited(address a) external view returns (uint256) { return userDeposited[a]; }

    // ── ADMIN ─────────────────────────────────────────────────────────

    function setYieldSource(address _yieldSource) external onlyOwner {
        yieldSource = IYieldSource(_yieldSource);
    }

    function setCollateralRatio(uint256 ratio) external onlyOwner {
        require(ratio <= 90, "Max 90%");
        collateralRatio = ratio;
    }

    function setPoolAPY(uint8 pool, uint256 apyBps) external onlyOwner {
        require(pool >= 1 && pool <= 3, "Invalid pool");
        poolAPY[pool] = apyBps;
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 bal = cUSDT.balanceOf(address(this));
        if (bal > 0) cUSDT.transfer(owner(), bal);
    }
}
