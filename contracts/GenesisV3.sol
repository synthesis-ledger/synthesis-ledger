// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
}

abstract contract AccessControl is Context {
    struct RoleData { mapping(address => bool) members; bytes32 adminRole; }
    mapping(bytes32 => RoleData) private _roles;
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, _msgSender()), "AccessControl: account is missing role");
        _;
    }

    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].members[account];
    }

    function _grantRole(bytes32 role, address account) internal virtual {
        if (!hasRole(role, account)) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account, _msgSender());
        }
    }
}

contract SynthesisGenesisV3 is AccessControl {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct Recipe {
        string outcome;
        string cid;
        uint256 bps;
        uint256 strikeCount;
        uint256 lastAuditTimestamp;
        bool active;
        bytes32 lastAuditHash;
    }

    mapping(uint256 => Recipe) public recipes;
    uint256 public nextId;
    uint256 public constant SLASH_FLOOR = 7800;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    function mintRecipe(string memory outcome, string memory cid, uint256 bps, bytes32 auditHash) public onlyRole(DEFAULT_ADMIN_ROLE) {
        recipes[nextId] = Recipe({
            outcome: outcome,
            cid: cid,
            bps: bps,
            strikeCount: 0,
            lastAuditTimestamp: block.timestamp,
            active: true,
            lastAuditHash: auditHash
        });
        nextId++;
    }

    function setBps(uint256 id, uint256 newBps, bytes32 auditHash) public onlyRole(AUDITOR_ROLE) {
        Recipe storage r = recipes[id];
        require(r.active, "Obsolete");
        require(block.timestamp >= r.lastAuditTimestamp + 6 days, "Cooldown active");
        if (newBps < SLASH_FLOOR) r.strikeCount++;
        r.bps = newBps;
        r.lastAuditTimestamp = block.timestamp;
        r.lastAuditHash = auditHash;
    }
}
