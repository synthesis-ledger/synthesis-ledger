const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🏛️  Deploying Synthesis Genesis v2.0 with account:", deployer.address);

  const GenesisV2 = await hre.ethers.getContractFactory("SynthesisGenesisV2");
  const contract = await GenesisV2.deploy();

  await contract.waitForDeployment();
  console.log(`🚀 DEPLOYED! Address: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});