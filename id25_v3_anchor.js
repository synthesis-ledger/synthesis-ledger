import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;
const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";

async function streamGrok(model, system, user, label) {
    process.stdout.write(`\n\n>>> [${label}] INITIATING (${model}) <<<\n`);
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            model, 
            messages: [{role: 'system', content: system}, {role: 'user', content: user}],
            temperature: 0.05,
            stream: true,
            max_tokens: 600 
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

async function run() {
    const TARGET_ID = 25;
    console.log(`🏛️  FULL CONTEXT SOVEREIGN AUDIT: ID ${TARGET_ID}`);

    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const genesisData = JSON.parse(rawData);
    const fullRecipe = genesisData.find(item => item.id === TARGET_ID);

    if (!fullRecipe) {
        console.error(`❌ ID ${TARGET_ID} not found in manifest.`);
        return;
    }

    const context = JSON.stringify(fullRecipe, null, 2);
    console.log(`📦 Full Context Extracted (${context.length} characters)`);

    // PHASE 1: 4 BLIND SILOS (IDENTICAL TO WINNING RECIPE)
    // FIX: Assigned Promise.all results to variables
    const silos = await Promise.all([
        streamGrok("grok-4-1-fast-non-reasoning", "SRE Specialist: Audit for TOIL and operational waste in the provided Technical Specification and SRE Metrics.", context, "SILO A: TOIL"),
        streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit for vulnerabilities in the Core Logic, JSON Schemas, and BPS Matrix.", context, "SILO B: SECURITY"),
        streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit for incentive gaming and economic arbitrage in the BPS Aggregation and Path Score Computation.", context, "SILO C: ECONOMY"),
        streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect: Audit for structural integrity and pattern compliance with the Genesis-Platinum lifecycle.", context, "SILO D: STRUCTURE")
    ]);

    const [sA, sB, sC, sD] = silos;

    // PHASE 2: THE 10-PERSON JURY (IDENTICAL TO WINNING RECIPE)
    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "You are a 10-person Jury. Review the 4 technical reports. Each member provides a 1-sentence verdict and a 1-100 severity score. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}, ...]}",
        `Reports:\nTOIL: ${sA}\nSECURITY: ${sB}\nECONOMY: ${sC}\nSTRUCTURE: ${sD}`, 
        "10-PERSON JURY PANEL"
    );

    // PHASE 3: FINAL SYNTHESIS (IDENTICAL TO WINNING RECIPE)
    const finalVerdict = await streamGrok("grok-4-1-fast-reasoning", 
        "Senior Auditor. Calculate Final BPS: 10000 - (Avg_Jury_Score * 20). Output JSON ONLY.",
        `Jury Data: ${juryReport}`,
        "FINAL SOVEREIGN VERDICT"
    );

    // --- BLOCKCHAIN ANCHORING ADDITION ---
    console.log(`\n🛰️  INITIATING ON-CHAIN ANCHOR...`);
    try {
        const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const abi = ["function mintRecipe(string outcome, string cid, uint256 bps, bytes32 auditHash) external"];
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

        const bpsMatch = finalVerdict.match(/\{.*"bps":\s*(\d+).*\}/s);
        const newBps = bpsMatch ? JSON.parse(bpsMatch[0]).bps : 8000;
        const auditHash = ethers.keccak256(ethers.toUtf8Bytes(juryReport));

        console.log(`📡 Minting Slot 0 (ID 25 Data) to V3 Anchor...`);
        const tx = await contract.mintRecipe(fullRecipe.outcome, fullRecipe.cid, newBps, auditHash, { gasLimit: 500000 });

        console.log(`⏳ TX SENT: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ SUCCESS: ID 25 logic is anchored on Genesis V3.`);
    } catch (e) {
        console.error(`❌ BLOCKCHAIN ERROR: ${e.message}`);
    }
}

run().catch(console.error);
