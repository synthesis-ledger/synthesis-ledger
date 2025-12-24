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
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 bps, uint256 strikes, uint256 timestamp, bool active, bytes32 hash)",
        "function mintRecipe(string outcome, string cid, uint256 bps, bytes32 initialAuditHash) external",
        "function setBps(uint256 id, uint256 newBps, bytes32 auditHash) external",
        "function nextId() view returns (uint256)"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`🏛️  FULL CONTEXT SOVEREIGN AUDIT & SEAL: ID ${TARGET_ID}`);

    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const genesisData = JSON.parse(rawData);
    const fullRecipe = genesisData.find(item => item.id === TARGET_ID);

    if (!fullRecipe) { console.error(`❌ ID ${TARGET_ID} not found in manifest.`); return; }

    // --- PHASE 1: THE WINNING AUDIT LOGIC ---
    const context = JSON.stringify(fullRecipe, null, 2);
    const sA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Specialist: Audit TOIL.", context, "SILO A: TOIL");
    const sB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit Logic.", context, "SILO B: SECURITY");
    const sC = await streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit Game Theory.", context, "SILO C: ECONOMY");
    const sD = await streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect: Audit Structural Integrity.", context, "SILO D: STRUCTURE");

    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "You are a 10-person Jury. Review the 4 reports. JSON: {'jury': [{'voter': 1, 'score': 1-100, 'verdict': '...'}]}",
        `Reports:\nTOIL: ${sA}\nSECURITY: ${sB}\nECONOMY: ${sC}\nSTRUCTURE: ${sD}`, "JURY");

    const finalResult = await streamGrok("grok-4-1-fast-reasoning", 
        "Senior Auditor. Calculate Final BPS: 10000 - (Avg_Jury_Score * 20). Output JSON ONLY: {'bps': int}",
        `Jury Data: ${juryReport}`, "FINAL SOVEREIGN VERDICT");

    const newBps = JSON.parse(finalResult.match(/\{.*"bps":\s*(\d+).*\}/s)[0]).bps;
    const auditHash = ethers.keccak256(ethers.toUtf8Bytes(juryReport));

    console.log(`\n🎯 AUDIT COMPLETE. TARGET BPS: ${newBps}`);

    // --- PHASE 2: BLOCKCHAIN UPDATE ---
    console.log(`🛰️  SYNCING TO V2 ANCHOR...`);
    
    let existingCid = "";
    try {
        const onChain = await contract.recipes(TARGET_ID);
        existingCid = onChain.cid;
    } catch (e) {}

    if (existingCid === "") {
        console.log(`📡 ID ${TARGET_ID} empty on V2. MINTING NEW ENTRY...`);
        const tx = await contract.mintRecipe(fullRecipe.outcome, fullRecipe.cid, newBps, auditHash, { gasLimit: 500000 });
        console.log(`⏳ Mint TX: ${tx.hash}`);
        await tx.wait();
    } else {
        console.log(`📡 ID ${TARGET_ID} exists. UPDATING BPS...`);
        const tx = await contract.setBps(TARGET_ID, newBps, auditHash, { gasLimit: 500000 });
        console.log(`⏳ Update TX: ${tx.hash}`);
        await tx.wait();
    }
    console.log(`✅ ID ${TARGET_ID} OFFICIALLY SEALED ON-CHAIN.`);
}

run().catch(console.error);
