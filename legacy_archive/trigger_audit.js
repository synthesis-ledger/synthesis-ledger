import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;

const ABI = [
    "function register(string memory _outcome, string memory _cid, uint256 _successBps, uint256 _costUsd, bool _isGolden) public"
];

async function runAuditTrigger() {
    console.log("ðŸš€ Registering: 'advanced_mev_protection_workflow' for Grok Audit...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const tx = await contract.register(
        "advanced_mev_protection_workflow",
        "ar://GROK_SIM_TEST_001",
        9850, 
        5500, 
        false // Start as false to see the Sentinel change it to true
    );

    console.log("Tx Hash: " + tx.hash);
    await tx.wait();
    console.log("âœ… Registered. Watch the Sentinel window now!");
}

runAuditTrigger().catch(console.error);