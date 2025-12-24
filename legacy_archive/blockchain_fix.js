import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c";

async function fixAndPush(targetId, finalBps) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // ABI covering the standard registry functions
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)",
        "function owner() view returns (address)",
        "function sealBps(uint256 id, uint256 bps, string scriptInfo) external",
        "function updateBps(uint256 id, uint256 bps) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🔍 Checking On-Chain State for ID ${targetId}...`);
    const recipe = await contract.recipes(targetId);
    const owner = await contract.owner();
    
    console.log(`Current BPS: ${recipe.bps}`);
    console.log(`Golden Status: ${recipe.golden}`);
    console.log(`Contract Owner: ${owner}`);
    console.log(`Your Wallet: ${wallet.address}`);

    if (recipe.golden) {
        console.error("❌ ERROR: ID 8 is already GOLDEN. Immutability is active. Cannot update BPS.");
        return;
    }

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error("❌ ERROR: Your wallet is NOT the contract owner. Permission denied.");
        return;
    }

    try {
        console.log(`\n📡 Attempting Seal (8180 BPS)...`);
        // Trying sealBps first
        const tx = await contract.sealBps(targetId, finalBps, "Horpestad-v2.1", { gasLimit: 200000 });
        console.log(`⏳ Tx Sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ SUCCESS: ID ${targetId} updated to ${finalBps}`);
    } catch (e) {
        console.log("⚠️ sealBps failed, trying updateBps...");
        const tx2 = await contract.updateBps(targetId, finalBps);
        await tx2.wait();
        console.log(`✅ SUCCESS via updateBps: ID ${targetId} is now ${finalBps}`);
    }
}

fixAndPush(8, 8180);
