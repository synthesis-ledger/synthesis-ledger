// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SYNL_Token_V42: The Sovereign Pulse
 * @notice Enforces 1B cap, Genesis 90 Council, and automated distribution pipelines.
 */
contract SYNL_Token_V42 is ERC20, AccessControl {

    // --- CONSTANTS ---
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant GENESIS_WEEKLY_RELEASE = 30_757_333 * 10**18;
    uint256 public constant WEEK_DURATION = 7 days;
    uint256 public constant DECAY_BPS = 9800; // 2% weekly decay
    
    bytes32 public constant GROWTH_CONTROLLER_ROLE = keccak256("GROWTH_CONTROLLER_ROLE");
    bytes32 public constant LEDGER_ROLE = keccak256("LEDGER_ROLE");

    // --- STATE VARIABLES ---
    uint256 public immutable deploymentTimestamp;
    uint256 public constant TRANSITION_WINDOW = 90 days;
    
    uint256 public totalMinted;
    uint256 public lastResetTimestamp;
    uint256 public currentWeekMinted;

    // Genesis 90 Council
    mapping(address => bool) public isKeyFigure;
    uint256 public councilSize;
    mapping(address => uint256) public membershipVotes; // Simple tally for new members

    mapping(bytes32 => bool) public usedHashes;

    // --- EVENTS ---
    event KeyFigureAppointed(address indexed account);
    event KeyFigureProposed(address indexed candidate, address indexed proposer);
    event GrowthDistribution(address indexed controller, uint256 totalAmount, uint256 count);
    event HuntRewardMinted(address indexed hunter, bytes32 indexed dataHash, uint256 amount);

    constructor() ERC20("Synthesis Ledger", "SYNL") {
        deploymentTimestamp = block.timestamp;
        lastResetTimestamp = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GROWTH_CONTROLLER_ROLE, msg.sender);
        isKeyFigure[msg.sender] = true;
        councilSize = 1;
    }

    modifier withinTransitionWindow() {
        require(block.timestamp <= deploymentTimestamp + TRANSITION_WINDOW, "Manual transition window closed");
        _;
    }

    modifier onlyCouncil() {
        require(isKeyFigure[msg.sender], "Caller is not a Key Figure");
        _;
    }

    // --- GOVERNANCE: GENESIS 90 ---

    /**
     * @notice Founder-led appointment phase (First 90 Days)
     */
    function appointKeyFigure(address _account) external onlyRole(DEFAULT_ADMIN_ROLE) withinTransitionWindow {
        require(!isKeyFigure[_account], "Already a Key Figure");
        require(councilSize < 90, "Council limit reached");

        isKeyFigure[_account] = true;
        councilSize++;
        _grantRole(GROWTH_CONTROLLER_ROLE, _account);
        emit KeyFigureAppointed(_account);
    }

    /**
     * @notice Post-90 Day Council Voting
     * Simple safeguard: Requires 1/3 of council to agree for a new peer to enter.
     */
    function voteForNewMember(address _candidate) external onlyCouncil {
        require(block.timestamp > deploymentTimestamp + TRANSITION_WINDOW, "Voting starts after 90 days");
        require(!isKeyFigure[_candidate], "Already a member");
        
        membershipVotes[_candidate]++;
        
        if (membershipVotes[_candidate] >= (councilSize / 3) + 1) {
            isKeyFigure[_candidate] = true;
            councilSize++;
            _grantRole(GROWTH_CONTROLLER_ROLE, _candidate);
            emit KeyFigureAppointed(_candidate);
        }
    }

    // --- AUTOMATED DISTRIBUTION PIPELINE ---

    function distributeGrowth(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyCouncil
    {
        // Weekly reset logic remains unchanged
        if (block.timestamp >= lastResetTimestamp + WEEK_DURATION) {
            currentWeekMinted = 0;
            lastResetTimestamp = block.timestamp;
        }

        uint256 batchTotal = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            batchTotal += _amounts[i];
        }

        require(currentWeekMinted + batchTotal <= calculateWeeklyLimit(), "Exceeds weekly limit");
        currentWeekMinted += batchTotal;
        totalMinted += batchTotal;

        for (uint256 i = 0; i < _recipients.length; i++) {
            _mint(_recipients[i], _amounts[i]);
        }
        emit GrowthDistribution(msg.sender, batchTotal, _recipients.length);
    }

    function mintHuntReward(address _hunter, bytes32 _dataHash) external onlyRole(LEDGER_ROLE) {
        require(!usedHashes[_dataHash], "Hash already used");
        require(totalMinted + 1000 * 10**18 <= MAX_SUPPLY, "Supply cap reached");

        usedHashes[_dataHash] = true;
        totalMinted += 1000 * 10**18;
        _mint(_hunter, 1000 * 10**18);
        emit HuntRewardMinted(_hunter, _dataHash, 1000 * 10**18);
    }

    function calculateWeeklyLimit() public view returns (uint256) {
        uint256 weeksSinceStart = (block.timestamp - deploymentTimestamp) / WEEK_DURATION;
        uint256 limit = GENESIS_WEEKLY_RELEASE;
        for (uint256 i = 0; i < weeksSinceStart; i++) {
            limit = (limit * DECAY_BPS) / 10000;
        }
        return limit;
    }

    /**
     * @notice Final Burn: Renounce founder admin role.
     * After this, the contract is governed entirely by the Key Figures council.
     */
    function finalizeFounderTransition() external onlyRole(DEFAULT_ADMIN_ROLE) {
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}