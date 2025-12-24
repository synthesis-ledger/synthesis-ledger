import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function mintPathValidator() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // EXACT ABI for SynthesisGenesisV2.sol
    const abi = [
        "function mintRecipe(string outcome, string cid, uint256 bps, bytes32 initialAuditHash) external",
        "function nextId() view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`\n🚀 MINTING PATHVALIDATOR TO V2 ANCHOR...`);

    try {
        const outcome = "A-HC-PathValidator";
        const cid = "ar://SYNTH_ATOMIC_HC_PATHVALIDATOR";
        const bps = 8720; // Forensic BPS
        const auditHash = ethers.keccak256(ethers.toUtf8Bytes("Initial Grok-4.1 Forensic Audit"));

        console.log(`- Targeting Slot: ${await contract.nextId()}`);

        const tx = await contract.mintRecipe(outcome, cid, bps, auditHash, { 
            gasLimit: 500000 
        });

        console.log(`📡 TX SENT: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ SUCCESS: PathValidator is now live on V2.`);

    } catch (e) {
        console.error(`\n❌ MINTING FAILED`);
        console.error("Reason:", e.message);
    }
}

mintPathValidator();
