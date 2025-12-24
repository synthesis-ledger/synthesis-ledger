import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c";

async function runCidSafeSeal(targetId, finalBps) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 bps, bool golden) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 1. Load Local Spec
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const localRecipe = JSON.parse(rawData).find(r => r.id === targetId);

    console.log(`\n🛡️  CID-SAFE CHECK FOR ID ${targetId}...`);
    
    try {
        // 2. Cross-reference with Blockchain
        const onChain = await contract.recipes(targetId);
        
        console.log(`Local CID:    ${localRecipe.cid}`);
        console.log(`On-Chain CID: ${onChain[1]}`);

        if (localRecipe.cid !== onChain[1]) {
            console.error("\n❌ SAFETY REJECTION: CID Mismatch!");
            console.error(`Your local file thinks ID ${targetId} is ${localRecipe.outcome}.`);
            console.error(`The Blockchain says ID ${targetId} is ${onChain[0]}.`);
            console.error("Aborting to prevent data corruption.");
            return;
        }

        // 3. Execution (If CIDs match)
        console.log(`\n✅ CID Match Confirmed. Pushing ${finalBps} BPS...`);
        const tx = await contract.updateRecipe(
            targetId, 
            onChain[0], 
            onChain[1], 
            finalBps, 
            false,
            { gasLimit: 350000 }
        );

        console.log(`⏳ Tx Hash: ${tx.hash}`);
        await tx.wait();
        console.log(`\n🚀 SEALED: ${onChain[0]} is now updated to ${finalBps} BPS.`);

    } catch (e) {
        console.error("\n❌ TRANSACTION FAILED");
        console.error(e.message);
    }
}

runCidSafeSeal(8, 8180);
