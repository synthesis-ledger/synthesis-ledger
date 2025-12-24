import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function sovereignSealV2(targetCid, newBps) {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // We use the EXACT signature found in the bytecode: seal(uint256,uint256)
    const abi = [
        "function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)",
        "function seal(uint256 id, uint256 bps) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🔍 HUNTING CID ON V2.0 ANCHOR: ${targetCid}`);

    for (let i = 0; i <= 20; i++) {
        try {
            const recipe = await contract.recipes(i);
            if (recipe[1] === targetCid) {
                console.log(`🎯 MATCH FOUND AT ID: ${i}`);
                console.log(`⚖️  CURRENT BPS: ${recipe[2]}`);
                console.log(`🚀 EXECUTING SOVEREIGN SEAL: seal(${i}, ${newBps})`);

                const tx = await contract.seal(i, newBps, { 
                    gasLimit: 200000 
                });

                console.log(`📡 TX SENT: ${tx.hash}`);
                await tx.wait();
                console.log(`\n✅ MANIFESTO SEALED ON V2.0 ANCHOR.`);
                return;
            }
        } catch (e) { continue; }
    }
    console.error("❌ CID NOT FOUND IN V2.0 REGISTRY.");
}

// Sealing the PrecedentCheck (8440 BPS)
sovereignSealV2("ar://SYNTH_ATOMIC_LEG_PRECEDENTCHECK", 8440);
