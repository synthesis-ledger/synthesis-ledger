import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Sovereign_Claim_Gateway.js
 * Author: Lars O. Horpestad
 * Purpose: The "Hunt" interface. Manages $0.10 oracle fee payment and $SYNL reward claiming.
 * Usage: node Sovereign_Claim_Gateway.js <atomicId> <dataHash> <referrerAddress>
 */

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";

async function claimReward(atomicId, dataHash, referrer = ethers.ZeroAddress) {
    console.log(`\n🏛️  INITIATING V42 CLAIM GATEWAY`);
    console.log(`-----------------------------------`);

    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // V42 ABI: executeAndCertify is the master entry point for the $0.10 fee + claim
    const abi = [
        "function calculateSynlFee() view returns (uint256)",
        "function executeAndCertify(string, bytes32, address) external",
        "function executedHashes(bytes32) view returns (bool)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    try {
        // 1. ANTI-SPAM CHECK: Verify if hash has already been rewarded
        const isUsed = await contract.executedHashes(dataHash);
        if (isUsed) {
            console.error(`❌ FAILURE: Unique Data Hash [${dataHash}] already rewarded.`);
            process.exit(1);
        }

        // 2. ORACLE FETCH: Calculate the current $0.10 USD fee in $SYNL
        const synlFee = await contract.calculateSynlFee();
        const formattedFee = ethers.formatEther(synlFee);
        
        console.log(`>>> Current Oracle Fee ($0.10 USD): ${formattedFee} SYNL`);
        console.log(`>>> Targeting Atomic: ${atomicId}`);
        console.log(`>>> Referral Partner: ${referrer === ethers.ZeroAddress ? 'None' : referrer}`);

        // 3. EXECUTION & REWARD TRIGGER
        // This single transaction:
        // - Pays the Founder Split (50%)
        // - Pays the Creator Split (10%)
        // - Pays the Referrer (10% of CAP)
        // - Mints the user's Hunt Reward
        console.log(`\n📡 BROADCASTING CERTIFICATION TO BASE...`);
        
        const tx = await contract.executeAndCertify(atomicId, dataHash, referrer, {
            gasLimit: 350000 
        });

        console.log(`>>> Transaction Sent: ${tx.hash}`);
        await tx.wait();

        console.log(`\n✅ CLAIM SUCCESSFUL!`);
        console.log(`-----------------------------------`);
        console.log(`Reward Minted: 1,000 SYNL (Max-per-Hash Cap applied)`);
        console.log(`Proof of Integrity (POI) sealed on-chain.`);

    } catch (err) {
        console.error(`\n❌ GATEWAY ERROR:`, err.reason || err.message);
    }
}

// CLI Execution
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node Sovereign_Claim_Gateway.js <atomicId> <dataHash> [referrerAddress]");
} else {
    claimReward(args[0], args[1], args[2] || ethers.ZeroAddress);
}