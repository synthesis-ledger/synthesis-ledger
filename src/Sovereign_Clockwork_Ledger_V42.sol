// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Sovereign_Clockwork_Ledger_V42
 * @author Lars O. Horpestad | AI ThinkLab
 * @notice The "Granite Layer" of the Synthesis Ledger. 
 * @dev Enforces immutable $0.10 fees, bootstrap price discovery, and Arweave anchors.
 */

interface IPriceOracle {
    /** * @notice Returns price of 1 SYNL in USD with 8 decimals.
     * Example: $0.10 = 10,000,000
     */
    function getSynlPriceInUsd() external view returns (uint256);
}

interface ISYNLToken {
    function mintHuntReward(address to, bytes32 dataHash) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract Sovereign_Clockwork_Ledger_V42 is AccessControl {
    
    // --- ROLES & TIMERS ---
    bytes32 public constant GROWTH_CONTROLLER_ROLE = keccak256("GROWTH_CONTROLLER_ROLE");
    uint256 public immutable deploymentTimestamp;
    uint256 public constant TRANSITION_WINDOW = 90 days;

    // --- IMMUTABLE CONSTANTS ---
    address public immutable FOUNDER_VAULT;
    uint256 public constant CERTIFICATION_FEE_USD = 10; // $0.10 (scaled by 100 for precision)
    uint256 public constant BOOTSTRAP_FEE_SYNL = 1 * 10**18; // Default 1 SYNL if oracle is 0
    uint256 public constant BPS_FLOOR = 7800;

    // --- STATE VARIABLES ---
    address public oracleAddress;
    address public synlTokenAddress;

    // Arweave Logic Pointers (Community Upgradeable via Council)
    string public sovereignEngineArweaveId; 
    string public auditSweepArweaveId;      

    struct Atomic {
        string cid;
        address creator;
        uint256 bps;
        uint256 strikes;
        bool isObsolete;
    }

    mapping(string => Atomic) public registry;
    mapping(uint256 => string) public idToName; // 🔗 SDK BRIDGE: Maps numeric ID to Outcome Name
    mapping(bytes32 => bool) public executedHashes;
    mapping(address => address) public referrers;

    // --- EVENTS ---
    event CertificationIssued(string atomicId, bytes32 dataHash, uint256 feePaid);
    event LogicUpgraded(string target, string newArweaveId, address admin);
    event StrikeIssued(string atomicId, uint256 totalStrikes, uint256 newBps);

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
     * @notice Allows the SDK to record a pulse using a numeric ID.
     * @dev Admin bypasses fee for Genesis anchoring to prevent cold-start deadlock.
     */
    function recordPulse(uint256 id, uint256 bps, bytes32 certHash) external returns (bool) {
        string memory name = idToName[id];
        require(bytes(name).length > 0, "ID_NOT_REGISTERED");
        
        if (hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            // Genesis Bypass: Direct anchor for Admin
            executedHashes[certHash] = true;
            emit CertificationIssued(name, certHash, 0);
        } else {
            // Standard Path: Full fee logic
            executeAndCertify(name, certHash, address(0));
        }
        
        registry[name].bps = bps;
        return true;
    }

    // --- ARWEAVE ANCHORING & UPGRADES ---

    /**
     * @notice Community Council Upgrades
     * Allows the 90 Key Figures to update the AI logic pointers on Arweave.
     */
    function upgradeEternalLogic(string calldata _engineId, string calldata _sweepId) 
        external 
        onlyRole(GROWTH_CONTROLLER_ROLE) 
    {
        sovereignEngineArweaveId = _engineId;
        auditSweepArweaveId = _sweepId;
        emit LogicUpgraded("MASTER", _engineId, msg.sender);
    }

    // --- CORE EXECUTION ---

    function executeAndCertify(string memory _atomicId, bytes32 _dataHash, address _referrer) public {
        Atomic storage atomic = registry[_atomicId];
        require(!atomic.isObsolete, "Logic Obsolete: 3 Strikes reached");
        require(!executedHashes[_dataHash], "Double-Claim Prevention: Hash already used");
        
        uint256 synlRequired = calculateSynlFee();
        
        // --- THE SPLIT (Codified V25 Protocol) ---
        // 50% Founder [Permanent Royalty]
        _handleTransfer(msg.sender, FOUNDER_VAULT, (synlRequired * 50) / 100);
        
        // 10% Creator (Diverted to CAP if logic fails/obsolete)
        address creatorRecipient = (atomic.strikes >= 3) ? address(this) : atomic.creator;
        _handleTransfer(msg.sender, creatorRecipient, (synlRequired * 10) / 100);
        
        // 40% Community Audit Pool (CAP) & Referrals
        uint256 capAmount = (synlRequired * 40) / 100;
        address activeRef = referrers[msg.sender] != address(0) ? referrers[msg.sender] : _referrer;
        
        if (activeRef != address(0)) {
            if (referrers[msg.sender] == address(0)) referrers[msg.sender] = activeRef;
            _handleTransfer(msg.sender, activeRef, (synlRequired * 10) / 100);
            capAmount -= (synlRequired * 10) / 100;
        }

        // Remaining 30-40% stays in Ledger for AI Audit Costs
        _handleTransfer(msg.sender, address(this), capAmount);
        
        executedHashes[_dataHash] = true;
        
        // Check if token supports minting rewards
        try ISYNLToken(synlTokenAddress).mintHuntReward(msg.sender, _dataHash) {} catch {}

        emit CertificationIssued(_atomicId, _dataHash, synlRequired);
    }

    // --- HELPERS ---

    /**
     * @notice "Horpestad Standard" Price Discovery
     * Calculates SYNL fee based on $0.10 USD.
     * Fallback to 1 SYNL if oracle is unavailable or unpriced.
     */
    function calculateSynlFee() public view returns (uint256) {
        try IPriceOracle(oracleAddress).getSynlPriceInUsd() returns (uint256 synlPriceUsd) {
            if (synlPriceUsd == 0) return BOOTSTRAP_FEE_SYNL;
            // Fee = ($0.10 * 10^18) / Price_of_SYNL_in_USD
            return (CERTIFICATION_FEE_USD * 1e18) / synlPriceUsd;
        } catch {
            return BOOTSTRAP_FEE_SYNL; // Emergency hard-fallback
        }
    }

    function _handleTransfer(address _from, address _to, uint256 _amount) internal {
        if (_to == address(0) || _amount == 0) return;
        bool success = ISYNLToken(synlTokenAddress).transferFrom(_from, _to, _amount);
        require(success, "SYNL Transfer Failed");
    }

    /**
     * @notice Forensic Immune System
     * Triggered by Sentinel or Sweep logic to issue strikes for low BPS.
     */
    function issueStrike(string memory _atomicId, uint256 _newBps) external onlyRole(GROWTH_CONTROLLER_ROLE) {
        Atomic storage atomic = registry[_atomicId];
        atomic.bps = _newBps;

        if (_newBps < BPS_FLOOR) {
            atomic.strikes++;
            if (atomic.strikes >= 3) {
                atomic.isObsolete = true;
            }
        } else {
            // Self-Healing: Reset strikes if quality improves
            atomic.strikes = 0;
        }

        emit StrikeIssued(_atomicId, atomic.strikes, _newBps);
    }

    /**
     * @notice Emergency Oracle Update
     * Allows the Founder (90 days) or Council to update price feed source.
     */
    function updateOracle(address _newOracle) external onlyRole(GROWTH_CONTROLLER_ROLE) {
        oracleAddress = _newOracle;
    }

    function registerAtomic(uint256 _id, string calldata _name, string calldata _cid, address _creator) external onlyRole(GROWTH_CONTROLLER_ROLE) {
        registry[_name] = Atomic({
            cid: _cid,
            creator: _creator,
            bps: 10000, // 100% initial quality
            strikes: 0,
            isObsolete: false
        });
        idToName[_id] = _name;
    }
}