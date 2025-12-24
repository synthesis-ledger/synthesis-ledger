const hre = require("hardhat");

async function main() {
    // YOUR LIVE CONTRACT ADDRESS
    const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";
    
    // THE ADDRESS TO BECOME A COUNCIL AUDITOR
    const NEW_AUDITOR = "PASTE_NEW_WALLET_HERE";

    const contract = await hre.ethers.getContractAt("SynthesisGenesisV2", CONTRACT_ADDRESS);
    const AUDITOR_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("AUDITOR_ROLE"));

    console.log(`🏛️  Granting Council Auditor Role to: ${NEW_AUDITOR}`);
    
    const tx = await contract.grantRole(AUDITOR_ROLE, NEW_AUDITOR);
    await tx.wait();

    console.log(`✅ Success. ${NEW_AUDITOR} is now a recognized Synthesis Auditor.`);
}

main().catch(console.error);