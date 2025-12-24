import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c";

async function debugSlot1() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const abi = ["function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    console.log("🔍 INVESTIGATING ID 1 ON-CHAIN...");
    const data = await contract.recipes(1);
    
    console.log("--------------------------------------------------");
    console.log(`OUTCOME: [${data[0]}] (Length: ${data[0].length})`);
    console.log(`CID:     [${data[1]}] (Length: ${data[1].length})`);
    console.log(`BPS:     ${data[2]}`);
    console.log(`GOLDEN:  ${data[3]}`);
    console.log("--------------------------------------------------");

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`YOUR WALLET: ${wallet.address}`);
    
    // Check if wallet matches the creator or has a specific role if we can find it
    console.log("\nIf the wallet address above is not the one that DEPLOYED the contract, the update will always fail.");
}

debugSlot1();
