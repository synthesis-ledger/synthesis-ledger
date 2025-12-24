// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SynthesisRegistry.sol";
import "../src/SynapseToken.sol";

contract RegistryTest is Test {
    SynthesisRegistry public registry;
    SynapseToken public token;
    address public architect = address(0xBAD);
    address public treasury = address(0x666);

    function setUp() public {
        token = new SynapseToken(); // Mints 1B to 'this' (test contract)
        registry = new SynthesisRegistry(address(token), treasury);
    }

    function test_FailWithoutTokens() public {
        vm.prank(architect); // Act as an architect with 0 tokens
        vm.expectRevert("SYNL_GATE: INSUFFICIENT_BALANCE");
        registry.register("test_outcome", "ar://cid", 9500, 1500, SynthesisRegistry.RecipeType.ATOMIC);
    }

    function test_SuccessWithTokens() public {
        // 1. Fund the architect with enough to pass the gate (10k) and pay the fee (500)
        token.transfer(architect, 11000 * 1e18);

        vm.startPrank(architect);
        token.approve(address(registry), 500 * 1e18); // Approve the 500 $SYNL fee
        
        registry.register("hardened_logic", "ar://final", 9900, 1200, SynthesisRegistry.RecipeType.ATOMIC);
        vm.stopPrank();

        assertEq(token.balanceOf(treasury), 500 * 1e18); // Verify fee went to treasury
        assertEq(registry.nextId(), 1); // Verify logic was registered
    }
}