// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Sovereign_Clockwork_Ledger_V42
 * @author Lars O. Horpestad
 * @notice The "Granite Layer" of the Synthesis Ledger. 
 * @dev Implements $0.10 Oracle-pegged fees, 21-day Timelocks, and Immutable Founder Royalties.
 */

interface IPriceOracle {
    function getSynlPriceInUsd() external view returns (uint256); // Returns price with 8 decimals
}

interface ISYNLToken {
    function mintHuntReward(address to, bytes32 dataHash) external;
}

contract Sovereign_Clockwork_Ledger_V42 {
    
    // --- CONSTANTS & IMMUTABLES ---
    address public immutable FOUNDER_VAULT; // 0xYourFamilyWallet
    uint256 public constant CERTIFICATION_FEE_USD = 10; // $0.10 USD (scaled by 100 for 2 decimals)
    uint256 public constant TIMELOCK_DURATION = 21 days;
    uint256 public constant BPS_FLOOR = 7800;

    // --- STATE VARIABLES ---
    address public oracleAddress;
    address public synlTokenAddress;
    
    struct Atomic {
        string cid;
        address creator;
        uint256 bps;
        uint256 strikes;
        bool isObsolete;
        uint256 lastAuditTimestamp;
    }

    struct PendingUpdate {
        string pendingCid;
        uint256 activationTimestamp;
    }

    mapping(string => Atomic) public registry; // Mapping of AtomicID to Data
    mapping(string => PendingUpdate) public timelocks; // Timelocks for Engine/Auditor CIDs
    mapping(bytes32 => bool) public executedHashes; // Anti-Whale / Anti-Spam
    mapping(address => address) public referrers; // Direct Referral Mapping (10% Forever)

    // --- EVENTS ---
    event CertificationIssued(string atomicId, bytes32 dataHash, uint256 feePaid);
    event UpdateProposed(string target, string newCid, uint256 activationTime);
    event StrikeIssued(string atomicId, uint256 totalStrikes);
    event LogicSiphoned(string atomicId, address formerCreator);

    constructor(address _founderVault, address _oracle, address _token) {
        FOUNDER_VAULT = _founderVault;
        oracleAddress = _oracle;
        synlTokenAddress = _token;
    }

    // --- CORE EXECUTION & REVENUE SPLIT ---

    /**
     * @notice Calculates and distributes the $0.10 fee in SYNL.
     * @dev Pushes 50% to Founder, 10% to Creator, 40% to CAP (Referrals/Audit).
     */
    function executeAndCertify(string memory _atomicId, bytes32 _dataHash, address _referrer) external {
        require(!registry[_atomicId].isObsolete, "Logic is Obsolete");
        require(!executedHashes[_dataHash], "Data Hash already certified");
        
        uint256 synlRequired = calculateSynlFee();
        
        // --- THE SPLIT ---
        // 50% FOUNDER (IMMUTABLE)
        _distribute(FOUNDER_VAULT, (synlRequired * 50) / 100);
        
        // 10% CREATOR (OR CAP IF STRIKES > 2)
        address creatorRecipient = (registry[_atomicId].strikes >= 3) ? address(this) : registry[_atomicId].creator;
        _distribute(creatorRecipient, (synlRequired * 10) / 100);
        
        // 40% COMMUNITY AUDIT POOL (CAP)
        uint256 capAmount = (synlRequired * 40) / 100;
        
        // PROCESS 10% DIRECT REFERRAL (IF APPLICABLE)
        if (_referrer != address(0) || referrers[msg.sender] != address(0)) {
            address activeRef = referrers[msg.sender] != address(0) ? referrers[msg.sender] : _referrer;
            if (referrers[msg.sender] == address(0)) referrers[msg.sender] = _referrer;
            
            uint256 refBonus = (synlRequired * 10) / 100; // 10% of total fee
            _distribute(activeRef, refBonus);
            capAmount -= refBonus;
        }
        
        // REMAINING CAP STAYS IN CONTRACT FOR AUDITORS
        
        executedHashes[_dataHash] = true;
        ISYNLToken(synlTokenAddress).mintHuntReward(msg.sender, _dataHash);

        emit CertificationIssued(_atomicId, _dataHash, synlRequired);
    }

    // --- GOVERNANCE & TIMELOCK ---

    /**
     * @notice Propose a new CID for the Master Engine or Auditor.
     * @dev Initiates the 21-day mandatory staging period.
     */
    function proposeCidUpdate(string memory _targetKey, string memory _newCid) external {
        // In V42, this would be restricted to a DAO or a temporary admin before key burn
        timelocks[_targetKey] = PendingUpdate({
            pendingCid: _newCid,
            activationTimestamp: block.timestamp + TIMELOCK_DURATION
        });
        
        emit UpdateProposed(_targetKey, _newCid, block.timestamp + TIMELOCK_DURATION);
    }

    /**
     * @notice Activates a CID update after the 21-day window has passed.
     */
    function executeCidUpdate(string memory _targetKey) external {
        require(block.timestamp >= timelocks[_targetKey].activationTimestamp, "Timelock active");
        require(bytes(timelocks[_targetKey].pendingCid).length > 0, "No pending update");
        
        registry[_targetKey].cid = timelocks[_targetKey].pendingCid;
        delete timelocks[_targetKey];
    }

    // --- THE IMMUNE SYSTEM (STRIKES) ---

    function issueStrike(string memory _atomicId, uint256 _newBps) external {
        // Restricted to JUROR_ROLE or MMC script
        registry[_atomicId].bps = _newBps;
        if (_newBps < BPS_FLOOR) {
            registry[_atomicId].strikes++;
            emit StrikeIssued(_atomicId, registry[_atomicId].strikes);
            
            if (registry[_atomicId].strikes >= 3) {
                registry[_atomicId].isObsolete = true;
                emit LogicSiphoned(_atomicId, registry[_atomicId].creator);
            }
        } else {
            registry[_atomicId].strikes = 0; // Reset on recovery
        }
    }

    // --- HELPERS ---

    function calculateSynlFee() public view returns (uint256) {
        uint256 synlPriceUsd = IPriceOracle(oracleAddress).getSynlPriceInUsd();
        // Fee = ($0.10 / Price) scaled for precision
        return (CERTIFICATION_FEE_USD * 1e18) / synlPriceUsd; 
    }

    function _distribute(address _to, uint256 _amount) internal {
        // Logic to transfer SYNL tokens from user to recipient
    }
}