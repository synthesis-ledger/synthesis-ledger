import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;

async function streamGrok(model, system, user, label) {
    console.log(`\n>>> [${label}] INITIATING (${model}) <<<`);
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

    if (!response.ok) {
        console.log(`❌ ERROR: ${response.status} - Key issues or Rate Limit.`);
        return "";
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
                    process.stdout.write(delta); // THIS FORCES THE PRINT
                    fullText += delta;
                } catch (e) {}
            }
        }
    }
    console.log(`\n>>> [${label}] COMPLETE <<<`);
    return fullText;
}

async function runSequentialAudit() {
    console.log("🏛️  HORPESTAD V3: SEQUENTIAL PROTOCOL AUDIT");
    const manifest = JSON.parse(fs.readFileSync('./genesis_onchain.json', 'utf8'));
    const recipe = manifest.find(r => r.id === 23); // A-PA-ModelAlign
    const context = JSON.stringify(recipe, null, 2);

    // RUNNING ONE BY ONE TO FORCE TERMINAL VISIBILITY
    const siloA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Specialist: Audit for TOIL.", context, "SILO A: TOIL");
    const siloB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Architect: Audit for vulnerabilities.", context, "SILO B: SECURITY");
    const siloC = await streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit for incentive gaming.", context, "SILO C: ECONOMY");
    const siloD = await streamGrok("grok-4-1-fast-non-reasoning", "Technical Architect: Audit for structural integrity.", context, "SILO D: STRUCTURE");

    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "10-person Jury verdict. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}]}",
        `Reports:\n${siloA}\n${siloB}\n${siloC}\n${siloD}`, "JURY CONSENSUS");

    console.log(`\n\n**************************************************`);
    console.log(`🏁 LIVE AUDIT FINISHED: ${recipe.outcome}`);
    console.log(`**************************************************`);
}

runSequentialAudit().catch(console.error);