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
const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

const ABI = [
    "event RecipeRegistered(uint256 indexed id, string outcome, address author)",
    "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, uint256 costUsd, address author, bool isGolden)",
    "function setGolden(uint256 id, bool golden) public"
];

async function grokAudit(outcome) {
    console.log(`ðŸ§  Requesting Grok-3 Audit for: ${outcome}...`);
    const prompt = `Act as SynthesisLedger Auditor. 
    Audit this AI-agent outcome: "${outcome}". 
    Evaluate its technical feasibility and security. 
    Respond ONLY with a valid JSON object: {"successBps": 9500, "isGolden": true, "reason": "Verified"}`;

    try {
        const response = await fetch(XAI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${XAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'grok-3',
                messages: [
                    { role: 'system', content: 'You are a technical blockchain security auditor. Output raw JSON only.' }, 
                    { role: 'user', content: prompt }
                ],
                temperature: 0
            })
        });

        const data = await response.json();
        
        if (!data.choices) {
            console.error("Grok API Error:", data.error || data);
            return { successBps: 0, isGolden: false, reason: "API Error" };
        }

        const content = data.choices[0].message.content.trim();
        const cleanJson = content.replace(/```json|```/g, "");
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Audit logic crashed:", e.message);
        return { successBps: 0, isGolden: false, reason: "Crash" };
    }
}

async function startSentinelV2() {
    console.log("--- SynthesisLedger Grok-Auditor Sentinel V2: GROK-3 READY ---");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log("Monitoring Base Sepolia events...");

    contract.on("RecipeRegistered", async (id, outcome, author) => {
        console.log(`\n[EVENT] New Recipe Detected! ID: ${id} | Outcome: ${outcome}`);
        
        const audit = await grokAudit(outcome);
        console.log(`Grok-3 Verdict: ${audit.successBps} bps | Golden: ${audit.isGolden}`);
        console.log(`Reason: ${audit.reason}`);

        if (audit.isGolden) {
            try {
                console.log("Automating On-chain Certification...");
                const tx = await contract.setGolden(id, true);
                console.log(`âœ… Tx Submitted: ${tx.hash}`);
                await tx.wait();
                console.log(`ðŸŒŸ SUCCESS: Recipe ${id} is now GOLDEN.`);
            } catch (txError) {
                console.error("Blockchain Write Failed:", txError.message);
            }
        }
    });
}

startSentinelV2().catch(console.error);
