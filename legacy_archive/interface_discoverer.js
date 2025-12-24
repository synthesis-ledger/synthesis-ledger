import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function discover() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    console.log(`\n🔍 ANALYZING V2.0 ANCHOR BYTECODE...`);
    
    // Common Registry Function Selectors
    const dictionary = {
        "0xe063aa9f": "updateRecipe(uint256,string,string,uint256,bool)",
        "0x1af58087": "addRecipe(string,string,uint256,bool)",
        "0x35634563": "setRecipe(uint256,string,string,uint256,bool)",
        "0x7f25902b": "setSuccessBps(uint256,uint256)",
        "0x9f566e10": "updateBps(uint256,uint256)",
        "0x18128312": "register(string,string,uint256)"
    };

    let found = [];
    for (const [selector, name] of Object.entries(dictionary)) {
        if (code.includes(selector.slice(2))) {
            found.push(name);
            console.log(`✅ FOUND: ${name} (${selector})`);
        }
    }

    if (found.length === 0) {
        console.log("❌ No standard selectors detected. Looking for ANY function-like patterns...");
        // Look for the push4 patterns typical of function routing
        const matches = code.match(/63([0-9a-f]{8})|8063([0-9a-f]{8})/g);
        if (matches) {
            console.log("\nPotential Method Selectors in Bytecode:");
            matches.slice(0, 15).forEach(m => console.log(`- 0x${m.slice(-8)}`));
        }
    }
}

discover();
