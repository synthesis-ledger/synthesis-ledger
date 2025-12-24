import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function bulkSync() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function addRecipe(string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 1. Get current On-Chain state to avoid duplicates
    const onChainCids = new Set();
    for (let i = 0; i <= 10; i++) { // Check existing range
        try {
            const r = await contract.recipes(i);
            if (r[1]) onChainCids.add(r[1]);
        } catch (e) { break; }
    }

    // 2. Load Local Manifest
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const localManifest = JSON.parse(rawData);

    console.log(`\n🚀 INITIATING BULK SYNC TO V2.0 ANCHOR...`);

    for (const recipe of localManifest) {
        if (onChainCids.has(recipe.cid)) {
            console.log(`⏭️  SKIPPING (Already On-Chain): ${recipe.outcome}`);
            continue;
        }

        console.log(`📡 REGISTERING: ${recipe.outcome}...`);
        try {
            // Defaulting to 8000 BPS if no audit score exists yet
            const bps = recipe.successBps || 8000; 
            const tx = await contract.addRecipe(recipe.outcome, recipe.cid, bps, false, { gasLimit: 300000 });
            console.log(`⏳ TX: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ SUCCESS.`);
            onChainCids.add(recipe.cid); // Track for this session
        } catch (e) {
            console.error(`❌ FAILED: ${recipe.outcome} - ${e.message}`);
        }
    }
    console.log("\n🏁 BULK SYNC COMPLETE.");
}
bulkSync();
