import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function injectSlot5() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // We use the signature that matches selector 0x91d14854
    const abi = [
        "function add(string outcome, string cid, uint256 bps) external",
        "function create(string outcome, string cid, uint256 bps, bool golden) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🚀 INJECTING PATHVALIDATOR INTO SLOT 5...`);

    try {
        const outcome = "A-HC-PathValidator";
        const cid = "ar://SYNTH_ATOMIC_HC_PATHVALIDATOR";
        const bps = 8720;

        console.log(`- Calling: add("${outcome}", "${cid}", ${bps})`);

        const tx = await contract.add(outcome, cid, bps, { 
            gasLimit: 400000 
        });

        console.log(`📡 TX SENT: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ SUCCESS: PathValidator is now live at ID 5.`);

    } catch (e) {
        console.log("⚠️  'add' failed. Trying 'create' selector (0xfaa95bc1)...");
        try {
            const tx2 = await contract.create("A-HC-PathValidator", "ar://SYNTH_ATOMIC_HC_PATHVALIDATOR", 8720, false);
            await tx2.wait();
            console.log("✅ SUCCESS: PathValidator created via 'create' function.");
        } catch (e2) {
            console.error("❌ BOTH SELECTORS FAILED.");
            console.error("Error 1:", e.message);
            console.error("Error 2:", e2.message);
        }
    }
}

injectSlot5();
