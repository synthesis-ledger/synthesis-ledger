import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0x8D28bc703Ece112bEC990B2B66992Eb9fB04A39E";
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;

const ABI = [
    "function register(string memory _outcome, string memory _cid, uint256 _successBps, uint256 _costUsd, bool _isGolden) public"
];

async function runTest() {
    console.log("🚀 SynthesisLedger: Sending Test AST Recipe to Registry...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // This matches the format Grok wants to see
    const tx = await contract.register(
        "analyze_base_trending_pairs",
        "ar://TEST_AST_V1_COMPLEX_DEX",
        9500, // 95% success
        1500, // $0.0015 cost
        false // Not golden yet (waiting for Sentinel audit)
    );

    console.log("Transaction sent! Hash: " + tx.hash);
    await tx.wait();
    console.log("✅ Recipe successfully registered on Base Sepolia.");
    console.log("Now, switch to your Sentinel terminal to see the reaction!");
}

runTest().catch(console.error);