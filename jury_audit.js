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

async function runInstitutionalAudit(id = 2) {
    console.log(`🏛️  STARTING INSTITUTIONAL CONSENSUS AUDIT (ID: ${id})`);
    
    // 1. THE SPECIALISTS (Grok-4.1 Fast Reasoning)
    console.log("🛠️  Expert 1: SRE Toil Audit...");
    const toilAudit = await callGrok("grok-4-1-fast-reasoning", [{role: "system", content: "You are the SRE Chaos Engineer. Audit this logic for Manual Toil and Fragility. Output 1 fatal TOIL flaw."}]);
    
    console.log("💰  Expert 2: Game Theory Audit...");
    const gameAudit = await callGrok("grok-code-fast-1", [{role: "system", content: "You are the Game Theorist. Audit this for Reward Hacking and Exploits. Output 1 fatal EXPLOIT flaw."}]);

    // 2. THE 10-VOTE JURY (Grok-3-mini)
    console.log("🗳️  Jury is deliberating (10 Micro-Voters)...");
    let juryVotes = [];
    for(let i = 1; i <= 10; i++) {
        const vote = await callGrok("grok-3-mini", [{role: "system", content: "Vote on the severity of the flaws found. Output JSON: {\"severity\": 1-100}"}]);
        juryVotes.push(vote);
        process.stdout.write(".");
    }

    // 3. FINAL DETERMINISTIC VERDICT (Grok-3)
    const finalVerdict = await callGrok("grok-3", [{role: "system", content: `You are the SENIOR AUDITOR. Synthesize the TOIL report, GAME THEORY report, and 10 JURY VOTES into a FINAL BPS. 
    Formula: 10000 - [Penalties] - [Seed Offset]. 
    Current Votes: ${juryVotes.join(', ')}
    JSON ONLY.`}]);

    console.log("\n\n📊 INSTITUTIONAL VERDICT REACHED");
    console.log(finalVerdict);
}

runInstitutionalAudit();