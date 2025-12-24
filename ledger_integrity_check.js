import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";
const PROVIDER_URL = "https://mainnet.base.org";

async function verifyAndRepair() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function nextId() view returns (uint256)",
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, uint256 strikes, uint256 timestamp, bool active, bytes32 hash)",
        "function mintRecipe(string outcome, string cid, uint256 bps, bytes32 auditHash) public"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    const nextId = await contract.nextId();
    console.log(`\n🏛️  V3 LEDGER AUDIT & FIDELITY CHECK | ENTRIES: ${nextId}\n`);
    console.log("ID | BPS  | OUTCOME");
    console.log("---|------|-------------------------");

    for (let i = 0; i < nextId; i++) {
        try {
            const r = await contract.recipes(i);
            const bpsStr = r.bps.toString().padEnd(4);
            console.log(`${i.toString().padEnd(2)} | ${bpsStr} | ${r.outcome}`);
            
            // Artificial delay to prevent "over rate limit" error
            await new Promise(res => setTimeout(res, 500)); 
        } catch (e) {
            console.log(`⚠️  Rate limited at ID ${i}. Retrying in 2 seconds...`);
            await new Promise(res => setTimeout(res, 2000));
            i--; // Retry this ID
        }
    }
}
verifyAndRepair();
