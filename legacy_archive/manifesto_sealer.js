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
            temperature: 0.05, 
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

async function runManifestoSeal(targetCid) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 1. Get Local Data
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const localRecipe = JSON.parse(rawData).find(r => r.cid === targetCid);
    
    if (!localRecipe) {
        console.error(`❌ CID ${targetCid} not found in genesis_onchain.json`);
        return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`⚖️  MANIFESTO AUDIT: ${localRecipe.outcome}`);
    console.log(`📦 RAW DATA SENT TO AI:`);
    console.log(JSON.stringify(localRecipe, null, 2));
    console.log(`${'='.repeat(80)}`);

    // 2. Audit
    const context = JSON.stringify(localRecipe, null, 2);
    const sA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Auditor: Audit TOIL/Waste.", context, "SILO A");
    const sB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit Logic/Bugs.", context, "SILO B");
    const sC = await streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit Game Theory.", context, "SILO C");
    const sD = await streamGrok("grok-4-1-fast-non-reasoning", "Architect: Audit Structure.", context, "SILO D");
    
    const jury = await streamGrok("grok-4-1-fast-reasoning", "You are a 10-person Jury. Provide severity scores 1-100. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}", `Reports:\nA:${sA}\nB:${sB}\nC:${sC}\nD:${sD}`, "JURY");
    
    const final = await streamGrok("grok-4-1-fast-reasoning", "Senior Auditor. Provide a detailed final verdict text and then the final BPS JSON. Formula: 10000 - (Avg_Score * 20). JSON: {'bps': int}", jury, "FINAL VERDICT");
    
    const bpsMatch = final.match(/\{.*"bps":\s*(\d+).*\}/s);
    if (!bpsMatch) {
        console.error("❌ Failed to find BPS JSON in output.");
        return;
    }
    const newBps = JSON.parse(bpsMatch[0]).bps;

    // 3. Scan V2.0 Anchor
    console.log(`\n🛰️  SCANNING V2.0 ANCHOR (0x9BcC...) FOR CID: ${targetCid}`);
    let found = false;
    for (let i = 0; i <= 50; i++) {
        try {
            const onChain = await contract.recipes(i);
            if (onChain[1] === targetCid) {
                found = true;
                console.log(`🎯 MATCH AT ID ${i}. PUSHING BPS ${newBps}...`);
                const tx = await contract.updateRecipe(i, onChain[0], onChain[1], newBps, false, { gasLimit: 500000 });
                console.log(`📡 TRANSACTION BROADCAST: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ SEALED ON V2.0 ANCHOR AT ID ${i}`);
                break;
            }
        } catch (e) {
            // Silently continue scanning
        }
    }
    if (!found) console.error("❌ CID NOT FOUND ON V2.0 ANCHOR REGISTRY.");
}

runManifestoSeal("ar://SYNTH_ATOMIC_HC_PATHVALIDATOR");
