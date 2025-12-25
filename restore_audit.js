/**
 * RESTORE_AUDIT.JS - Horpestad V3 Hardened Standard
 * Mode: DRY RUN (Local Audit / No Gas)
 * Fixes: Regex BPS extraction and Jury Score scaling.
 */
import fetch from 'node-fetch';
import fs from 'fs';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;

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
            max_tokens: 1000 
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`[${label}] API Error: ${response.status} - ${errText}`);
    }

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

async function runRestoreAudit() {
    console.log("🏛️  STARTING HARDENED RESTORATION AUDIT: ATOMIC 23");
    
    // 1. Load Registry
    const manifest = JSON.parse(fs.readFileSync('./genesis_onchain.json', 'utf8'));
    const recipe = manifest.find(r => r.id === 23); 
    const context = JSON.stringify(recipe, null, 2);

    // 2. Sequential Adversarial Silos (Grok 4.1 Fast NT)
    const siloA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Specialist: Audit for TOIL and operational waste.", context, "SILO A: TOIL");
    const siloB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit for vulnerabilities.", context, "SILO B: SECURITY");
    const siloC = await streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit for game theory flaws.", context, "SILO C: ECONOMY");
    const siloD = await streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect: Audit for structural integrity.", context, "SILO D: STRUCTURE");

    // 3. Jury Synthesis (Enforce 1-100 scale)
    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "You are a 10-person Jury. Review the 4 technical reports. Each member provides a 1-sentence verdict and a 1-100 severity score (100 = SYSTEM BREAKDOWN). JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}",
        `Reports:\nTOIL: ${siloA}\nSECURITY: ${siloB}\nECONOMY: ${siloC}\nSTRUCTURE: ${siloD}`, "JURY");

    // 4. Final BPS Calculation (Hardened Extraction)
    const finalVerdict = await streamGrok("grok-4-1-fast-reasoning", 
        "Senior Auditor. Calculate Final BPS: 10000 - (Avg_Jury_Score * 20). Output ONLY the final 4-digit number.",
        `Jury Data: ${juryReport}`, "FINAL VERDICT");

    // Regex Fix: Look for the LAST 4-digit number to avoid catching '10000'
    const bpsMatches = finalVerdict.match(/\d{4}/g);
    const newBps = bpsMatches ? parseInt(bpsMatches[bpsMatches.length - 1]) : 7800;

    console.log(`\n\n**************************************************`);
    console.log(`🏁 RESTORATION COMPLETE: ${recipe.outcome}`);
    console.log(`FINAL CALCULATED BPS: ${newBps}`);
    console.log(`STRIKE STATUS: ${newBps < 7800 ? "⚠️  STRIKE ISSUED" : "✅  PASSED"}`);
    console.log(`DRY RUN: No transaction sent to Base Mainnet.`);
    console.log(`**************************************************`);
}

runRestoreAudit().catch(err => console.error(`\n❌ AUDIT CRASHED: ${err.message}`));