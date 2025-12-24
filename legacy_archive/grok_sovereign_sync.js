import { ethers } from 'ethers';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const XAI_KEY = process.env.XAI_API_KEY;
const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function streamGrok(model, system, user, label) {
    process.stdout.write(`\n\n>>> [${label}] INITIATING (${model}) <<<\n`);
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            model, 
            messages: [{role: 'system', content: system}, {role: 'user', content: user}], 
            temperature: 0.01, 
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

async function runGrokInjection() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = [
        "function add(string outcome, string cid, uint256 bps) external",
        "function recipes(uint256 id) view returns (string, string, uint256, bool)"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 1. FORENSIC AUDIT VIA GROK 4.1 REASONING
    const target = "A-HC-PathValidator";
    const context = "Outcome: A-HC-PathValidator | CID: ar://SYNTH_ATOMIC_HC_PATHVALIDATOR";
    
    const audit = await streamGrok("grok-4-1-fast-reasoning", 
        "You are the Senior Sovereign Auditor. Conduct a forensic risk assessment. Output ONLY a JSON object with the final BPS calculation: {'bps': int}", 
        context, "GROK 4.1 AUDIT");

    const newBps = JSON.parse(audit.match(/\{.*"bps":\s*(\d+).*\}/s)[0]).bps;
    console.log(`\n\n🎯 GROK CALCULATED BPS: ${newBps}`);

    // 2. SURGICAL INJECTION
    console.log(`🚀 ATTEMPTING INJECTION INTO SLOT 5...`);
    try {
        const nonce = await provider.getTransactionCount(wallet.address, "latest");
        const tx = await contract.add(
            target, 
            "ar://SYNTH_ATOMIC_HC_PATHVALIDATOR", 
            newBps, 
            { gasLimit: 500000, nonce: nonce }
        );

        console.log(`📡 TX: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ SLOT 5 SECURED.`);
    } catch (e) {
        console.error(`\n❌ INJECTION REVERTED.`);
        console.error(`Reason: ${e.message}`);
        console.log("\n💡 Logic Check: If 'add' fails at Slot 5, the V2.0 Anchor may require a Batch Initialization. Checking Registry structure...");
    }
}

runGrokInjection();
