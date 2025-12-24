import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
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
    const TARGET_ID = 25; // Updated to test ID 25
    console.log(`🏛️  FULL CONTEXT SOVEREIGN AUDIT: ID ${TARGET_ID}`);

    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);

    const genesisData = JSON.parse(rawData);
    const fullRecipe = genesisData.find(item => item.id === TARGET_ID);

    if (!fullRecipe) {
        console.error(`❌ ID ${TARGET_ID} not found in genesis_onchain.json`);
        return;
    }

    const context = JSON.stringify(fullRecipe, null, 2);
    console.log(`📦 Full Context Extracted for: ${fullRecipe.outcome} (${context.length} characters)`);

    // PHASE 1: 4 BLIND SILOS
    const siloA = await streamGrok("grok-4-1-fast-non-reasoning", 
        "SRE Specialist: Audit for TOIL and operational waste in Technical Specification and SRE Metrics.", context, "SILO A: TOIL");
    
    const siloB = await streamGrok("grok-4-1-fast-non-reasoning", 
        "Security Architect: Audit for vulnerabilities in the Core Logic, JSON Schemas, and BPS Matrix.", context, "SILO B: SECURITY");
    
    const siloC = await streamGrok("grok-4-1-fast-non-reasoning", 
        "Economist: Audit for incentive gaming and economic arbitrage in BPS Aggregation.", context, "SILO C: ECONOMY");
    
    const siloD = await streamGrok("grok-4-1-fast-non-reasoning", 
        "Technical Architect: Audit for structural integrity and pattern compliance.", context, "SILO D: STRUCTURE");

    // PHASE 2: THE 10-PERSON JURY
    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "You are a 10-person Jury. Review the 4 reports. Each member provides a 1-sentence verdict and a 1-100 severity score. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}, ...]}",
        `Reports:\nTOIL: ${siloA}\nSECURITY: ${siloB}\nECONOMY: ${siloC}\nSTRUCTURE: ${siloD}`, 
        "10-PERSON JURY PANEL"
    );

    // PHASE 3: FINAL SYNTHESIS
    await streamGrok("grok-4-1-fast-reasoning", 
        "Senior Auditor. Calculate Final BPS: 10000 - (Avg_Jury_Score * 20). Output JSON ONLY.",
        `Jury Data: ${juryReport}`, 
        "FINAL SOVEREIGN VERDICT"
    );
}

run().catch(console.error);
