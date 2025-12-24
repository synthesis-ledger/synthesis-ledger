// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SynthesisRegistry.sol";

contract MainnetRegister is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddress = 0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c; 
        
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/genesis_onchain.json");
        
        // Read file and immediately convert to bytes to check for BOM
        bytes memory rawData = bytes(vm.readFile(path));
        
        // Strip UTF-8 BOM (0xEFBBBF) if present
        if (rawData.length >= 3 && rawData[0] == 0xEF && rawData[1] == 0xBB && rawData[2] == 0xBF) {
            bytes memory cleanData = new bytes(rawData.length - 3);
            for (uint i = 0; i < rawData.length - 3; i++) {
                cleanData[i] = rawData[i + 3];
            }
            rawData = cleanData;
        }
        
        string memory json = string(rawData);

        vm.startBroadcast(deployerPrivateKey);
        SynthesisRegistry registry = SynthesisRegistry(registryAddress);

        for (uint i = 0; i < 38; i++) {
            string memory key = string.concat("[", vm.toString(i), "]");
            
            // Standard JSON parsing
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
                SynthesisRegistry.RecipeType(0) 
            );
        }

        vm.stopBroadcast();
    }
}