const hre = require("hardhat");
const fs = require("fs");

async function main() {
    // 🏛️ Synthesis Genesis v2.0 Live Anchor
    const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";
    
    // Load the manifest to get the forensic data for ID 0
    const manifest = JSON.parse(fs.readFileSync('migration_manifest.json', 'utf8'));
    const testItem = manifest[0]; // ID 0

    console.log(`🔍 Initializing Forensic Sealing Test for ID ${testItem.id}: ${testItem.outcome}...`);

    const contract = await hre.ethers.getContractAt("SynthesisGenesisV2", CONTRACT_ADDRESS);

    // Generate the Forensic Audit Hash from the debate logs
    const auditHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(testItem.debate));

    console.log(`📡 Sending Transaction to Base Mainnet...`);
    
    // Execute the mint with a 20% gas buffer for immediate inclusion
    const feeData = await hre.ethers.provider.getFeeData();
    const tx = await contract.mintRecipe(
        testItem.outcome, 
        testItem.cid, 
        testItem.bps, 
        auditHash,
        { 
            gasPrice: (feeData.gasPrice * 120n) / 100n 
        }
    );

    console.log(`⏳ Awaiting Confirmation... Hash: ${tx.hash}`);
    const receipt = await tx.wait();

    console.log(`\n✅ TEST SUCCESSFUL!`);
    console.log(`📍 Block: ${receipt.blockNumber}`);
    console.log(`📊 Sealed BPS: ${testItem.bps}`);
    console.log(`🔐 Audit Hash: ${auditHash}`);
}

main().catch(console.error);