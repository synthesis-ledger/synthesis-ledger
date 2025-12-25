import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;

async function streamGrok(model, system, user, label) {
    process.stdout.write(`\n>>> [${label}] INITIATING (${model}) <<< \n`);
    try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model, 
                messages: [{role: 'system', content: system}, {role: 'user', content: user}],
                temperature: 0.05
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(`API Error: ${data.error.message}`);
        }
        const result = data.choices?.[0]?.message?.content || "NO_RESPONSE";
        process.stdout.write(result.substring(0, 100) + "..."); // Print snippet
        process.stdout.write(`\n>>> [${label}] COMPLETE <<<\n`);
        return result;
    } catch (err) {
        process.stdout.write(`\n❌ [${label}] FAILED: ${err.message}\n`);
        return `Audit Failure: ${err.message}`;
    }
}

async function runTestAudit() {
    const rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    const manifest = JSON.parse(rawData);

    // Explicitly Audit Atomic 07 (Communication Resonance)
    const recipe = manifest.find(r => r.id === 7) || manifest[7];
    console.log(`\n🏛️  DRY RUN: AUDITING ATOMIC 07: ${recipe.outcome}`);

    const context = JSON.stringify(recipe, null, 2);

    const silos = await Promise.all([
        streamGrok("grok-4-1-fast-non-reasoning", "SRE Specialist Audit for operational waste.", context, "SILO A"),
        streamGrok("grok-4-1-fast-non-reasoning", "Security Architect Audit for vulnerabilities.", context, "SILO B"),
        streamGrok("grok-4-1-fast-non-reasoning", "Economist Audit for game theory flaws.", context, "SILO C"),
        streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect Audit for pattern compliance.", context, "SILO D")
    ]);

    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "10-person Jury verdict. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}",
        `Reports:\n${silos.join('\n')}`, "JURY");

    const finalVerdict = await streamGrok("grok-4-1-fast-reasoning", 
        "Senior Auditor. Calculate BPS: 10000 - (Avg_Score * 20). Output JSON ONLY.",
        `Jury Data: ${juryReport}`, "FINAL VERDICT");

    console.log("\n**************************************************");
    console.log(`🏁 TEST RESULT FOR ATOMIC 07`);
    console.log(`VERDICT: ${finalVerdict}`);
    console.log("**************************************************");
}

runTestAudit().catch(console.error);