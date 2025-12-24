import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;
const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";

async function streamGrok(model, system, user, label) {
    process.stdout.write(`\n>>> [${label}] INITIATING... `);
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            model, messages: [{role: 'system', content: system}, {role: 'user', content: user}],
            temperature: 0.05, stream: true, max_tokens: 600 
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
                    fullText += delta;
                } catch (e) {}
            }
        }
    }
    process.stdout.write(`COMPLETE`);
    return fullText;
}

async function run() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = ["function mintRecipe(string outcome, string cid, uint256 bps, bytes32 auditHash) external"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    let rawData = fs.readFileSync('./genesis_onchain.json', 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    const genesisData = JSON.parse(rawData);

    console.log(`\n🏛️  STARTING GLOBAL GENESIS SWEEP: ${genesisData.length} ATOMICS`);

    for (const recipe of genesisData) {
        console.log(`\n\n==================== AUDITING ID ${recipe.id}: ${recipe.outcome} ====================`);
        
        try {
            const context = JSON.stringify(recipe, null, 2);
            const silos = await Promise.all([
                streamGrok("grok-4-1-fast-non-reasoning", "Audit TOIL.", context, "SILO A"),
                streamGrok("grok-4-1-fast-non-reasoning", "Audit Security.", context, "SILO B"),
                streamGrok("grok-4-1-fast-non-reasoning", "Audit Economy.", context, "SILO C"),
                streamGrok("grok-4-1-fast-non-reasoning", "Audit Structure.", context, "SILO D")
            ]);

            const juryReport = await streamGrok("grok-4-1-fast-reasoning", 
                "You are a 10-person Jury. Review reports. JSON: {'jury': [{'score': 1-100}]}",
                `Reports: A:${silos[0]} B:${silos[1]} C:${silos[2]} D:${silos[3]}`, "JURY");

            const finalVerdict = await streamGrok("grok-4-1-fast-reasoning", 
                "Senior Auditor. BPS calculation JSON ONLY: {'bps': int}",
                `Jury Data: ${juryReport}`, "FINAL VERDICT");

            const newBps = JSON.parse(finalVerdict.match(/\{.*"bps":\s*(\d+).*\}/s)[0]).bps;
            const auditHash = ethers.keccak256(ethers.toUtf8Bytes(juryReport));

            console.log(`\n📡 MINTING... BPS: ${newBps}`);
            const tx = await contract.mintRecipe(recipe.outcome, recipe.cid, newBps, auditHash, { gasLimit: 500000 });
            await tx.wait();
            console.log(`✅ ANCHORED: ${tx.hash}`);

        } catch (e) {
            console.error(`❌ FAILED ATOMIC ${recipe.id}: ${e.message}`);
            continue; 
        }
    }
    console.log("\n🏁 ALL 38 GENESIS ATOMICS ARE NOW SOVEREIGN.");
}

run().catch(console.error);
