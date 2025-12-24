import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function checkFrontier() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const abi = ["function nextId() view returns (uint256)"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const nextId = await contract.nextId();
    console.log(`\n🚀 V2 ANCHOR FRONTIER: ID ${nextId}`);
    console.log(`💡 If this is > 25, we cannot 'mint' ID 25.`);
    console.log(`💡 If this is <= 25, we can fill it.`);
}
checkFrontier();
