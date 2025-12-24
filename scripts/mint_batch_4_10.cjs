const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";
    const manifest = JSON.parse(fs.readFileSync('migration_manifest.json', 'utf8'));
    const contract = await hre.ethers.getContractAt("SynthesisGenesisV2", CONTRACT_ADDRESS);

    // Range: 4 to 10
    const startId = 4;
    const endId = 10;

    console.log(`🚀 Starting Batch Sealing for IDs ${startId} through ${endId}...`);

    for (let i = startId; i <= endId; i++) {
        const item = manifest[i];
        if (!item) continue;

        console.log(`\n🛰️  Sealing ID ${item.id}: ${item.outcome}...`);

        const auditHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(item.debate));
        
        // Dynamic gas pricing for Base Mainnet
        const feeData = await hre.ethers.provider.getFeeData();
        const tx = await contract.mintRecipe(
            item.outcome, 
            item.cid, 
            item.bps, 
            auditHash,
            { gasPrice: (feeData.gasPrice * 125n) / 100n }
        );

        console.log(`⏳ Awaiting Confirmation... Hash: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ ID ${item.id} Sealed at BPS: ${item.bps}`);
        
        // 4-second delay between transactions to prevent nonce collisions
        await new Promise(r => setTimeout(r, 4000));
    }

    console.log("\n🏆 BATCH 4-10 COMPLETE.");
}

main().catch(console.error);