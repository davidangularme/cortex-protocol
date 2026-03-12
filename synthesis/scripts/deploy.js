const hre = require("hardhat");

async function main() {
  console.log("🧠 Deploying CortexProtocol to Base Sepolia...\n");

  const CortexProtocol = await hre.ethers.getContractFactory("CortexProtocol");
  const cortex = await CortexProtocol.deploy();
  await cortex.waitForDeployment();

  const address = await cortex.getAddress();
  console.log(`✅ CortexProtocol deployed to: ${address}`);
  console.log(`🔗 View on BaseScan: https://sepolia.basescan.org/address/${address}`);
  console.log(`\nSave this address in your .env as CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
