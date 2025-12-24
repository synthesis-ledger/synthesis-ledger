import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function sealWithByteMatch(targetId, newBps) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🔗 INITIATING BYTE-MATCH SEAL FOR ID: ${targetId}`);

    try {
        // 1. Capture exact state from Blockchain
        const onChain = await contract.recipes(targetId);
        const onChainOutcome = onChain[0];
        const onChainCid = onChain[1];
        const isGolden = onChain[3];

        console.log(`- Exact Outcome: "${onChainOutcome}"`);
        console.log(`- Exact CID:     "${onChainCid}"`);
        console.log(`- New BPS Target: ${newBps}`);

        if (isGolden) {
            console.error("❌ REVERT PREVENTED: Record is Golden (Locked).");
            return;
        }

        // 2. Fetch the latest nonce to prevent the 'nonce too low' error
        const nonce = await provider.getTransactionCount(wallet.address, "latest");

        // 3. Push update with manual gas and exact strings
        console.log(`\n📡 Broadcasting transaction (Nonce: ${nonce})...`);
        const tx = await contract.updateRecipe(
            targetId, 
            onChainOutcome, 
            onChainCid, 
            newBps, 
            false, 
            { 
                gasLimit: 500000,
                nonce: nonce 
            }
        );

        console.log(`⏳ TX SENT: ${tx.hash}`);
        await tx.wait();
        console.log(`\n✅ SUCCESS: ID ${targetId} is now sealed at ${newBps} BPS.`);

    } catch (e) {
        console.error(`\n❌ CRITICAL FAILURE: ${e.message}`);
        console.log("\nIf this still reverts, the contract logic likely RESTRICTS updates to only specific fields or requires a specific 'Role' your wallet may lack.");
    }
}

// Sealing the PrecedentCheck result
sealWithByteMatch(0, 8440);
