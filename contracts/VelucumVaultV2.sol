// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

import "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";

interface IConfidentialERC20 {
    function confidentialTransferAndCall(address to, externalEuint64 encryptedAmount, bytes calldata inputProof, bytes calldata callbackData) external returns (euint64);
    function confidentialTransfer(address to, euint64 amount) external returns (euint64);
    function wrap(address to, uint256 amount) external returns (euint64);
    function setOperator(address operator, uint48 validUntil) external;
    function isOperator(address holder, address spender) external view returns (bool);
}

interface IUnderlyingUSDT {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract VelucumVaultV2 is ZamaEthereumConfig, Ownable, IERC7984Receiver {

    IConfidentialERC20 public immutable cUSDT;
    IUnderlyingUSDT public immutable underlyingUSDT;

    uint256 public collateralRatio = 70;
    uint256 public holderCount;
    uint256 public totalVaultDeposited;

    struct Holder {
        euint64 balance;
        euint64 yieldEarned;
        uint8   pool;
        bool    exists;
        uint256 depositedAt;
    }

    struct Loan {
        euint64 amount;
        bool    active;
        uint256 openedAt;
        uint256 plainAmount;
    }

    mapping(address => Holder)  private holders;
    mapping(address => Loan)    private loans;
    mapping(address => uint256) public userDeposited;

    event Deposited(address indexed holder, uint8 pool);
    event Withdrawn(address indexed holder);
    event LoanOpened(address indexed borrower);
    event LoanRepaid(address indexed borrower);

    constructor(address _cUSDT, address _underlyingUSDT) Ownable(msg.sender) {
        cUSDT = IConfidentialERC20(_cUSDT);
        underlyingUSDT = IUnderlyingUSDT(_underlyingUSDT);
    }

    function claimTestUSDT() external {
        underlyingUSDT.mint(msg.sender, 10_000 * 1e6);
    }

    function deposit(
        externalEuint64 encryptedAmount,
        bytes memory inputProof,
        uint8 pool,
        uint256 plainAmount
    ) external {
        require(pool >= 1 && pool <= 3, "Invalid pool");
        require(plainAmount > 0, "Amount must be > 0");
        bytes memory callbackData = abi.encode(msg.sender, pool, plainAmount);
        cUSDT.confidentialTransferAndCall(address(this), encryptedAmount, inputProof, callbackData);
    }

    // IERC7984Receiver callback — called by cUSDT after confidentialTransferAndCall
    function onConfidentialTransferReceived(
        address operator,
        address from,
        euint64 encryptedAmount,
        bytes calldata data
    ) external override returns (ebool) {
        require(msg.sender == address(cUSDT), "Only cUSDT");

        (address depositor, uint8 pool, uint256 plainAmount) = abi.decode(data, (address, uint8, uint256));

        // Grant vault ACL access to the incoming encrypted amount
        FHE.allowThis(encryptedAmount);

        if (!holders[depositor].exists) {
            holders[depositor] = Holder({
                balance:     encryptedAmount,
                yieldEarned: FHE.asEuint64(0),
                pool:        pool,
                exists:      true,
                depositedAt: block.number
            });
            holderCount++;
        } else {
            holders[depositor].balance = FHE.add(holders[depositor].balance, encryptedAmount);
            holders[depositor].pool    = pool;
        }

        FHE.allowThis(holders[depositor].balance);
        FHE.allow(holders[depositor].balance, depositor);
        FHE.allowThis(holders[depositor].yieldEarned);
        FHE.allow(holders[depositor].yieldEarned, depositor);

        userDeposited[depositor] += plainAmount;
        totalVaultDeposited += plainAmount;

        emit Deposited(depositor, pool);
        return FHE.asEbool(true);
    }

    function withdraw(
        externalEuint64 encryptedAmount,
        bytes memory inputProof,
        uint256 plainAmount
    ) external {
        require(holders[msg.sender].exists, "Not a holder");
        require(!loans[msg.sender].active, "Repay loan first");
        require(userDeposited[msg.sender] >= plainAmount, "Exceeds deposit");

        euint64 enc = FHE.fromExternal(encryptedAmount, inputProof);
        holders[msg.sender].balance = FHE.sub(holders[msg.sender].balance, enc);
        FHE.allowThis(holders[msg.sender].balance);
        FHE.allow(holders[msg.sender].balance, msg.sender);

        userDeposited[msg.sender] -= plainAmount;
        totalVaultDeposited -= plainAmount;

        cUSDT.confidentialTransfer(msg.sender, enc);
        emit Withdrawn(msg.sender);
    }

    function openLoan(
        externalEuint64 encryptedLoanAmt,
        bytes memory inputProof,
        uint256 plainLoanAmt
    ) external {
        require(holders[msg.sender].exists, "Not a holder");
        require(!loans[msg.sender].active, "Loan already open");
        require(plainLoanAmt <= userDeposited[msg.sender] * collateralRatio / 100, "Exceeds collateral limit");

        euint64 loanEnc   = FHE.fromExternal(encryptedLoanAmt, inputProof);
        euint64 maxBorrow = FHE.mul(holders[msg.sender].balance, FHE.asEuint64(uint64(collateralRatio)));
        ebool canBorrow   = FHE.le(loanEnc, maxBorrow);
        euint64 effective = FHE.select(canBorrow, loanEnc, FHE.asEuint64(0));

        loans[msg.sender] = Loan({ amount: effective, active: true, openedAt: block.number, plainAmount: plainLoanAmt });
        FHE.allowThis(loans[msg.sender].amount);
        FHE.allow(loans[msg.sender].amount, msg.sender);

        userDeposited[msg.sender] -= plainLoanAmt;
        totalVaultDeposited -= plainLoanAmt;

        cUSDT.confidentialTransfer(msg.sender, effective);
        emit LoanOpened(msg.sender);
    }

    function getMyBalance()  external view returns (euint64) { return holders[msg.sender].balance; }
    function getMyYield()    external view returns (euint64) { return holders[msg.sender].yieldEarned; }
    function getMyLoan()     external view returns (euint64) { return loans[msg.sender].amount; }
    function hasActiveLoan() external view returns (bool)    { return loans[msg.sender].active; }
    function isHolder(address a) external view returns (bool) { return holders[a].exists; }
    function getUserDeposited(address a) external view returns (uint256) { return userDeposited[a]; }
    function setCollateralRatio(uint256 r) external onlyOwner { require(r <= 90); collateralRatio = r; }

    function onTransferReceived(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return 0x88a7ca5c;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x88a7ca5c || interfaceId == 0x01ffc9a7;
    }
}
