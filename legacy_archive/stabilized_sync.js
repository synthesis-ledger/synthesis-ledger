import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function stabilizedSync() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function addRecipe(string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 1. Get current On-Chain state
    console.log("🔍 Fetching current registry state...");
    const onChainCids = new Set();
    for (let i = 0; i <= 20; i++) {
        try {
            const r = await contract.recipes(i);
            if (r[1]) onChainCids.add(r[1]);
        } catch (e) { break; }
    }

    // 2. Load Local Manifest
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const localManifest = JSON.parse(rawData);

    console.log(`\n🚀 STABILIZED BULK SYNC INITIATED...`);

    for (const recipe of localManifest) {
        if (onChainCids.has(recipe.cid)) {
            console.log(`⏭️  SKIP: ${recipe.outcome}`);
            continue;
        }

        console.log(`\n📡 ATTEMPTING: ${recipe.outcome}`);
        try {
            const bps = recipe.successBps || 8000; 
            
            // GET FRESH NONCE AND GAS
            const nonce = await provider.getTransactionCount(wallet.address, "latest");
            const feeData = await provider.getFeeData();

            const tx = await contract.addRecipe(
                recipe.outcome, 
                recipe.cid, 
                bps, 
                false, 
                { 
                    gasLimit: 500000,
                    nonce: nonce,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas * 2n // Tip for speed
                }
            );

            console.log(`⏳ Broadcasted: ${tx.hash}. Waiting for confirmation...`);
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`✅ CONFIRMED: ${recipe.outcome}`);
                onChainCids.add(recipe.cid);
            } else {
                console.error(`❌ REVERTED ON-CHAIN: ${recipe.outcome}`);
            }

            // Small delay to let the node state catch up
            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error(`❌ SCRIPT ERROR for ${recipe.outcome}: ${e.message}`);
            // If it's a gas/nonce issue, wait longer and retry the loop
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}
stabilizedSync();
