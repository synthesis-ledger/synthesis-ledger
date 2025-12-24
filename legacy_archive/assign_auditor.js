import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PROVIDER_URL = "https://mainnet.base.org"; 
const CONTRACT_ADDRESS = "0x9BcCAF8f41e019c7C88B6b28dE6cc5231F864757";

async function checkAndGrantAuditor() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // ABI containing standard AccessControl and any likely Auditor management functions
    const abi = [
        "function hasRole(bytes32 role, address account) view returns (bool)",
        "function grantRole(bytes32 role, address account) external",
        "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
        "function AUDITOR_ROLE() view returns (bytes32)",
        "function isAuditor(address account) view returns (bool)",
        "function addAuditor(address account) external"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    const myAddress = wallet.address;

    console.log(`\n🛡️  SOVEREIGN PERMISSION CHECK: ${myAddress}`);

    try {
        // 1. Try to find the AUDITOR_ROLE hash
        let auditorRole;
        try {
            auditorRole = await contract.AUDITOR_ROLE();
        } catch (e) {
            // If the variable doesn't exist, we'll try a common hash for 'AUDITOR_ROLE'
            auditorRole = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));
        }

        // 2. Check if you already have it
        let isAlreadyAuditor = false;
        try {
            isAlreadyAuditor = await contract.hasRole(auditorRole, myAddress);
        } catch (e) {
            try { isAlreadyAuditor = await contract.isAuditor(myAddress); } catch (e2) {}
        }

        if (isAlreadyAuditor) {
            console.log("✅ You are already authorized as an Auditor.");
            return;
        }

        // 3. Grant the role to yourself
        console.log("📡 Attempting to grant AUDITOR_ROLE to self...");
        let tx;
        try {
            tx = await contract.grantRole(auditorRole, myAddress);
        } catch (e) {
            console.log("Falling back to addAuditor()...");
            tx = await contract.addAuditor(myAddress);
        }

        console.log(`⏳ Transaction Sent: ${tx.hash}`);
        await tx.wait();
        console.log("🚀 SUCCESS: You are now an authorized Auditor on the Synthesis Ledger.");

    } catch (e) {
        console.error("\n❌ PERMISSION ERROR");
        console.error("Reason:", e.message);
        console.log("\n💡 If this fails, you may need to call 'transferOwnership' or ensure you are acting from the deployer wallet.");
    }
}

checkAndGrantAuditor();
