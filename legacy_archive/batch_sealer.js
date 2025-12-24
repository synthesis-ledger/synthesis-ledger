import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;

async function streamGrok(model, system, user, label) {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            model, 
            messages: [{role: 'system', content: system}, {role: 'user', content: user}],
            temperature: 0.05,
            max_tokens: 600 
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function runBatch() {
    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const genesisData = JSON.parse(rawData);

    console.log(`🏛️  STARTING GLOBAL FORENSIC SEALING: ${genesisData.length} Atomics`);

    for (const recipe of genesisData) {
        console.log(`\n🔍 Auditing ID ${recipe.id}: ${recipe.outcome}...`);
        const context = JSON.stringify(recipe, null, 2);

        // Blind Silos
        const [sA, sB, sC, sD] = await Promise.all([
            streamGrok("grok-4-1-fast-non-reasoning", "SRE Auditor: Audit TOIL/Waste.", context),
            streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit Logic/Bugs.", context),
            streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit Game Theory/Exploits.", context),
            streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect: Audit Structure.", context)
        ]);

        // Jury Vote
        const jury = await streamGrok("grok-4-1-fast-reasoning", 
            "10-Person Jury: Provide 1-100 severity scores. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}",
            `Reports: A:${sA}\nB:${sB}\nC:${sC}\nD:${sD}`);

        // Final BPS
        const final = await streamGrok("grok-4-1-fast-reasoning", 
            "Senior Auditor: Calculate BPS (10000 - Avg_Jury_Score * 20). JSON ONLY.", 
            jury);

        const bpsResult = JSON.parse(final.replace(/```json|```/g, ''));
        
        // SAVE INDIVIDUAL LOG
        const logData = { id: recipe.id, outcome: recipe.outcome, bps: bpsResult.FinalBPS, silos: { sA, sB, sC, sD }, jury: JSON.parse(jury.replace(/```json|```/g, '')) };
        fs.writeFileSync(`./site/forensics/ID_${recipe.id}.json`, JSON.stringify(logData, null, 2));
        console.log(`✅ ID ${recipe.id} SEALED: ${bpsResult.FinalBPS} BPS`);
    }
}
runBatch();
