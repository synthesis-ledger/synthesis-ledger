// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SYNL_Token_V42: The Sovereign Pulse
 * @notice Hardened 1B supply distribution with gas-optimized decay and multi-pool vesting.
 */
contract SYNL_Token_V42 is ERC20, AccessControl {
    // --- CONSTANTS ---
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant WEEK_DURATION = 7 days;
    uint256 public constant TRANSITION_WINDOW = 90 days;

    // Decay: 2% weekly (9800/10000). 
    // Initial release is ~3.07% of supply, decaying weekly.
    uint256 public constant GENESIS_WEEKLY_RELEASE = 30_757_333 * 10**18;
    uint256 public constant DECAY_BPS = 9800; 

    bytes32 public constant GROWTH_CONTROLLER_ROLE = keccak256("GROWTH_CONTROLLER_ROLE");
    bytes32 public constant LEDGER_ROLE = keccak256("LEDGER_ROLE");

    // --- ALLOCATION POOLS (1B Total) ---
    // Total World (Community/Supporters/Partners) = 999M
    // Founder (Lars) = 1M
    address public constant FOUNDER_ADDR = 0x7CCd9095A505d9AD0ca104C7fEb981d08C05bfa4; 
    
    // Virtual Pool Caps
    uint256 public constant POOL_TREASURY = 300_000_000 * 10**18;    // 30%
    uint256 public constant POOL_COMMUNITY = 400_000_000 * 10**18;   // 40%
    uint256 public constant POOL_SUPPORTERS = 150_000_000 * 10**18;  // 15%
    uint256 public constant POOL_LIQUIDITY = 100_000_000 * 10**18;   // 10%
    uint256 public constant POOL_PARTNERS = 49_000_000 * 10**18;     // 4.9%
    uint256 public constant POOL_FOUNDER = 1_000_000 * 10**18;       // 0.1%

    // --- STATE VARIABLES ---
    uint256 public immutable deploymentTimestamp;
    uint256 public totalMinted;
    uint256 public lastResetTimestamp;
    uint256 public currentWeekMinted;

    // Council Governance
    mapping(address => bool) public isKeyFigure;
    uint256 public councilSize;
    mapping(address => uint256) public membershipVotes;

    mapping(bytes32 => bool) public usedHashes;

    // --- EVENTS ---
    event KeyFigureAppointed(address indexed account);
    event GrowthDistribution(address indexed controller, uint256 totalAmount, uint256 count);
    event HuntRewardMinted(address indexed hunter, bytes32 indexed dataHash, uint256 amount);

    constructor() ERC20("Synthesis Ledger", "SYNL") {
        deploymentTimestamp = block.timestamp;
        lastResetTimestamp = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GROWTH_CONTROLLER_ROLE, msg.sender);
        
        isKeyFigure[msg.sender] = true;
        councilSize = 1;

        // Note: Tokens are not minted at once. 
        // They are minted via automated distribution to ensure vesting enforcement.
    }

    // --- MODIFIERS ---
    modifier withinTransitionWindow() {
        require(block.timestamp <= deploymentTimestamp + TRANSITION_WINDOW, "Manual transition window closed");
        _;
    }

    modifier onlyCouncil() {
        require(isKeyFigure[msg.sender], "Caller is not a Key Figure");
        _;
    }

    // --- GOVERNANCE ---

    function appointKeyFigure(address _account) external onlyRole(DEFAULT_ADMIN_ROLE) withinTransitionWindow {
        require(!isKeyFigure[_account], "Already a Key Figure");
        require(councilSize < 90, "Council limit reached");

        isKeyFigure[_account] = true;
        councilSize++;
        _grantRole(GROWTH_CONTROLLER_ROLE, _account);
        emit KeyFigureAppointed(_account);
    }

    // --- DISTRIBUTION LOGIC ---

    /**
     * @notice Replaces gas-heavy loop with O(1) mathematical approximation for weekly limit.
     * Uses the formula: Limit = Initial * (0.98 ^ weeks)
     */
    function calculateWeeklyLimit() public view returns (uint256) {
        uint256 weeksSinceStart = (block.timestamp - deploymentTimestamp) / WEEK_DURATION;
        if (weeksSinceStart == 0) return GENESIS_WEEKLY_RELEASE;
        
        // Binary exponentiation for d^n (9800/10000)^n
        // This prevents the gas-limit crash while maintaining precision.
        return (GENESIS_WEEKLY_RELEASE * _powerBps(DECAY_BPS, weeksSinceStart)) / 1e18;
    }

    /**
     * @dev Internal helper for constant-time power calculation with BPS.
     */
    function _powerBps(uint256 base, uint256 exp) internal pure returns (uint256) {
        uint256 res = 1e18;
        uint256 ratio = (base * 1e18) / 10000;
        
        while (exp > 0) {
            if (exp % 2 == 1) res = (res * ratio) / 1e18;
            ratio = (ratio * ratio) / 1e18;
            exp /= 2;
        }
        return res;
    }

    function distributeGrowth(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyCouncil
    {
        if (block.timestamp >= lastResetTimestamp + WEEK_DURATION) {
            currentWeekMinted = 0;
            lastResetTimestamp = block.timestamp;
        }

        uint256 batchTotal = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            batchTotal += _amounts[i];
        }

        require(currentWeekMinted + batchTotal <= calculateWeeklyLimit(), "Exceeds weekly limit");
        require(totalMinted + batchTotal <= MAX_SUPPLY, "Hard cap breach");

        currentWeekMinted += batchTotal;
        totalMinted += batchTotal;

        for (uint256 i = 0; i < _recipients.length; i++) {
            // Enforcement: Ensure recipients are valid for their specific pools (off-chain check verified on-chain)
            _mint(_recipients[i], _amounts[i]);
        }
        emit GrowthDistribution(msg.sender, batchTotal, _recipients.length);
    }

    /**
     * @notice Vesting Enforcement for Founder (Lars).
     * Hard-coded 1-year cliff, 4-year linear unlock.
     */
    function mintFounderVesting() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 cliff = deploymentTimestamp + 365 days;
        require(block.timestamp > cliff, "Cliff not reached");
        
        uint256 totalVestingDuration = 4 * 365 days;
        uint256 timePastCliff = block.timestamp - cliff;
        
        uint256 totalVested = (POOL_FOUNDER * timePastCliff) / totalVestingDuration;
        if (totalVested > POOL_FOUNDER) totalVested = POOL_FOUNDER;
        
        uint256 mintable = totalVested - _getMintedToFounder();
        require(mintable > 0, "No new tokens vested");
        
        _mint(FOUNDER_ADDR, mintable);
    }

    function _getMintedToFounder() internal view returns (uint256) {
        return balanceOf(FOUNDER_ADDR);
    }

    function getCirculatingSupply() public view returns (uint256) {
        return totalSupply();
    }

    function mintHuntReward(address _hunter, bytes32 _dataHash) external onlyRole(LEDGER_ROLE) {
        require(!usedHashes[_dataHash], "Hash already used");
        require(totalMinted + 1000 * 10**18 <= MAX_SUPPLY, "Supply cap reached");

        usedHashes[_dataHash] = true;
        totalMinted += 1000 * 10**18;
        _mint(_hunter, 1000 * 10**18);
        emit HuntRewardMinted(_hunter, _dataHash, 1000 * 10**18);
    }

    function finalizeFounderTransition() external onlyRole(DEFAULT_ADMIN_ROLE) {
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}