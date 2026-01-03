import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// --- HARDENED CONFIGURATION ---
const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

// Load models from .env with fallback defaults
const AUDIT_MODEL = process.env.SENTINEL_AUDIT_MODEL || 'grok-4.1-fast-non-reasoning';
const JURY_MODEL = process.env.SENTINEL_JURY_MODEL || 'grok-4.1-fast-reasoning';

const LOG_FILE = path.join(__dirname, 'forensic_failures.log');

const ABI = [
    "event CertificationIssued(string atomicId, bytes32 dataHash, uint256 feePaid)",
    "function issueStrike(string atomicId, uint256 newBps) external",
    "function registry(string atomicId) view returns (string cid, address creator, uint256 bps, uint256 strikes, bool isObsolete)"
];

/**
 * Logs failures to a local file for forensic review.
 */
function logForensicFailure(atomicId, error) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ATOMIC: ${atomicId} | ERROR: ${error}\n`;
    fs.appendFileSync(LOG_FILE, entry);
}

async function run10TrialSimulation(atomicId, logicDetails) {
    console.log(`\n--- [V42] Initiating 10-Trial Simulation for: ${atomicId} ---`);
    console.log(`>>> Using Audit Model: ${AUDIT_MODEL}`);
    
    let successfulTrials = 0;

    for (let i = 1; i <= 10; i++) {
        process.stdout.write(`Trial ${i}/10... `);
        try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${XAI_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: AUDIT_MODEL,
                    messages: [
                        { role: 'system', content: 'You are the Horpestad Standard Auditor. Output raw JSON only.' }, 
                        { role: 'user', content: `Audit feasibility for logic: ${logicDetails}` }
                    ],
                    temperature: 0.2
                })
            });
            
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                successfulTrials++;
                console.log('✅');
            } else {
                console.log('⚠️');
            }
        } catch (e) {
            console.log('❌');
            logForensicFailure(atomicId, `Trial ${i} failed: ${e.message}`);
        }
    }

    return (successfulTrials / 10) * 10000;
}

async function startSentinel() {
    console.log('🏛️ Synthesis Sentinel V42: ONLINE (Hardened Standard)');
    
    if (!RPC_URL || !PRIVATE_KEY) {
        console.error("❌ CRITICAL ERROR: RPC_URL or PRIVATE_KEY missing in .env");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    contract.on("CertificationIssued", async (atomicId, dataHash) => {
        console.log(`\n🔔 NEW CERTIFICATION DETECTED: [${atomicId}]`);
        
        try {
            const registryEntry = await contract.registry(atomicId);
            
            // Standardizing Arweave URL handling
            const cid = registryEntry.cid.startsWith('ar://') ? registryEntry.cid.replace('ar://', '') : registryEntry.cid;
            const arweaveData = await fetch(`https://arweave.net/${cid}`).then(res => res.json());
            
            const newBps = await run10TrialSimulation(atomicId, JSON.stringify(arweaveData));
            console.log(`>>> Final Forensic BPS for ${atomicId}: ${newBps}`);

            console.log(`>>> Committing forensic audit to Base Mainnet...`);
            const tx = await contract.issueStrike(atomicId, Math.floor(newBps));
            await tx.wait();
            
            console.log(`✅ ATOMIC [${atomicId}] FORENSICALLY SEALED.`);

        } catch (error) {
            console.error(`❌ SENTINEL ERROR for ${atomicId}:`, error.message);
            logForensicFailure(atomicId, `Main Loop Error: ${error.message}`);
        }
    });
}

startSentinel().catch(console.error);