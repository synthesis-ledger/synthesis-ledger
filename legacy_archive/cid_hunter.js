import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c";

async function runCidHunt() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 bps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // Load Local manifest
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const localManifest = JSON.parse(rawData);

    console.log(`\n🛰️  STARTING GLOBAL CID SCAN (IDs 0-39)...`);

    for (let i = 0; i <= 39; i++) {
        try {
            const onChain = await contract.recipes(i);
            const onChainCid = onChain[1];
            
            if (!onChainCid) continue; // Skip empty slots

            // Search local manifest for this specific CID
            const match = localManifest.find(r => r.cid === onChainCid);

            if (match) {
                console.log(`\n🎯 MATCH FOUND | Blockchain ID: ${i} <==> Local Outcome: ${match.outcome}`);
                console.log(`   CID: ${onChainCid}`);
                
                // If this is the one we just audited (A-HC-PathValidator), we seal it.
                if (match.outcome === "A-HC-PathValidator") {
                    console.log(`   🚀 SEALING AUDITED BPS: 8180...`);
                    const tx = await contract.updateRecipe(i, onChain[0], onChain[1], 8180, false, { gasLimit: 300000 });
                    await tx.wait();
                    console.log(`   ✅ SUCCESS: ID ${i} permanently sealed with forensic score.`);
                }
            } else {
                console.log(`   [Slot ${i}] CID ${onChainCid} not found in local manifest.`);
            }
        } catch (e) {
            // Handle empty or uninitialized slots
        }
    }
    console.log(`\n🏁 Scan Complete.`);
}

runCidHunt();
