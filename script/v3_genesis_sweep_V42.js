import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

/**
 * v3_genesis_sweep_V42.js
 * Author: Lars O. Horpestad | AI ThinkLab
 * Purpose: Automated Forensic Auditing via Multi-Model Consensus (MMC).
 * Logic: Fetches CID from Ledger, Audits via Arweave, updates BPS.
 */

const XAI_KEY = process.env.XAI_API_KEY; //
const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613"; // V42 Ledger

async function streamGrok(model, system, user, label) {
    process.stdout.write(`\n>>> [${label}] INITIATING (${model}) <<<\n`);
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            model, 
            messages: [{role: 'system', content: system}, {role: 'user', content: user}],
            temperature: 0, // Deterministic Hardening
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
    return fullText;
}

async function runSovereignSweep() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider); //
    
    // V42 ABI: Targeted JUROR interactions
    const abi = [
        "function registry(string) view returns (string, address, uint256, uint256, bool)",
        "function issueStrike(string, uint256) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🏛️  V42 IMMUNE SYSTEM ACTIVE | AUDITING GLOBAL LEDGER`);

    for (let i = 0; i < 38; i++) {
        const atomicId = `A-GENESIS-${String(i).padStart(2, '0')}`;
        
        // 1. FETCH PERMAWEB POINTER FROM BASE
        const [cid, creator, bps, strikes, obsolete] = await contract.registry(atomicId);
        if (obsolete) {
            console.log(`\n⏭️  ID ${atomicId} IS OBSOLETE. SKIPPING.`);
            continue;
        }

        console.log(`\n🚀 AUDITING ATOMIC ${atomicId} | CID: ${cid}`);

        // 2. PULL IMMUTABLE LOGIC FROM ARWEAVE
        const arweaveData = await fetch(`https://arweave.net/${cid}`).then(res => res.json());
        const context = JSON.stringify(arweaveData);

        // 3. MULTI-MODEL CONSENSUS (MMC) ADVERSARIAL AUDIT
        const silos = await Promise.all([
            streamGrok("grok-4.1-fast-non-reasoning", "SRE Auditor: Audit for Logic Drift and Toil.", context, "SILO A: TOIL"),
            streamGrok("grok-4.1-fast-non-reasoning", "Security Architect: Audit for structural leakage.", context, "SILO B: SECURITY"),
            streamGrok("grok-4.1-fast-non-reasoning", "Economist: Audit for IP Royalty arbitrage.", context, "SILO C: ECONOMY"),
            streamGrok("grok-4.1-fast-non-reasoning", "Technical Architect: Audit for structural integrity.", context, "SILO D: STRUCTURE")
        ]);

        const juryReport = await streamGrok("grok-4.1-fast-reasoning", 
            "10-person Jury verdict. Each provide a 1-sentence verdict and 1-100 severity score. JSON: {'jury': [{'score': int}]}",
            `Reports:\n${silos.join('\n')}`, "JURY CONSENSUS");

        const finalVerdict = await streamGrok("grok-4.1-fast-reasoning", 
            "Senior Auditor. Calculate Final BPS: 10000 - (Avg_Jury_Score * 20). Output JSON ONLY: {'bps': int}",
            `Jury Data: ${juryReport}`, "FORENSIC VERDICT");

        try {
            // Regex Fix: Look for the LAST 4-digit number to avoid catching '10000'
            const bpsMatch = finalVerdict.match(/\{.*"bps":\s*(\d+).*\}/s);
            const newBps = bpsMatch ? JSON.parse(bpsMatch[0]).bps : 8000;

            console.log(`\n📡 COMMITTING COLD TRUTH TO BASE... BPS: ${newBps}`);
            
            // 4. TRIGGER IMMUNE SYSTEM (Strike/Siphon Logic)
            const tx = await contract.issueStrike(atomicId, newBps);
            await tx.wait();
            
            console.log(`✅ AUDIT SEALED FOR ${atomicId}.`);
            
        } catch (err) {
            console.error(`❌ MMC FAILURE ON ${atomicId}:`, err.message);
            await new Promise(r => setTimeout(r, 10000)); // Cooldown
        }
    }
    console.log("\n🏁 GLOBAL SWEEP COMPLETE. THE IMMUNE SYSTEM IS HARDENED.");
}

runSovereignSweep().catch(console.error);