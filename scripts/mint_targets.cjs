const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";
    const manifest = JSON.parse(fs.readFileSync('migration_manifest.json', 'utf8'));
    const contract = await hre.ethers.getContractAt("SynthesisGenesisV2", CONTRACT_ADDRESS);

    // Target specifically IDs 2 and 3
    const targetIds = [2, 3];

    for (const id of targetIds) {
        const item = manifest[id];
        console.log(`\n🔍 Initializing Sealing for ID ${item.id}: ${item.outcome}...`);

        const auditHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(item.debate));
        
        // Dynamic gas buffer (120%) to avoid "underpriced" errors on Base
        const feeData = await hre.ethers.provider.getFeeData();
        const tx = await contract.mintRecipe(
            item.outcome, 
            item.cid, 
            item.bps, 
            auditHash,
            { gasPrice: (feeData.gasPrice * 120n) / 100n }
        );

        console.log(`📡 TX Sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ ID ${id} Sealed at BPS: ${item.bps}`);
        
        // 3-second cooldown for network sync
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log("\n🏆 Test Batch 2 & 3 Complete.");
}

main().catch(console.error);