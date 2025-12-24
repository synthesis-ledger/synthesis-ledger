import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;
const REGISTRY_ADDR = "0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c";

// Helper for word-by-word streaming
async function callGrokStreaming(model, messages, label, temp = 0.1) {
    process.stdout.write(`\n--- [${label}] Starting Stream (${model}) ---\n`);
    
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${XAI_KEY}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
            model, 
            messages, 
            temperature: temp,
            stream: true 
        })
    });

    let fullContent = "";
    const decoder = new TextDecoder();
    
    for await (const chunk of response.body) {
        const lines = decoder.decode(chunk).split("\n");
        for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                    const data = JSON.parse(line.replace("data: ", ""));
                    const delta = data.choices[0]?.delta?.content || "";
                    process.stdout.write(delta);
                    fullContent += delta;
                } catch (e) {}
            }
        }
    }
    process.stdout.write(`\n--- [${label}] Stream Complete ---\n`);
    return fullContent;
}

async function runStabilityTest() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const abi = ["function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)"];
    const contract = new ethers.Contract(REGISTRY_ADDR, abi, provider);

    const TEST_ID = 2; // Testing ID 2 specifically
    const [outcome, cid] = await contract.recipes(TEST_ID);
    const seed = cid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 777;
    const offset = seed % 149;

    const summary = [];

    console.log(`🏛️  STABILITY STRESS TEST: ID ${TEST_ID} - 4 ITERATIONS`);
    console.log(`Outcome: ${outcome} | Seed: ${seed} | Offset: ${offset}`);

    for (let i = 1; i <= 4; i++) {
        console.log(`\n\n==================== ITERATION ${i} / 4 ====================`);

        // STEP 1: ADVERSARY (Streaming)
        const debate = await callGrokStreaming("grok-3-mini", [
            {role: "system", content: "You are the Council Adversary. Find 2 specific technical vulnerabilities. Be hyper-critical."},
            {role: "user", content: `Outcome: ${outcome} | Seed: ${seed}`}
        ], `ITERATION ${i} ADVERSARY`);

        // STEP 2: JUDGE (Streaming)
        const finalPrompt = `DEBATE LOG:\n${debate}\n\nJUDGE: Calculate the FINAL BPS (7800-10000).
        Formula: 10000 - [Penalties for flaws above] - [Seed Offset: ${offset}].
        YOU MUST NOT ROUND. Every result must be unique. Return JSON ONLY: {"bps": <int>, "justification": "..."}`;

        const finalOutput = await callGrokStreaming("grok-3", [
            {role: "system", content: "Forensic Mathematician. Use deductive reasoning. Output raw JSON."},
            {role: "user", content: finalPrompt}
        ], `ITERATION ${i} JUDGE`);

        try {
            const res = JSON.parse(finalOutput.replace(/```json|```/g, ''));
            console.log(`\n⚖️  RESULT ${i} MATH: ${res.bps} BPS`);
            summary.push(res.bps);
        } catch (e) {
            console.log(`\n❌ PARSE FAILED: ${e.message}`);
        }
        
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log("\n\n" + "=".repeat(40));
    console.log("📊 STABILITY SUMMARY FOR ID " + TEST_ID);
    summary.forEach((bps, index) => console.log(`Run ${index + 1}: ${bps}`));
    const max = Math.max(...summary);
    const min = Math.min(...summary);
    console.log(`📉 VARIANCE WINDOW: ${max - min} BPS`);
    console.log("=".repeat(40));
}

runStabilityTest().catch(console.error);