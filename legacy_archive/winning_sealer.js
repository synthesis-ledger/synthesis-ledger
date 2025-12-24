import { ethers } from 'ethers';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;
const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function streamGrok(model, system, user, label) {
    process.stdout.write(`\n\n>>> [${label}] INITIATING (${model}) <<<\n`);
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{role: 'system', content: system}, {role: 'user', content: user}], temperature: 0.05, stream: true })
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
    return fullText;
}

async function runSovereignAuditAndSeal(targetOutcome) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 1. DATA EXTRACTION
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const recipe = JSON.parse(rawData).find(r => r.outcome === targetOutcome);
    
    console.log(`\n📦 DATA SENT TO AI AUDITORS:`);
    console.log(JSON.stringify(recipe, null, 2));

    // 2. AUDIT
    const context = JSON.stringify(recipe, null, 2);
    const sA = await streamGrok("grok-4-1-fast-non-reasoning", "Audit TOIL.", context, "SILO A");
    const sB = await streamGrok("grok-4-1-fast-non-reasoning", "Audit Security.", context, "SILO B");
    const sC = await streamGrok("grok-4-1-fast-non-reasoning", "Audit Economy.", context, "SILO C");
    const sD = await streamGrok("grok-4-1-fast-non-reasoning", "Audit Structure.", context, "SILO D");
    const jury = await streamGrok("grok-4-1-fast-reasoning", "Jury score 1-100 JSON: {'score': int}", `A:${sA}\nB:${sB}\nC:${sC}\nD:${sD}`, "JURY");
    const final = await streamGrok("grok-4-1-fast-reasoning", "BPS 10000-(Score*20) JSON: {'bps': int}", jury, "FINAL");
    const newBps = JSON.parse(final.match(/\{.*"bps":\s*(\d+).*\}/s)[0]).bps;

    // 3. SCAN & SEAL (The Working Logic)
    console.log(`\n🛰️  SEARCHING V2.0 ANCHOR FOR: ${targetOutcome}`);
    for (let i = 0; i <= 39; i++) {
        try {
            const onChain = await contract.recipes(i);
            if (onChain[0] === targetOutcome) {
                console.log(`🎯 MATCH FOUND AT ID ${i}. PUSHING BPS ${newBps}...`);
                const tx = await contract.updateRecipe(i, onChain[0], onChain[1], newBps, false, { gasLimit: 500000 });
                console.log(`📡 TX: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ SEALED ON V2.0 ANCHOR.`);
            }
        } catch (e) {}
    }
}

runSovereignAuditAndSeal("A-LEG-PrecedentCheck");
