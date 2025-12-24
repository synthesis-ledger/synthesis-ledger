// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISYNL {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SynthesisRegistry {
    enum RecipeType { ATOMIC, COMPOSITE }

    struct Recipe {
        string outcome;
        string cid;
        uint256 successBps;
        uint256 costUsd;
        address author;
        bool isGolden;
        RecipeType rType;
    }

    ISYNL public immutable synlToken;
    address public immutable treasury;
    uint256 public nextId;
    bool public paused;
    
    uint256 public constant MIN_TOKEN_GATE = 10000 * 1e18; 
    uint256 public constant REGISTRATION_FEE = 500 * 1e18;

    mapping(uint256 => Recipe) public recipes;

    constructor(address _token, address _treasury) {
        synlToken = ISYNL(_token);
        treasury = _treasury;
    }

    function register(
        string memory _outcome,
        string memory _cid,
        uint256 _successBps,
        uint256 _costUsd,
        RecipeType _rType
    ) public {
        require(!paused, "PAUSED");
        require(synlToken.balanceOf(msg.sender) >= MIN_TOKEN_GATE, "GATE_LOCKED");
        require(synlToken.transferFrom(msg.sender, treasury, REGISTRATION_FEE), "FEE_FAIL");

        recipes[nextId] = Recipe({
            outcome: _outcome,
            cid: _cid,
            successBps: _successBps,
            costUsd: _costUsd,
            author: msg.sender,
            isGolden: false,
            rType: _rType
        });
        nextId++;
    }
}