// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SynapseToken.sol";
import "../src/SynthesisRegistry.sol";

contract DeploySynthesis is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Token (Mints 1 Billion $SYNL to you)
        SynapseToken token = new SynapseToken();
        console.log("SynapseToken deployed to:", address(token));

        // 2. Deploy Registry (Linked to Token and Treasury)
        SynthesisRegistry registry = new SynthesisRegistry(address(token), deployerAddress);
        console.log("SynthesisRegistry deployed to:", address(registry));

        // 3. Approve Registry to spend $SYNL (if needed for registration)
        token.approve(address(registry), 1_000_000_000 * 10**18);

        // 4. Load and Sanitize genesis_onchain.json
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/genesis_onchain.json");
        
        bytes memory rawData = bytes(vm.readFile(path));
        
        // Strip UTF-8 BOM (0xEFBBBF) if present (Fixes "expected value at line 1")
        if (rawData.length >= 3 && rawData[0] == 0xEF && rawData[1] == 0xBB && rawData[2] == 0xBF) {
            bytes memory cleanData = new bytes(rawData.length - 3);
            for (uint i = 0; i < rawData.length - 3; i++) {
                cleanData[i] = rawData[i + 3];
            }
            rawData = cleanData;
        }
        
        string memory json = string(rawData);

        // 5. Register first 38 Recipes
        for (uint i = 0; i < 38; i++) {
            string memory key = string.concat("[", vm.toString(i), "]");
            
            string memory outcome = vm.parseJsonString(json, string.concat(key, ".outcome"));
            string memory cid = vm.parseJsonString(json, string.concat(key, ".cid"));
            uint256 successBps = vm.parseJsonUint(json, string.concat(key, ".successBps"));
            uint256 costUsd = vm.parseJsonUint(json, string.concat(key, ".costUsd"));

            console.log("Registering:", outcome);
            
            registry.register(
                outcome, 
                cid, 
                successBps, 
                costUsd, 
                SynthesisRegistry.RecipeType(0) // 0 for Genesis
            );
        }

        vm.stopBroadcast();

        console.log("--- DEPLOYMENT SUCCESSFUL ---");
        console.log("Final Registry Address:", address(registry));
        console.log("Final Token Address:", address(token));
    }
}