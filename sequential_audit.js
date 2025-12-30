import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;

/**
 * Performs a real-time streaming audit for a specific silo.
 * Uses a sequential wait to ensure console output remains clean and ordered.
 */
async function streamGrok(model, system, user, label) {
    process.stdout.write(`\n\n>>> [${label}] INITIATING FORENSIC TEARDOWN (${model}) <<<\n`);
    
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${XAI_KEY}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
            model, 
            messages: [{role: 'system', content: system}, {role: 'user', content: user}],
            temperature: 0.05,
            stream: true 
        })
    });

    let fullText = "";
    const decoder = new TextDecoder();
    
    // Process the stream chunk by chunk for the "live chatter" feel
    for await (const chunk of response.body) {
        const lines = decoder.decode(chunk).split("\n");
        for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                    const data = JSON.parse(line.replace("data: ", ""));
                    const delta = data.choices[0]?.delta?.content || "";
                    process.stdout.write(delta); // Immediate console write
                    fullText += delta;
                } catch (e) {}
            }
        }
    }
    process.stdout.write(`\n>>> [${label}] ANALYSIS COMPLETE <<<\n`);
    return fullText;
}

async function runSovereignAudit() {
    console.log("🏛️  HORPESTAD V3: SEQUENTIAL COMMUNITY AUDIT DEMO");
    
    // 1. DATA EXTRACTION
    const manifest = JSON.parse(fs.readFileSync('./genesis_onchain.json', 'utf8'));
    const recipe = manifest.find(r => r.id === 23); // Target: A-PA-ModelAlign
    const context = JSON.stringify(recipe, null, 2);

    // 2. SEQUENTIAL SILO EXECUTION (Ordered & Predictable Flow)
    // Silo A: SRE/Waste
    const sA = await streamGrok("grok-4-1-fast-non-reasoning", 
        "SRE Specialist: Audit for TOIL and operational waste in technical specifications.", 
        context, "SILO A: TOIL");

    // Silo B: Security/Vulnerabilities
    const sB = await streamGrok("grok-4-1-fast-non-reasoning", 
        "Security Architect: Audit for vulnerabilities in core logic and schemas.", 
        context, "SILO B: SECURITY");

    // Silo C: Economy/Incentives
    const sC = await streamGrok("grok-4-1-fast-non-reasoning", 
        "Economist: Audit for incentive gaming and economic arbitrage.", 
        context, "SILO C: ECONOMY");

    // Silo D: Structure/Integrity
    const sD = await streamGrok("grok-4-1-fast-non-reasoning", 
        "Technical Architect: Audit for structural integrity and pattern compliance.", 
        context, "SILO D: STRUCTURE");

    // 3. JURY CONSENSUS (The Reasoning Tier)
    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "You are a 10-person Jury. Review the 4 reports and provide 10 severity scores (1-100). JSON ONLY: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}",
        `Reports:\nA:${sA}\nB:${sB}\nC:${sC}\nD:${sD}`, "JURY CONSENSUS");

    // 4. FINAL VERDICT (The BPS Calculation)
    const seedOffset = 45; // Hardcoded for ID 23 based on manifest history
    const finalVerdict = await streamGrok("grok-4-1-fast-reasoning", 
        `Senior Auditor. Calculate Final BPS: 10000 - (Avg_Jury_Score * 20) - ${seedOffset}. Return JSON ONLY.`,
        `Jury Data: ${juryReport}`, "FINAL BPS VERDICT");

    console.log(`\n\n**************************************************`);
    console.log(`🏁 SOVEREIGN SEAL COMPLETE FOR: ${recipe.outcome}`);
    console.log(`**************************************************\n`);
}

runSovereignAudit().catch(console.error);