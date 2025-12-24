import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;

async function streamGrok(model, messages, label) {
    process.stdout.write(`\n\n>>> [${label}] INITIATING (${model}) <<<\n`);
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.1, stream: true })
    });

    let fullText = "";
    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
        const lines = decoder.decode(chunk).split("\n");
        for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                    const data = JSON.parse(line.replace("data: ", ""));
                    const delta = data.choices[0]?.delta?.content || "";
                    process.stdout.write(delta);
                    fullText += delta;
                } catch (e) {}
            }
        }
    }
    process.stdout.write(`\n>>> [${label}] COMPLETE <<<\n`);
    return fullText;
}

async function run() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const abi = ["function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps)"];
    const contract = new ethers.Contract("0xB7B1FCE90f7B56cc9A98F776eE8A20E8c82dB73c", abi, provider);
    const [outcome, cid] = await contract.recipes(2);
    const seed = cid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 777;

    console.log(`🏛️  INSTITUTIONAL JURY: ID 2 | ${outcome}`);

    // EXPERT 1: TOIL AUDIT
    const toilReport = await streamGrok("grok-4-1-fast-reasoning", [
        {role: "system", content: "You are the SRE Chaos Engineer. Conduct a TOIL AUDIT. Identify manual-heavy cognitive waste and fragility."},
        {role: "user", content: `Target: ${outcome} | Seed: ${seed}`}
    ], "EXPERT 1: SRE TOIL AUDIT");

    // EXPERT 2: GAME THEORY
    const gameReport = await streamGrok("grok-code-fast-1", [
        {role: "system", content: "You are the Game Theorist. Audit for REWARD HACKING and economic exploits in the logic."},
        {role: "user", content: `Target: ${outcome} | Context: ${toilReport}`}
    ], "EXPERT 2: GAME THEORY AUDIT");

    // THE 10-VOTE JURY
    console.log("\n🗳️  THE JURY OF 10 (MICRO-PARTICIPANTS) COMMENCING VOTE...");
    let votes = "";
    for(let i = 1; i <= 10; i++) {
        const v = await streamGrok("grok-3-mini", [
            {role: "system", content: "You are a Micro-Voter. Based on the reports above, provide a 1-sentence verdict and a SEVERITY SCORE (1-100)."},
            {role: "user", content: `Audit History: ${toilReport}\n${gameReport}`}
        ], `JURY MEMBER ${i}`);
        votes += `Voter ${i}: ${v}\n`;
    }

    // FINAL DETERMINISTIC VERDICT
    await streamGrok("grok-3", [
        {role: "system", content: `You are the SENIOR AUDITOR. Weigh the TOIL report, GAME THEORY report, and the 10 JURY VOTES. 
        Formula: 10000 - [Penalties] - [Seed Offset: ${seed % 149}]. JSON ONLY.`},
        {role: "user", content: `REPORTS:\n${toilReport}\n${gameReport}\n\nJURY VOTES:\n${votes}`}
    ], "FINAL INSTITUTIONAL VERDICT");
}

run().catch(console.error);