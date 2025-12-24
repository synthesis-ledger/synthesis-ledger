import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function mapV2() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const abi = ["function recipes(uint256 id) view returns (string outcome, string cid, uint256 successBps, bool golden)"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    console.log(`\n🗺️  DEEP-SCANNING V2.0 REGISTRY (0-100)...`);
    console.log(`${'ID'.padEnd(4)} | ${'OUTCOME'.padEnd(25)} | ${'BPS'.padEnd(6)} | ${'CID'}`);
    console.log("-".repeat(80));

    for (let i = 0; i <= 100; i++) {
        try {
            const r = await contract.recipes(i);
            // Only print if the CID is not empty
            if (r[1] && r[1] !== "") {
                console.log(`${i.toString().padEnd(4)} | ${r[0].padEnd(25)} | ${r[2].toString().padEnd(6)} | ${r[1]}`);
            }
        } catch (e) {
            // This is the fix: ignore the error at this specific ID and keep going
            continue; 
        }
    }
    console.log("\n🏁 SCAN COMPLETE.");
}
mapV2();
