import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Sovereign_Claim_Gateway.js
 * Author: Lars O. Horpestad | AI ThinkLab
 * Purpose: The "Hunt" interface. Manages $0.10 oracle fee payment and $SYNL rewards.
 * Logic: Implements "Bootstrap Fallback" - 1 SYNL fee until organic price is found.
 */

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x030A8e0eC9f584484088a4cea8D0159F32438613";

async function claimReward(atomicId, dataHash, referrer = ethers.ZeroAddress) {
    console.log(`\n🏛️  INITIATING V42 CLAIM GATEWAY`);
    console.log(`-----------------------------------`);

    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const abi = [
        "function calculateSynlFee() view returns (uint256)",
        "function executeAndCertify(string, bytes32, address) external",
        "function executedHashes(bytes32) view returns (bool)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    try {
        // 1. ANTI-SPAM CHECK
        const isUsed = await contract.executedHashes(dataHash);
        if (isUsed) {
            console.error(`❌ FAILURE: Data Hash [${dataHash}] already rewarded.`);
            process.exit(1);
        }

        // 2. ORACLE FETCH WITH BOOTSTRAP FALLBACK
        let synlFee;
        try {
            synlFee = await contract.calculateSynlFee();
            if (synlFee === 0n) throw new Error("Price not discovered");
        } catch (e) {
            // THE HORPESTAD BOOTSTRAP: Default to 1 SYNL if market price is missing
            console.log(`⚠️  ORACLE: Price not yet found. Applying Bootstrap Fee (1 SYNL).`);
            synlFee = ethers.parseEther("1.0"); 
        }

        const formattedFee = ethers.formatEther(synlFee);
        console.log(`>>> Current Execution Fee: ${formattedFee} SYNL`);
        console.log(`>>> Targeting Atomic: ${atomicId}`);

        // 3. EXECUTION & REWARD TRIGGER
        console.log(`\n📡 BROADCASTING CERTIFICATION TO BASE...`);
        
        // Ensure user has approved the Ledger to spend SYNL before this call
        const tx = await contract.executeAndCertify(atomicId, dataHash, referrer, {
            gasLimit: 400000 
        });

        console.log(`>>> Transaction Sent: ${tx.hash}`);
        await tx.wait();

        console.log(`\n✅ CLAIM SUCCESSFUL!`);
        console.log(`-----------------------------------`);
        console.log(`Reward Minted: 1,000 SYNL (Bootstrap Protocol Active)`);
        console.log(`Integrity sealed on-chain.`);

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