const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";
    const manifest = JSON.parse(fs.readFileSync('migration_manifest.json', 'utf8'));
    const contract = await hre.ethers.getContractAt("SynthesisGenesisV2", CONTRACT_ADDRESS);

    let nextId = await contract.nextId();
    console.log(`📦 Resuming Batch Mint from ID ${nextId}...`);

    for (let i = Number(nextId); i < manifest.length; i++) {
        const item = manifest[i];
        console.log(`🛰️  Sealing ID ${item.id}: ${item.outcome}...`);
        
        const auditHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(item.debate));
        
        // Use a dynamic gas fee and wait for the provider to sync
        const tx = await contract.mintRecipe(item.outcome, item.cid, item.bps, auditHash);
        
        await tx.wait();
        console.log(`✅ ID ${item.id} Sealed.`);

        // 5-second cooldown to let the network sync the nonce
        await new Promise(r => setTimeout(r, 5000));
    }
    console.log("\n🏆 ALL ATOMICS SEALED IN GENESIS V2.0.");
}

main().catch(console.error);