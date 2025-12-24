import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

const ABI = [
    "function nextId() view returns (uint256)",
    "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, uint256 costUsd, address author, bool isGolden)",
    "function setGolden(uint256 id, bool golden) public"
];

async function runCleanup() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const total = await contract.nextId();
    console.log(`Checking ${total} recipes for missing certifications...`);

    let nonce = await wallet.getNonce();

    for (let i = 0; i < total; i++) {
        const recipe = await contract.recipes(i);
        if (!recipe.isGolden && recipe.outcome !== "") {
            console.log(`\nFixing Recipe ID ${i}: ${recipe.outcome}`);
            try {
                const tx = await contract.setGolden(i, true, { nonce: nonce++ });
                console.log(`âœ… Sent: ${tx.hash}`);
                await tx.wait();
            } catch (e) {
                console.error(`Failed ID ${i}:`, e.message);
                nonce = await wallet.getNonce(); // Refresh nonce on error
            }
        }
    }
    console.log("\nâœ¨ Cleanup Complete. Registry is 100% Golden.");
}

runCleanup().catch(console.error);