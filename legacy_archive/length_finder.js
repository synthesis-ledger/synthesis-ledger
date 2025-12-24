import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function findLength() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const abi = ["function recipes(uint256 id) view returns (string, string, uint256, bool)"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    let low = 0;
    let high = 200;
    let length = 0;

    console.log("🔍 BRUTE-FORCING REGISTRY LENGTH...");

    for (let i = 0; i < high; i++) {
        try {
            await contract.recipes(i);
            length = i + 1;
        } catch (e) {
            break; 
        }
    }

    console.log(`✅ CURRENT REGISTRY LENGTH: ${length}`);
    console.log(`💡 NEXT SLOT SHOULD BE ID: ${length}`);
}
findLength();
