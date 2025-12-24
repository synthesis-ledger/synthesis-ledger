import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function diagnosticSeal(targetId, bpsValue) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🔍 DIAGNOSTIC SEAL FOR ID: ${targetId}`);
    
    try {
        const onChain = await contract.recipes(targetId);
        console.log(`- Outcome on Chain: "${onChain[0]}"`);
        console.log(`- CID on Chain:     "${onChain[1]}"`);
        console.log(`- Current BPS:      ${onChain[2]}`);

        console.log(`\n📡 Attempting Force-Update (BPS: ${bpsValue})...`);
        
        // We send the EXACT strings retrieved from the chain to avoid any mismatch
        const tx = await contract.updateRecipe(
            targetId, 
            onChain[0], 
            onChain[1], 
            bpsValue, 
            false, 
            { gasLimit: 400000 }
        );

        console.log(`⏳ TX Sent: ${tx.hash}. Waiting for confirmation...`);
        await tx.wait();
        console.log(`✅ SUCCESS! ID ${targetId} updated.`);

    } catch (e) {
        console.error(`❌ FAILED: ${e.reason || e.message}`);
        if (bpsValue > 100) {
            console.log("\n💡 Attempting fallback to 0-100 scale (sending 84 instead of 8440)...");
            return diagnosticSeal(targetId, 84);
        }
    }
}

diagnosticSeal(0, 8440);
