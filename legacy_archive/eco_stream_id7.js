import fetch from 'node-fetch';
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
            temperature: 0.1,
            stream: true,
            max_tokens: 400 
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
    // Target ID 7 from the Base Mainnet Registry
    const target = "A-HR-OutcomeExtract | ID 7 | Seed 777"; 
    console.log(`🌿 ECO-STREAM: Institutional Consensus for ID 7 (HR Category)`);

    // PHASE 1: 4 BLIND SILOS (Parallel Logic, Sequential Output)
    const siloA = await streamGrok("grok-4-1-fast-non-reasoning", "SRE Auditor: Audit for TOIL and manual cognitive waste.", target, "SILO A: TOIL");
    const siloB = await streamGrok("grok-4-1-fast-non-reasoning", "Security Lead: Audit for data privacy and siphoning exploits.", target, "SILO B: SECURITY");
    const siloC = await streamGrok("grok-4-1-fast-non-reasoning", "Economist: Audit for incentive gaming in HR outcomes.", target, "SILO C: ECONOMY");
    const siloD = await streamGrok("grok-4-1-fast-non-reasoning", "Architect: Audit for structural pattern compliance.", target, "SILO D: STRUCTURE");

    // PHASE 2: THE 10-PERSON JURY
    const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
        "You are a 10-person Jury. Review the 4 reports. Each member provides a 1-sentence verdict and a 1-100 severity score. JSON: {'jury': [{'voter': 1, 'score': int, 'verdict': '...'}, ...]}",
        `Reports: A:${siloA}, B:${siloB}, C:${siloC}, D:${siloD}`, 
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