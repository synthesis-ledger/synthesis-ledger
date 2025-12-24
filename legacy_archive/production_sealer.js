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

async function runAuditAndSealByName(targetOutcome) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function updateRecipe(uint256 id, string outcome, string cid, uint256 successBps, bool golden) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 1. DATA EXTRACTION FROM LOCAL MANIFEST
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const localManifest = JSON.parse(rawData);
    const localRecipe = localManifest.find(r => r.outcome === targetOutcome);
    
    if (!localRecipe) {
        console.error(`❌ Outcome "${targetOutcome}" not found in local manifest.`);
        return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏛️  SOVEREIGN AUDIT & MULTI-SEAL: ${targetOutcome}`);
    console.log(`📦 LOCAL SOURCE DATA:`);
    console.log(JSON.stringify(localRecipe, null, 2));
    console.log(`${'='.repeat(80)}`);

    // 2. FULL STREAMING AUDIT
    const context = JSON.stringify(localRecipe, null, 2);
    const sA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Auditor: Audit TOIL/Waste based on the Spec.", context, "SILO A");
    const sB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit Logic/Vulnerabilities.", context, "SILO B");
    const sC = await streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit Game Theory/Exploits.", context, "SILO C");
    const sD = await streamGrok("grok-4-1-fast-non-reasoning", "Architect: Audit Structural Integrity.", context, "SILO D");
    
    const jury = await streamGrok("grok-4-1-fast-reasoning", "Jury: 1-100 severity JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}", `Reports:\nA:${sA}\nB:${sB}\nC:${sC}\nD:${sD}`, "10-PERSON JURY");
    
    const final = await streamGrok("grok-4-1-fast-reasoning", "Senior Auditor. Calculate Final BPS (10000 - Avg_Score * 20). Output JSON ONLY: {'bps': int}", jury, "FINAL VERDICT");
    
    const newBps = JSON.parse(final.match(/\{.*"bps":\s*(\d+).*\}/s)[0]).bps;
    console.log(`\n🏆 CALCULATED FORENSIC BPS: ${newBps}`);

    // 3. SCAN & SEAL ALL MATCHING OUTCOMES
    console.log(`\n🛰️  SCANNING V2.0 ANCHOR FOR OUTCOME: ${targetOutcome}`);
    let matchCount = 0;
    for (let i = 0; i <= 50; i++) {
        try {
            const onChain = await contract.recipes(i);
            if (onChain[0] === targetOutcome) {
                matchCount++;
                console.log(`\n🎯 MATCH FOUND [${matchCount}] AT ID: ${i}`);
                console.log(`🔗 SEALING BPS ${newBps} TO BLOCKCHAIN...`);
                
                const tx = await contract.updateRecipe(i, onChain[0], onChain[1], newBps, false, { gasLimit: 500000 });
                console.log(`📡 TX SENT: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ ID ${i} SUCCESSFULLY SEALED.`);
            }
        } catch (e) { continue; }
    }
    
    if (matchCount === 0) {
        console.error(`\n❌ NO ENTRIES FOUND ON-CHAIN FOR OUTCOME: ${targetOutcome}`);
    } else {
        console.log(`\n🏁 COMPLETED: Sealed ${matchCount} matching entries.`);
    }
}

// TARGETING THE DUPLICATE NAME FOUND IN YOUR SCAN
runAuditAndSealByName("A-LEG-PrecedentCheck").catch(console.error);
