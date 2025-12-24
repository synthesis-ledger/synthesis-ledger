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
        body: JSON.stringify({ 
            model, 
            messages: [{role: 'system', content: system}, {role: 'user', content: user}], 
            temperature: 0.01, 
            stream: true 
        })
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

function extractBPS(aiOutput, juryScores) {
    console.log("\n🔍 ATTEMPTING BPS EXTRACTION...");
    
    // Strategy 1: Clean JSON parse
    try {
        const cleaned = aiOutput.replace(/```json|```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[^}]*"bps"\s*:\s*(\d+)[^}]*\}/);
        if (jsonMatch) {
            const bps = JSON.parse(jsonMatch[0]).bps;
            console.log(`✅ Strategy 1 Success: Extracted BPS=${bps}`);
            return bps;
        }
    } catch (e) {}
    
    // Strategy 2: Regex for standalone number
    try {
        const bpsMatch = aiOutput.match(/"bps"\s*:\s*(\d+)/) || aiOutput.match(/bps[:\s-]*(\d{4})/i);
        if (bpsMatch) {
            const bps = parseInt(bpsMatch[1]);
            console.log(`✅ Strategy 2 Success: Scraped BPS=${bps}`);
            return bps;
        }
    } catch (e) {}
    
    // Strategy 3: Local Calculation (Self-Healing)
    try {
        const numbers = juryScores.match(/\b([1-9]\d|100)\b/g);
        if (numbers && numbers.length >= 4) {
            const scores = numbers.map(n => parseInt(n));
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const bps = Math.round(10000 - (avg * 20));
            console.log(`✅ Strategy 3 Success: Self-Calculated from Jury Avg (${avg.toFixed(1)}) → BPS=${bps}`);
            return bps;
        }
    } catch (e) {}
    
    throw new Error("ALL EXTRACTION STRATEGIES FAILED.");
}

async function runSovereignAuditAndSeal(targetOutcome) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const recipe = JSON.parse(rawData).find(r => r.outcome === targetOutcome);
    
    if (!recipe) { console.error(`❌ Outcome "${targetOutcome}" not found.`); return; }
    
    console.log(`\n🏛️  SOVEREIGN AUDIT: ${targetOutcome}`);
    const context = JSON.stringify(recipe, null, 2);
    
    const sA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Toil Auditor.", context, "SILO A");
    const sB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Auditor.", context, "SILO B");
    const sC = await streamGrok("grok-4-1-fast-non-reasoning", "Economic Auditor.", context, "SILO C");
    const sD = await streamGrok("grok-4-1-fast-non-reasoning", "Structural Auditor.", context, "SILO D");
    
    const jury = await streamGrok("grok-4-1-fast-reasoning", "Output ONLY JSON: {'A': score, 'B': score, 'C': score, 'D': score}", `Reports:\n${sA}\n${sB}\n${sC}\n${sD}`, "JURY");
    
    const final = await streamGrok("grok-4-1-fast-reasoning", "Senior Auditor. Output ONLY JSON: {'bps': 10000-(avg*20)}. No text.", `Jury Scores:\n${jury}`, "FINAL VERDICT");
    
    const newBps = extractBPS(final, jury);
    
    console.log(`\n🛰️  SCANNING V2.0 ANCHOR...`);
    for (let i = 0; i <= 20; i++) {
        try {
            const onChain = await contract.recipes(i);
            if (onChain[0] === targetOutcome) {
                console.log(`\n🎯 MATCH AT ID ${i} | BPS ${onChain[2]} -> ${newBps}`);
                const tx = await contract.updateRecipe(i, onChain[0], onChain[1], newBps, false, { gasLimit: 500000 });
                console.log(`📡 TX: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ SEALED.`);
                return;
            }
        } catch (e) {}
    }
}

const target = process.argv[2] || "A-LEG-PrecedentCheck";
runSovereignAuditAndSeal(target).catch(console.error);
