// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Synthesis Genesis v2: The Immune System
 * @dev Implements weekly forensic audits, a 7800 BPS survival floor, 
 * and a 3-strike obsolescence rule for logic provenance.
 */
contract SynthesisGenesisV2 is AccessControl {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct Recipe {
        string outcome;
        string cid;
        uint256 bps;
        uint256 strikeCount;
        uint256 lastAuditTimestamp;
        bool active;
        bytes32 lastAuditHash; // The Keccak256 hash of the Grok-3 Forensic Debate
    }

    mapping(uint256 => Recipe) public recipes;
    uint256 public nextId;
    uint256 public constant SLASH_FLOOR = 7800;

    event AuditLogged(uint256 indexed id, uint256 newBps, uint256 strikes, bytes32 auditHash);
    event LogicObsolete(uint256 indexed id);
    event RecipeMinted(uint256 indexed id, string outcome, uint256 bps);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    /**
     * @dev Minting for the Genesis 38 and future community submissions.
     */
    function mintRecipe(string memory outcome, string memory cid, uint256 bps, bytes32 initialAuditHash) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        recipes[nextId] = Recipe({
            outcome: outcome,
            cid: cid,
            bps: bps,
            strikeCount: 0,
            lastAuditTimestamp: block.timestamp,
            active: true,
            lastAuditHash: initialAuditHash
        });
        
        emit RecipeMinted(nextId, outcome, bps);
        nextId++;
    }

    /**
     * @dev The weekly forensic audit call.
     * Reverts if the logic has reached 3 strikes or if called too frequently.
     */
    function setBps(uint256 id, uint256 newBps, bytes32 auditHash) 
        public 
        onlyRole(AUDITOR_ROLE) 
    {
        Recipe storage r = recipes[id];
        require(r.active, "Logic is obsolete");
        require(block.timestamp >= r.lastAuditTimestamp + 6 days, "Audit cycle: 1 week minimum");

        if (newBps < SLASH_FLOOR) {
            r.strikeCount++;
        } else {
            // Optional: Reset strikes on high-density recovery? 
            // Keeping them for now to enforce long-term stability.
        }

        r.bps = newBps;
        r.lastAuditTimestamp = block.timestamp;
        r.lastAuditHash = auditHash;

        emit AuditLogged(id, newBps, r.strikeCount, auditHash);

        if (r.strikeCount >= 3) {
            r.active = false;
            emit LogicObsolete(id);
        }
    }

    /**
     * @dev Treasury Management: Allows the owner to withdraw accumulated fees.
     */
    function withdrawTreasury() public onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    // Allow the contract to receive ETH for maintenance taxes/staking
    receive() external payable {}
}