import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function injectNewRecipe() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // ABI for V2.0 Anchor
    const abi = [
        "function addRecipe(string outcome, string cid, uint256 successBps, bool golden) external",
        "function recipeCount() view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🚀 INJECTING GENESIS ATOMIC TO V2.0 ANCHOR...`);

    try {
        // 1. Get the latest audit data for PathValidator from your manifest
        let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
        if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
        const recipe = JSON.parse(rawData).find(r => r.outcome === "A-HC-PathValidator");
        
        // Use the forensic BPS we just calculated (8720)
        const finalBps = 8720; 

        console.log(`- Outcome: ${recipe.outcome}`);
        console.log(`- CID:     ${recipe.cid}`);
        console.log(`- BPS:     ${finalBps}`);

        // 2. Push as a NEW recipe
        console.log(`\n📡 Broadcasting 'addRecipe'...`);
        const tx = await contract.addRecipe(
            recipe.outcome,
            recipe.cid,
            finalBps,
            false // Not golden yet, allowing future forensic updates
        );

        console.log(`⏳ TX Sent: ${tx.hash}`);
        await tx.wait();
        console.log(`\n✅ SUCCESS: A-HC-PathValidator is now live on the V2.0 Anchor.`);

    } catch (e) {
        console.error(`\n❌ INJECTION FAILED`);
        console.error("Reason:", e.message);
        console.log("\n💡 If 'addRecipe' is not the function name, we need to check the contract's verified source or bytecode.");
    }
}

injectNewRecipe();
