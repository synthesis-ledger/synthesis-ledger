import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function probeState() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const abi = [
        "function owner() view returns (address)",
        "function paused() view returns (bool)",
        "function locked() view returns (bool)",
        "function recipeCount() view returns (uint256)",
        "function manager() view returns (address)"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    console.log(`\n🔍 PROBING V2.0 ANCHOR STATE...`);
    
    const results = {};
    const checks = ['owner', 'paused', 'locked', 'recipeCount', 'manager'];
    
    for (const method of checks) {
        try {
            results[method] = await contract[method]();
            console.log(`✅ ${method.padEnd(12)}: ${results[method]}`);
        } catch (e) {
            console.log(`❌ ${method.padEnd(12)}: Not implemented`);
        }
    }

    if (results.paused === true || results.locked === true) {
        console.log("\n⚠️  FOUND IT: The registry is currently LOCKED or PAUSED.");
    }
}
probeState();
