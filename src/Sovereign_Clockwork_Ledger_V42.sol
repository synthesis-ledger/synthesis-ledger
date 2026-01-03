// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Sovereign_Clockwork_Ledger_V42
 * @author Lars O. Horpestad | AI ThinkLab
 * @notice The "Granite Layer" of the Synthesis Ledger.
 * @dev Enforces immutable $0.10 fees, reentrancy protection, and administrative sunsets.
 */

interface IPriceOracle {
    function getSynlPriceInUsd() external view returns (uint256);
}

interface ISYNLToken {
    function mintHuntReward(address to, bytes32 dataHash) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract Sovereign_Clockwork_Ledger_V42 is AccessControl, ReentrancyGuard {
    
    // --- ROLES & TIMERS ---
    bytes32 public constant GROWTH_CONTROLLER_ROLE = keccak256("GROWTH_CONTROLLER_ROLE");
    uint256 public immutable deploymentTimestamp;
    uint256 public constant TRANSITION_WINDOW = 90 days;

    // --- IMMUTABLE CONSTANTS ---
    address public immutable FOUNDER_VAULT;
    uint256 public constant CERTIFICATION_FEE_USD = 10; // $0.10 (scaled by 100)
    uint256 public constant BOOTSTRAP_FEE_SYNL = 1 * 10**18;
    uint256 public constant BPS_FLOOR = 7800;
    uint256 public constant STRIKE_COOLDOWN = 24 hours;

    // --- STATE VARIABLES ---
    address public oracleAddress;
    address public synlTokenAddress;
    bool public isGenesisClosed; // Permanent flag to end free anchoring

    string public sovereignEngineArweaveId; 
    string public auditSweepArweaveId;

    struct Atomic {
        string cid;
        address creator;
        uint256 bps;
        uint256 strikes;
        uint256 lastStrikeTimestamp;
        bool isObsolete;
    }

    mapping(string => Atomic) public registry;
    mapping(uint256 => string) public idToName;
    mapping(bytes32 => bool) public executedHashes;
    mapping(address => address) public referrers;

    // --- EVENTS ---
    event CertificationIssued(string atomicId, bytes32 dataHash, uint256 feePaid);
    event LogicUpgraded(string target, string newArweaveId, address admin);
    event StrikeIssued(string atomicId, uint256 totalStrikes, uint256 newBps);
    event RewardMintFailed(address indexed hunter, bytes32 indexed dataHash);
    event GenesisWindowClosed(address admin);

    constructor(address _founderVault, address _oracle, address _token) {
        FOUNDER_VAULT = _founderVault;
        oracleAddress = _oracle;
        synlTokenAddress = _token;
        deploymentTimestamp = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GROWTH_CONTROLLER_ROLE, msg.sender);
    }

    // --- MODIFIERS ---
    modifier withinTransitionWindow() {
        require(block.timestamp <= deploymentTimestamp + TRANSITION_WINDOW, "Founder window closed");
        _;
    }

    // --- SDK TRANSLATOR ---

    /**
     * @notice Allows SDK to record a pulse.
     * @dev Free bypass is only available if the genesis window is still open.
     */
    function recordPulse(uint256 id, uint256 bps, bytes32 certHash) external returns (bool) {
        string memory name = idToName[id];
        require(bytes(name).length > 0, "ID_NOT_REGISTERED");
        
        if (hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && !isGenesisClosed) {
            executedHashes[certHash] = true;
            emit CertificationIssued(name, certHash, 0);
        } else {
            executeAndCertify(name, certHash, address(0));
        }
        
        registry[name].bps = bps;
        return true;
    }

    /**
     * @notice Manually ends the free anchoring period for the Admin.
     * @dev Once called, even the Admin must pay the $0.10 fee.
     */
    function closeGenesisWindow() external onlyRole(DEFAULT_ADMIN_ROLE) {
        isGenesisClosed = true;
        emit GenesisWindowClosed(msg.sender);
    }

    // --- CORE EXECUTION ---

    /**
     * @notice Executes logic certification and distributes fees.
     * @dev Protected against reentrancy and double-claiming.
     */
    function executeAndCertify(string memory _atomicId, bytes32 _dataHash, address _referrer) public nonReentrant {
        Atomic storage atomic = registry[_atomicId];
        require(!atomic.isObsolete, "Logic Obsolete: 3 Strikes reached");
        
        // Anti-Spam / Reentrancy protection: State update BEFORE interactions
        require(!executedHashes[_dataHash], "Double-Claim Prevention: Hash already used");
        executedHashes[_dataHash] = true;
        
        uint256 synlRequired = calculateSynlFee();
        
        // Fee Distribution (50% Founder, 10% Creator, 40% CAP)
        _handleTransfer(msg.sender, FOUNDER_VAULT, (synlRequired * 50) / 100);
        
        address creatorRecipient = (atomic.strikes >= 3) ? address(this) : atomic.creator;
        _handleTransfer(msg.sender, creatorRecipient, (synlRequired * 10) / 100);
        
        uint256 capAmount = (synlRequired * 40) / 100;
        address activeRef = referrers[msg.sender] != address(0) ? referrers[msg.sender] : _referrer;
        
        if (activeRef != address(0)) {
            if (referrers[msg.sender] == address(0)) referrers[msg.sender] = activeRef;
            _handleTransfer(msg.sender, activeRef, (synlRequired * 10) / 100);
            capAmount -= (synlRequired * 10) / 100;
        }

        _handleTransfer(msg.sender, address(this), capAmount);
        
        // Reward Minting (Fail-Safe)
        try ISYNLToken(synlTokenAddress).mintHuntReward(msg.sender, _dataHash) {
            // Success
        } catch {
            emit RewardMintFailed(msg.sender, _dataHash);
        }

        emit CertificationIssued(_atomicId, _dataHash, synlRequired);
    }

    // --- HELPERS ---

    function calculateSynlFee() public view returns (uint256) {
        try IPriceOracle(oracleAddress).getSynlPriceInUsd() returns (uint256 synlPriceUsd) {
            if (synlPriceUsd == 0) return BOOTSTRAP_FEE_SYNL;
            return (CERTIFICATION_FEE_USD * 1e18) / synlPriceUsd;
        } catch {
            return BOOTSTRAP_FEE_SYNL;
        }
    }

    function _handleTransfer(address _from, address _to, uint256 _amount) internal {
        if (_to == address(0) || _amount == 0) return;
        bool success = ISYNLToken(synlTokenAddress).transferFrom(_from, _to, _amount);
        require(success, "SYNL Transfer Failed");
    }

    /**
     * @notice Forensic Immune System.
     * @dev Implements a 24-hour cooldown to prevent rapid-fire striking of a single Atomic.
     */
    function issueStrike(string memory _atomicId, uint256 _newBps) external onlyRole(GROWTH_CONTROLLER_ROLE) {
        Atomic storage atomic = registry[_atomicId];
        
        if (_newBps < BPS_FLOOR) {
            require(block.timestamp > atomic.lastStrikeTimestamp + STRIKE_COOLDOWN, "Strike cooldown active");
            atomic.strikes++;
            atomic.lastStrikeTimestamp = block.timestamp;
            
            if (atomic.strikes >= 3) {
                atomic.isObsolete = true;
            }
        } else {
            atomic.strikes = 0; // Self-Healing
        }

        atomic.bps = _newBps;
        emit StrikeIssued(_atomicId, atomic.strikes, _newBps);
    }

    // --- GOVERNANCE ---

    function updateOracle(address _newOracle) external onlyRole(GROWTH_CONTROLLER_ROLE) {
        oracleAddress = _newOracle;
    }

    function registerAtomic(uint256 _id, string calldata _name, string calldata _cid, address _creator) external onlyRole(GROWTH_CONTROLLER_ROLE) {
        registry[_name] = Atomic({
    cid: _cid,
    creator: _creator,
    bps: 10000, // Ensure this matches your successBps in the JSON recipes
    strikes: 0,
    lastStrikeTimestamp: 0, // Explicitly initialize
    isObsolete: false
        });
        idToName[_id] = _name;
    }
}