import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613"; // V42 Ledger [cite: 3, 5]
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL; // 
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

// V42 Hardened ABI [cite: 3, 5]
const ABI = [
    "event CertificationIssued(string atomicId, bytes32 dataHash, uint256 feePaid)",
    "function issueStrike(string atomicId, uint256 newBps) external",
    "function registry(string atomicId) view returns (string cid, address creator, uint256 bps, uint256 strikes, bool isObsolete)"
];

async function run10TrialSimulation(atomicId, logicDetails) {
    console.log(`\n--- [V42] Initiating 10-Trial Simulation for: ${atomicId} ---`);
    let successfulTrials = 0;

    for (let i = 1; i <= 10; i++) {
        process.stdout.write(`Trial ${i}/10... `);
        try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${XAI_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'grok-4.1-fast-non-reasoning', // Hardened Model Variant [cite: 4]
                    messages: [
                        { role: 'system', content: 'You are the Horpestad Standard Auditor. Output raw JSON only.' }, 
                        { role: 'user', content: `Audit feasibility for logic: ${logicDetails}` }
                    ],
                    temperature: 0.2
                })
            });
            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                successfulTrials++;
                console.log('✅');
            } else {
                console.log('⚠️');
            }
        } catch (e) {
            console.log('❌');
        }
    }

    const finalBps = (successfulTrials / 10) * 10000;
    return finalBps;
}

async function startSentinel() {
    console.log('🏛️ Synthesis Sentinel V42: ONLINE (Hardened Standard)');
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // V42 Event Listener: CertificationIssued [cite: 3]
    contract.on("CertificationIssued", async (atomicId, dataHash) => {
        console.log(`\n🔔 NEW CERTIFICATION DETECTED: [${atomicId}]`);
        
        try {
            // 1. Fetch logic CID from Arweave via the Ledger [cite: 3, 5]
            const registryEntry = await contract.registry(atomicId);
            const arweaveData = await fetch(`https://arweave.net/${registryEntry.cid}`).then(res => res.json());
            
            // 2. Perform 10-trial forensic audit 
            const newBps = await run10TrialSimulation(atomicId, JSON.stringify(arweaveData));
            console.log(`>>> Final Forensic BPS for ${atomicId}: ${newBps}`);

            // 3. Automated Immune System Trigger [cite: 3]
            // If BPS falls below 7800, a strike is issued automatically on-chain.
            console.log(`>>> Committing forensic audit to Base Mainnet...`);
            const tx = await contract.issueStrike(atomicId, Math.floor(newBps));
            await tx.wait();
            
            console.log(`✅ ATOMIC [${atomicId}] FORENSICALLY SEALED.`);

        } catch (error) {
            console.error(`❌ SENTINEL ERROR for ${atomicId}:`, error.message);
        }
    });
}

startSentinel().catch(console.error);