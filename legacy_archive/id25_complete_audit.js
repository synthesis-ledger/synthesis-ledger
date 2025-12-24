import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
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

async function runCompleteCycle(targetId) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function mintRecipe(string outcome, string cid, uint256 bps, bytes32 initialAuditHash) external",
        "function nextId() view returns (uint256)"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`🏛️  FULL CONTEXT SOVEREIGN AUDIT & SEAL: ID ${targetId}`);

    // 1. DATA EXTRACTION
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const recipe = JSON.parse(rawData).find(item => item.id === targetId);
    if (!recipe) throw new Error(`ID ${targetId} not found locally.`);

    const context = JSON.stringify(recipe, null, 2);

    // 2. MULTI-SILO AUDIT
    const sA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Auditor: Audit TOIL.", context, "SILO A");
    const sB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Auditor: Audit Logic.", context, "SILO B");
    const sC = await streamGrok("grok-4-1-fast-non-reasoning", "Economic Auditor: Audit Arbitrage.", context, "SILO C");
    const sD = await streamGrok("grok-4-1-fast-non-reasoning", "Architect: Audit Structure.", context, "SILO D");

    // 3. JURY & BPS CALCULATION
    const jury = await streamGrok("grok-4-1-fast-reasoning", "10-person Jury. Output severity JSON: {'jury': [{'voter': 1, 'score': int}]}", `Reports: A:${sA}\nB:${sB}\nC:${sC}\nD:${sD}`, "JURY");
    const final = await streamGrok("grok-4-1-fast-reasoning", "Senior Auditor. Output JSON ONLY: {'bps': 10000-(avg_score*20)}", jury, "FINAL VERDICT");
    
    const newBps = JSON.parse(final.match(/\{.*"bps":\s*(\d+).*\}/s)[0]).bps;
    
    // 4. BLOCKCHAIN SEAL
    const auditHash = ethers.keccak256(ethers.toUtf8Bytes(sA + sB + sC + sD));
    console.log(`\n🎯 FORENSIC BPS: ${newBps}`);
    console.log(`🔗 AUDIT HASH: ${auditHash}`);
    console.log(`🚀 MINTING TO V2 ANCHOR...`);

    const tx = await contract.mintRecipe(recipe.outcome, recipe.cid, newBps, auditHash, { gasLimit: 500000 });
    console.log(`📡 TX SENT: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ ID ${targetId} SUCCESSFULLY AUDITED AND SEALED ON V2.`);
}

runCompleteCycle(25).catch(console.error);
