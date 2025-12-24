import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0xf63a4b7a464d2108c28f5d39d93011edcdfaf2b2";
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;

const ABI = ["function register(string memory _outcome, string memory _cid, uint256 _successBps, uint256 _costUsd, bool _isGolden) public"];

async function trigger() {
    console.log("🚀 Launching Automated Audit Test for: 'cross_chain_liquidity_bridge'...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const tx = await contract.register(
        "cross_chain_liquidity_bridge",
        "ar://FINAL_INTEGRATION_TEST_001",
        9700, 
        2500, 
        false
    );

    console.log("Tx Sent: " + tx.hash);
    await tx.wait();
    console.log("✅ Registered. Watch Sentinel V2 process the audit...");
}

trigger().catch(console.error);
