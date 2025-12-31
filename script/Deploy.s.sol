// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SYNL_Token_V42.sol";
import "../src/Sovereign_Clockwork_Ledger_V42.sol";

contract DeploySovereign is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address founderVault = 0x7CCd9095A505d9AD0ca104C7fEb981d08C05bfa4; 
        address oracleAddress = 0x000000000000000000000000000000000000dEaD;

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Token
        SYNL_Token_V42 token = new SYNL_Token_V42();
        
        // 2. Deploy Ledger (The 171-line version with recordPulse bridge)
        Sovereign_Clockwork_Ledger_V42 ledger = new Sovereign_Clockwork_Ledger_V42(
            founderVault,
            oracleAddress,
            address(token)
        );

        // 3. THE HANDSHAKE
        token.grantRole(token.LEDGER_ROLE(), address(ledger));

        // 4. PRE-REGISTER ID 93 (Links numeric ID to the name for the SDK)
        ledger.registerAtomic(
            93, 
            "A-CMO-PulseHarvester", 
            "ar://genesis-v2-logic", 
            deployer
        );

        vm.stopBroadcast();

        console.log("--------------------------------------------------");
        console.log("NEW_TOKEN_ADDRESS:", address(token));
        console.log("NEW_LEDGER_ADDRESS:", address(ledger));
        console.log("--------------------------------------------------");
    }
}