import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c";

async function runSeal(targetId, finalBps) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Using the EXACT ABI that matches your registry state
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 bps, bool golden) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🔗 SEALING ID ${targetId} on Base Mainnet...`);
    
    try {
        // 1. Get current data to preserve fields
        const current = await contract.recipes(targetId);
        console.log(`Current State: ${current[0]} | BPS: ${current[2].toString()}`);

        // 2. Push the update
        console.log(`Pushing 8180 BPS update...`);
        const tx = await contract.updateRecipe(
            targetId, 
            current[0], // outcome
            current[1], // cid
            finalBps,   // NEW BPS: 8180
            current[3]  // golden status
        );

        console.log(`📡 TX Sent: ${tx.hash}`);
        await tx.wait();
        console.log(`\n✅ SUCCESS: ID ${targetId} updated to 8180 BPS.`);
        console.log(`View on BaseScan: https://basescan.org/tx/${tx.hash}`);

    } catch (e) {
        console.error("\n❌ REVERTED");
        console.error("Reason:", e.message);
    }
}

runSeal(8, 8180);
