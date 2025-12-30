import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

/**
 * v3_genesis_sweep_V42.js
 * Author: Lars O. Horpestad
 * Purpose: Automated Forensic Auditing via Multi-Model Consensus (MMC).
 * Logic: Fetches CID from Ledger, Audits via Arweave, updates BPS.
 */

const XAI_KEY = process.env.XAI_API_KEY;
const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";

// --- THE MMC JURY ENGINE ---
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
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // V42 ABI: Focus on MMC and Striking
    const abi = [
        "function registry(string) view returns (string, address, uint256, uint256, bool, uint256)",
        "function issueStrike(string, uint256) external"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🏛️  V42 IMMUNE SYSTEM ACTIVE | AUDITING GLOBAL LEDGER`);

    // We iterate through the 38 Genesis IDs directly on-chain
    for (let i = 0; i < 38; i++) {
        const atomicId = `A-GENESIS-${String(i).padStart(2, '0')}`;
        
        // 1. FETCH PERMAWEB POINTER
        const [cid, creator, bps, strikes, obsolete] = await contract.registry(atomicId);
        if (obsolete) {
            console.log(`\n⏭️  ID ${atomicId} IS OBSOLETE. SKIPPING.`);
            continue;
        }

        console.log(`\n🚀 AUDITING ATOMIC ${atomicId} | CID: ${cid}`);

        // 2. PULL LOGIC FROM ARWEAVE
        const arweaveData = await fetch(`https://arweave.net/${cid}`).then(res => res.json());
        const context = JSON.stringify(arweaveData);

        // 3. MULTI-MODEL CONSENSUS (MMC) ADVERSARIAL AUDIT
        // We simulate a 10-person jury by running multiple specialized silos
        const silos = await Promise.all([
            streamGrok("grok-4", "SRE Auditor: Audit for Logic Drift and Toil.", context, "SILO A: TOIL"),
            streamGrok("grok-4", "Security Architect: Audit for structural leakage.", context, "SILO B: SECURITY"),
            streamGrok("grok-4", "Economist: Audit for IP Royalty arbitrage.", context, "SILO C: ECONOMY"),
            streamGrok("grok-4", "Reasoning Core: Audit for structural integrity.", context, "SILO D: STRUCTURE")
        ]);

        const juryReport = await streamGrok("grok-4-reasoning", 
            "Audit Jury. Review the 4 silos. Provide 10 independent verdicts (1-100 severity). JSON: {'jury': [{'score': int}]}",
            `Reports:\n${silos.join('\n')}`, "JURY CONSENSUS");

        const finalVerdict = await streamGrok("grok-4-reasoning", 
            "Lead Forensics. Calculate BPS: 10000 - (Avg_Jury_Score * 20). Output JSON ONLY: {'bps': int}",
            `Jury Data: ${juryReport}`, "FORENSIC VERDICT");

        try {
            const result = JSON.parse(finalVerdict.match(/\{.*\}/s)[0]);
            const newBps = result.bps;

            console.log(`\n📡 COMMITTING COLD TRUTH TO BASE... BPS: ${newBps}`);
            
            // 4. THE IMMUNE SYSTEM TRIGGER
            // This function handles Strikes, Siphoning, and Royalties automatically
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