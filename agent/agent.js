import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;

const ABI = [
    "function nextId() view returns (uint256)",
    "function recipes(uint256) view returns (string outcome, string cid, uint256 successBps, uint256 costUsd, address author, bool isGolden)"
];

async function runAgent() {
    console.log("--- SynthesisLedger Autonomous Agent Active ---");
    if (!RPC_URL) {
        console.error("ERROR: BASE_SEPOLIA_RPC_URL missing in .env");
        return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    try {
        const count = await contract.nextId();
        console.log("On-chain recipes discovered: " + count.toString());

        if (count > 0n) {
            const recipe = await contract.recipes(count - 1n);
            console.log("\n[LATEST GENESIS RECIPE]");
            console.log("Outcome:    " + recipe.outcome);
            console.log("Success:    " + (Number(recipe.successBps) / 100) + "%");
            console.log("Execution:  $" + (Number(recipe.costUsd) / 1000000).toFixed(4));
        }
    } catch (error) {
        console.error("Blockchain sync error:", error);
    }
}

runAgent();
