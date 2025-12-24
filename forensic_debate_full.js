import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const XAI_KEY = process.env.XAI_API_KEY;

// Word-by-word streaming helper
async function callGrokStreaming(model, messages, label, temp = 0.1) {
    process.stdout.write(`\n\n>>> STARTING ${label} (${model}) <<<\n`);
    
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${XAI_KEY}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ model, messages, temperature: temp, stream: true })
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
                    process.stdout.write(delta); // PRINT EVERY WORD
                    fullContent += delta;
                } catch (e) {}
            }
        }
    }
    process.stdout.write(`\n>>> ${label} COMPLETE <<<\n`);
    return fullContent;
}

async function runFullForensicAudit(id = 2) {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const abi = ["function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)"];
    const contract = new ethers.Contract("0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c", abi, provider);

    const [outcome, cid] = await contract.recipes(id);
    const seed = cid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 777;
    const offset = seed % 149;

    console.log(`🏛️  HORPESTAD COUNCIL: 3-ROUND FORENSIC DEBATE`);
    console.log(`TARGET: ID ${id} | Outcome: ${outcome} | Seed: ${seed} | Offset: ${offset}`);

    let history = `Target Outcome: ${outcome} | Seed: ${seed}\n`;

    for (let round = 1; round <= 3; round++) {
        // ROUND X: BREAKER
        const attack = await callGrokStreaming("grok-3-mini", [
            {role: "system", content: "You are the BREAKER. Find fatal flaws. Be hyper-critical."},
            {role: "user", content: history}
        ], `ROUND ${round} ATTACK`);
        history += `\nRound ${round} ATTACK: ${attack}`;

        // ROUND X: DEFENDER
        const defense = await callGrokStreaming("grok-3-mini", [
            {role: "system", content: "You are the DEFENDER. Counter the Breaker. Explain why the code is resilient."},
            {role: "user", content: history}
        ], `ROUND ${round} DEFENSE`);
        history += `\nRound ${round} DEFENSE: ${defense}`;
    }

    // FINAL VERDICT: AUDITOR
    const verdict = await callGrokStreaming("grok-3", [
        {role: "system", content: "You are the SENIOR AUDITOR. Weigh the full 3-round debate. Assign FINAL BPS. Formula: 10000 - [Penalties] - [Offset: ${offset}]. JSON ONLY."},
        {role: "user", content: history}
    ], "FINAL AUDIT VERDICT");

    console.log(`\n\n⚖️  DEBATE TERMINATED.`);
}

runFullForensicAudit().catch(console.error);