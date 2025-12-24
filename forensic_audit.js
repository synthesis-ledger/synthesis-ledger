import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const XAI_KEY = process.env.XAI_API_KEY;

async function callGrok(model, messages, temp = 0.1) {
    const r = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: temp })
    });
    const data = await r.json();
    return data.choices?.[0]?.message?.content || "";
}

async function runForensicAudit(id = 2) {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const abi = ["function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, bool golden)"];
    const contract = new ethers.Contract("0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c", abi, provider);

    const [outcome, cid] = await contract.recipes(id);
    const seed = cid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 777;
    const offset = seed % 149;

    console.log(`\n⚖️  ID ${id} FORENSIC DEBATE: 3 ROUNDS`);
    let history = `Target Outcome: ${outcome} | Seed: ${seed}\n`;

    for (let round = 1; round <= 3; round++) {
        console.log(`\n--- ROUND ${round} ---`);
        
        // 1. BREAKER ATTACKS
        const attack = await callGrok("grok-3-mini", [
            {role: "system", content: "You are the BREAKER. Find 1 fatal flaw. Critique the previous defense if it exists."},
            {role: "user", content: history}
        ]);
        console.log(`🔨 BREAKER: ${attack.substring(0, 100)}...`);
        history += `\nRound ${round} ATTACK: ${attack}`;

        // 2. DEFENDER COUNTERS
        const defense = await callGrok("grok-3-mini", [
            {role: "system", content: "You are the DEFENDER. Argue why the Breaker's flaw is mitigated or a false positive."},
            {role: "user", content: history}
        ]);
        console.log(`🛡️  DEFENDER: ${defense.substring(0, 100)}...`);
        history += `\nRound ${round} DEFENSE: ${defense}`;
    }

    // 3. AUDITOR VERDICT
    const verdict = await callGrok("grok-3", [
        {role: "system", content: "You are the SENIOR AUDITOR. Weigh the 3-round debate and assign the FINAL BPS. Formula: 10000 - [Penalties] - [Offset: ${offset}]. Return JSON ONLY: {\"bps\": <int>, \"justification\": \"...\"}"},
        {role: "user", content: history}
    ]);

    const res = JSON.parse(verdict.replace(/```json|```/g, ''));
    console.log(`\n📊 FINAL VERDICT: ${res.bps} BPS`);
    console.log(`📝 REASONING: ${res.justification}`);
}

runForensicAudit();