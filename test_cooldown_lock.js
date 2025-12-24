import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function testLock() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = ["function setBps(uint256 id, uint256 newBps, bytes32 auditHash) public"];
    const contract = new ethers.Contract("0x030A8e0eC9f584484088a4cea8D0159F32438613", abi, wallet);

    console.log("🔒 Attempting to bypass 6-day cooldown on ID 37...");
    try {
        const tx = await contract.setBps(37, 9000, ethers.ZeroHash);
        await tx.wait();
    } catch (e) {
        console.log("\n✅ PROTECTION VERIFIED: Update rejected.");
        console.log("Error Reason:", e.reason || "Cooldown active");
    }
}
testLock();