// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
// V42 Imports
import "../src/Sovereign_Clockwork_Ledger_V42.sol";
import "../src/SYNL_Token_V42.sol";

contract RegistryTest is Test {
    // UPDATED: Use V42 Class Names
    Sovereign_Clockwork_Ledger_V42 public ledger;
    SYNL_Token_V42 public token;

    address public admin = address(1);
    address public architect = address(0xBAD);
    address public founderVault = 0x7CCd9095A505d9AD0ca104C7fEb981d08C05bfa4;

    function setUp() public {
        vm.startPrank(admin);
        // 1. Deploy V42 Token
        token = new SYNL_Token_V42(); 
        
        // 2. Deploy V42 Ledger
        // Note: Constructor now requires (vault, oracle, token)
        ledger = new Sovereign_Clockwork_Ledger_V42(founderVault, address(0), address(token));
        
        // 3. Grant the LEDGER_ROLE to the ledger contract if needed for rewards
        token.grantRole(keccak256("LEDGER_ROLE"), address(ledger));
        vm.stopPrank();
    }

    function test_FailWithoutApproval() public {
        vm.prank(architect);
        // The V42 Ledger requires an approval for the $0.10 fee before registerAtomic
        vm.expectRevert(); // Will fail because architect has 0 balance/approval
        ledger.registerAtomic(1, "test_logic", "ar://cid", architect);
    }

    function test_SuccessRegistration() public {
        // 1. Fund architect with SYNL from the admin (who holds the supply)
        vm.prank(admin);
        token.transfer(architect, 1000 * 1e18);

        vm.startPrank(architect);
        // 2. Approve the ledger to take the fee
        token.approve(address(ledger), 100 * 1e18);
        
        // 3. Register Atomic (V42 signature: id, name, cid, creator)
        ledger.registerAtomic(93, "A-CMO-PulseHarvester", "ar://genesis-cid", architect);
        vm.stopPrank();

        // 4. Verify state
        (string memory cid, , uint256 bps, , ) = ledger.registry("A-CMO-PulseHarvester");
        assertEq(cid, "ar://genesis-cid");
        assertEq(bps, 10000); // V42 starts at 100% quality
    }
}