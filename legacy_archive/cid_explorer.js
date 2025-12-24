import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function exploreCids() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const abi = ["function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    const targetCid = "ar://SYNTH_ATOMIC_HC_PATHVALIDATOR";
    console.log(`\n🔍 DEEP SCANNING PROTOCOL ANCHOR: ${CONTRACT_ADDRESS}`);
    console.log(`🎯 HUNTING FOR CID: ${targetCid}\n`);
    console.log(`${'-'.repeat(80)}`);
    console.log(`${'ID'.padEnd(5)} | ${'OUTCOME'.padEnd(25)} | ${'CID'}`);
    console.log(`${'-'.repeat(80)}`);

    let found = false;
    for (let i = 0; i < 100; i++) {
        try {
            const recipe = await contract.recipes(i);
            
            // Skip empty/uninitialized slots
            if (!recipe[0] || recipe[1] === "") continue;

            const isMatch = (recipe[1] === targetCid);
            const marker = isMatch ? " ⭐ MATCH" : "";
            
            console.log(`${i.toString().padEnd(5)} | ${recipe[0].padEnd(25)} | ${recipe[1]}${marker}`);

            if (isMatch) {
                found = true;
                console.log(`\n✅ CID FOUND AT INDEX: ${i}`);
            }
        } catch (e) {
            // End of registry or error
            break;
        }
    }

    if (!found) {
        console.log(`\n❌ CID NOT FOUND in first 100 slots.`);
        console.log(`💡 Suggestion: If the registry is empty, you need to 'addRecipe' to the V2.0 contract first.`);
    }
}

exploreCids();
