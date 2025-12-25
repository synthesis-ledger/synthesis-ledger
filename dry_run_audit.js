import fetch from 'node-fetch';
import fs from 'fs';
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

async function runDemo() {
    console.log("🏛️  HORPESTAD V3: LIVE COMMUNITY AUDIT DEMO");
    const manifest = JSON.parse(fs.readFileSync('./genesis_onchain.json', 'utf8'));
    const recipe = manifest.find(r => r.id === 23); // Testing Model Alignment
    const context = JSON.stringify(recipe, null, 2);

    // Watch the Silos work in parallel
    const silos = await Promise.all([
        streamGrok("grok-4-1-fast-non-reasoning", "SRE Specialist: Audit for TOIL.", context, "SILO A: TOIL"),
        streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit for vulnerabilities.", context, "SILO B: SECURITY"),
        streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit for game theory flaws.", context, "SILO C: ECONOMY"),
        streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect: Audit for structural integrity.", context, "SILO D: STRUCTURE")
    ]);

    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "10-person Jury verdict. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}",
        `Reports:\nTOIL: ${silos[0]}\nSECURITY: ${silos[1]}\nECONOMY: ${silos[2]}\nSTRUCTURE: ${silos[3]}`, "JURY CONSENSUS");

    console.log(`\n\n**************************************************`);
    console.log(`🏁 AUDIT COMPLETE FOR: ${recipe.outcome}`);
    console.log(`JURY SUMMARY: ${juryReport.substring(0, 200)}...`);
    console.log(`**************************************************`);
}

runDemo().catch(console.error);