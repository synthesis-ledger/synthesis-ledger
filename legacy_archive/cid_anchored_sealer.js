import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function sealByCid(targetCid, newBps) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // ABI focusing on the functions that only touch BPS
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function setSuccessBps(uint256 id, uint256 bps) external",
        "function sealBps(uint256 id, uint256 bps) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🔍 SEARCHING FOR CID: ${targetCid}`);

    for (let i = 0; i <= 39; i++) {
        try {
            const onChain = await contract.recipes(i);
            if (onChain[1] === targetCid) {
                console.log(`🎯 MATCH FOUND AT ID: ${i}`);
                console.log(`⚖️  CURRENT BPS: ${onChain[2]}`);
                console.log(`🚀 SEALING NEW FORENSIC BPS: ${newBps}`);

                // Attempt to update ONLY the BPS
                let tx;
                try {
                    console.log("Trying setSuccessBps...");
                    tx = await contract.setSuccessBps(i, newBps);
                } catch (e) {
                    console.log("Fallback to sealBps...");
                    tx = await contract.sealBps(i, newBps);
                }

                console.log(`📡 TX SENT: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ SUCCESS: CID ${targetCid} is now sealed at ${newBps}`);
                return;
            }
        } catch (e) { continue; }
    }
    console.error("❌ CID NOT FOUND ON-CHAIN.");
}

// Targeting the PrecedentCheck CID with the last calculated BPS
sealByCid("ar://SYNTH_ATOMIC_LEG_PRECEDENTCHECK", 8440);
