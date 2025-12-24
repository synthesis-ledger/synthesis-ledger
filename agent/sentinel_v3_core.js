import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0xf63a4b7A464d2108c28F5D39D93011EdCDFaF2B2";
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

const ABI = [
    "event Registered(uint256 indexed id, string outcome, uint8 rType)",
    "function setGolden(uint256 id, bool status) public",
    "function slash(uint256 id, uint256 percent) public"
];

async function run10TrialSimulation(outcome) {
    console.log('--- Initiating 10-Trial Simulation for: ' + outcome + ' ---');
    let successfulTrials = 0;

    for (let i = 1; i <= 10; i++) {
        process.stdout.write('Trial ' + i + '/10... ');
        try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + XAI_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'grok-3',
                    messages: [{ role: 'system', content: 'You are the Horpestad Standard Auditor. Output raw JSON only.' }, 
                               { role: 'user', content: 'Audit feasibility for: ' + outcome }],
                    temperature: 0.2 // Slight variance for stress testing
                })
            });
            const data = await response.json();
            if (data.choices) successfulTrials++;
            console.log('✅');
        } catch (e) {
            console.log('❌');
        }
    }

    const bps = (successfulTrials / 10) * 10000;
    return bps;
}

async function startSentinel() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log('Synthesis Sentinel V3: ONLINE (Horpestad Standard)');

    contract.on("Registered", async (id, outcome, rType) => {
        const bps = await run10TrialSimulation(outcome);
        console.log('Final Success BPS: ' + bps);

        if (bps >= 9500) {
            console.log('Promoting to GOLDEN STATUS...');
            await contract.setGolden(id, true);
        } else if (bps < 8500) {
            console.log('BPS CRITICAL: Executing Drift Slash...');
            await contract.slash(id, 10);
        }
    });
}

startSentinel().catch(console.error);
