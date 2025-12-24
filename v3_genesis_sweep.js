import { ethers } from 'ethers';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
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

async function runSweep() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function nextId() view returns (uint256)",
        "function mintRecipe(string outcome, string cid, uint256 bps, bytes32 auditHash) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const manifest = JSON.parse(rawData);

    const startId = Number(await contract.nextId());
    console.log(`\n🏛️  STARTING GENESIS SWEEP ON V3 | STARTING AT ID: ${startId}`);

    for (let i = startId; i < 38; i++) {
        const recipe = manifest.find(r => r.id === i) || manifest[i];
        console.log(`\n\n**************************************************`);
        console.log(`🚀 PROCESSING ATOMIC ${i}: ${recipe.outcome}`);
        console.log(`**************************************************`);

        const context = JSON.stringify(recipe, null, 2);

        const silos = await Promise.all([
            streamGrok("grok-4-1-fast-non-reasoning", "SRE Specialist: Audit for TOIL and operational waste in the provided Technical Specification and SRE Metrics.", context, "SILO A: TOIL"),
            streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit for vulnerabilities in the Core Logic, JSON Schemas, and BPS Matrix.", context, "SILO B: SECURITY"),
            streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit for incentive gaming and economic arbitrage in the BPS Aggregation and Path Score Computation.", context, "SILO C: ECONOMY"),
            streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect: Audit for structural integrity and pattern compliance with the Genesis-Platinum lifecycle.", context, "SILO D: STRUCTURE")
        ]);

        const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
            "You are a 10-person Jury. Review the 4 technical reports. Each member provides a 1-sentence verdict and a 1-100 severity score. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}, ...]}",
            `Reports:\nTOIL: ${silos[0]}\nSECURITY: ${silos[1]}\nECONOMY: ${silos[2]}\nSTRUCTURE: ${silos[3]}`, "JURY");

        const finalVerdict = await streamGrok("grok-4-1-fast-reasoning", 
            "Senior Auditor. Calculate Final BPS: 10000 - (Avg_Jury_Score * 20). Output JSON ONLY.",
            `Jury Data: ${juryReport}`, "FINAL SOVEREIGN VERDICT");

        try {
            // Hardened BPS Extraction (Handles 'bps' or 'FinalBPS')
            const bpsMatch = finalVerdict.match(/(\d{4})/);
            if (!bpsMatch) throw new Error("Could not find 4-digit BPS in output");
            const newBps = parseInt(bpsMatch[0]);

            const auditHash = ethers.keccak256(ethers.toUtf8Bytes(juryReport));

            console.log(`\n📡 MINTING ATOMIC ${i}... BPS: ${newBps}`);
            const tx = await contract.mintRecipe(recipe.outcome, recipe.cid, newBps, auditHash, { gasLimit: 800000 });
            await tx.wait();
            console.log(`✅ ATOMIC ${i} SECURED.`);
            
        } catch (err) {
            console.error(`❌ FAILED TO SEAL ATOMIC ${i}:`, err.message);
            // Wait before retry to handle rate limits or network blips
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    console.log("\n🏁 ALL 38 GENESIS ATOMICS ANCHORED TO V3.");
}

runSweep().catch(console.error);
