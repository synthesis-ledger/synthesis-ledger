import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c";

async function pushToChain(targetId, finalBps) {
    console.log(`\n🔗 INITIATING ON-CHAIN SEAL...`);
    console.log(`📋 ID: ${targetId} | BPS: ${finalBps}`);

    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    
    if (!process.env.PRIVATE_KEY) {
        console.error("❌ Error: PRIVATE_KEY not found in .env file.");
        return;
    }

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(
        CONTRACT_ADDRESS, 
        ["function sealBps(uint256 id, uint256 bps, string scriptInfo) external"], 
        wallet
    );

    try {
        console.log(`📡 Broadcasting transaction to Base Mainnet...`);
        const tx = await contract.sealBps(
            targetId, 
            finalBps, 
            "Horpestad-Sovereign-v2.1-FullContext-Audit"
        );
        
        console.log(`⏳ Transaction Sent! Hash: ${tx.hash}`);
        console.log(`🔗 View on BaseScan: https://basescan.org/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`\n✅ SUCCESS: BPS for ID ${targetId} is now permanently sealed at ${finalBps}.`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
    } catch (error) {
        console.error("❌ Blockchain Error:", error.reason || error.message);
    }
}

// Executing for the audit result we just reached
pushToChain(8, 8180);
