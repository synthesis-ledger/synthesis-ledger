// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SYNL_Token_V42
 * @author Lars O. Horpestad
 * @notice The sovereign currency of the Synthesis Ledger.
 * @dev Enforces 1B cap, weekly 2% decay, and unique utility-based minting.
 */
contract SYNL_Token_V42 is ERC20, Ownable {

    // --- CONSTANTS ---
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant GENESIS_WEEKLY_RELEASE = 30_757_333 * 10**18; // Exact for 1B total over 52 weeks
    uint256 public constant WEEK_DURATION = 7 days;
    uint256 public constant DECAY_BPS = 9800; // 98.00% (2% decay)
    uint256 public constant MAX_REWARD_PER_HASH = 1_000 * 10**18;

    // --- STATE VARIABLES ---
    address public ledgerAddress;
    uint256 public genesisTimestamp;
    uint256 public totalMinted;
    uint256 public rolloverVault; // Unclaimed tokens reservoir

    mapping(bytes32 => bool) public usedHashes;
    mapping(uint256 => uint256) public tokensClaimedInWeek;

    // --- EVENTS ---
    event HuntRewardMinted(address indexed hunter, bytes32 indexed dataHash, uint256 amount);
    event RolloverAdded(uint256 amount);

    constructor() ERC20("Synthesis Ledger", "SYNL") Ownable(msg.sender) {
        genesisTimestamp = block.timestamp;
    }

    /**
     * @notice Sets the Master Ledger address. Only callable once.
     */
    function setLedger(address _ledger) external onlyOwner {
        require(ledgerAddress == address(0), "Ledger already set");
        ledgerAddress = _ledger;
    }

    /**
     * @notice Mints $SYNL rewards based on unique utility hashes.
     * @dev Called exclusively by the Sovereign_Clockwork_Ledger_V42.
     */
    function mintHuntReward(address _hunter, bytes32 _dataHash) external {
        require(msg.sender == ledgerAddress, "Only Ledger can trigger mint");
        require(!usedHashes[_dataHash], "Hash already utilized");
        require(totalMinted < MAX_SUPPLY, "Hunt complete: 1B supply reached");

        uint256 currentWeek = (block.timestamp - genesisTimestamp) / WEEK_DURATION;
        uint256 weeklyLimit = calculateWeeklyLimit(currentWeek);
        
        // Anti-Whale Ceiling logic
        uint256 rewardAmount = MAX_REWARD_PER_HASH;

        // Ensure we don't exceed weekly limit or max supply
        if (tokensClaimedInWeek[currentWeek] + rewardAmount > weeklyLimit) {
            rewardAmount = weeklyLimit > tokensClaimedInWeek[currentWeek] ? 
                           weeklyLimit - tokensClaimedInWeek[currentWeek] : 0;
        }

        if (totalMinted + rewardAmount > MAX_SUPPLY) {
            rewardAmount = MAX_SUPPLY - totalMinted;
        }

        require(rewardAmount > 0, "Weekly pool exhausted or supply cap reached");

        usedHashes[_dataHash] = true;
        tokensClaimedInWeek[currentWeek] += rewardAmount;
        totalMinted += rewardAmount;

        _mint(_hunter, rewardAmount);
        
        emit HuntRewardMinted(_hunter, _dataHash, rewardAmount);
    }

    /**
     * @notice Calculates the token limit for a given week based on 2% decay.
     */
    function calculateWeeklyLimit(uint256 _week) public pure returns (uint256) {
        uint256 limit = GENESIS_WEEKLY_RELEASE;
        for (uint256 i = 0; i < _week; i++) {
            limit = (limit * DECAY_BPS) / 10000;
        }
        return limit;
    }

    /**
     * @notice Allows the founder to burn the admin keys, making the token fully autonomous.
     */
    function burnAdminKeys() external onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @notice Internal rollover logic for tokens not claimed in a previous week.
     * @dev These roll into the "Long Hunt" vault to extend protocol life.
     */
    function processRollover(uint256 _pastWeek) external {
        uint256 limit = calculateWeeklyLimit(_pastWeek);
        if (tokensClaimedInWeek[_pastWeek] < limit) {
            uint256 diff = limit - tokensClaimedInWeek[_pastWeek];
            rolloverVault += diff;
            emit RolloverAdded(diff);
        }
    }
}