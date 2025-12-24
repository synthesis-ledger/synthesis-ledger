import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function forceSealV2(targetId, newBps) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n⚖️  FORCE SEALING ID ${targetId} ON V2.0 ANCHOR...`);

    try {
        // 1. Capture exact on-chain strings to prevent mismatch reverts
        const current = await contract.recipes(targetId);
        const outcome = current[0];
        const cid = current[1];

        console.log(`- Detected Outcome: "${outcome}"`);
        console.log(`- Detected CID:     "${cid}"`);
        console.log(`- Applying BPS:      ${newBps}`);

        // 2. Refresh Nonce
        const nonce = await provider.getTransactionCount(wallet.address, "latest");

        // 3. The Execution
        const tx = await contract.updateRecipe(
            targetId, 
            outcome, 
            cid, 
            newBps, 
            false, 
            { 
                gasLimit: 600000,
                nonce: nonce 
            }
        );

        console.log(`⏳ TX Broadcast: ${tx.hash}`);
        await tx.wait();
        console.log(`\n✅ SUCCESS: ID ${targetId} is now officially sealed.`);

    } catch (e) {
        console.error(`\n❌ REVERTED AGAIN`);
        console.error("Reason:", e.message);
        console.log("\n💡 Possible Cause: If the BPS is already set or the record is Golden, updates are blocked.");
    }
}

// Targeting ID 0 first (The first duplicate)
forceSealV2(0, 8440);
