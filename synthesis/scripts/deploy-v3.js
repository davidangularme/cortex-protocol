const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const KEY = process.env.PK;
const NONCE = parseInt(process.env.NONCE || "8");

async function main() {
  const wallet = new ethers.Wallet(KEY);
  
  // Read compiled bytecode
  const artifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/CortexProtocolV3.sol/CortexProtocolV3.json"), "utf8"
  ));
  
  const tx = {
    data: artifact.bytecode,
    nonce: NONCE,
    gasLimit: 5000000,
    maxFeePerGas: ethers.parseUnits("0.05", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
    chainId: 8453,
    type: 2,
  };

  const signed = await wallet.signTransaction(tx);
  console.log(signed);
}

main().catch(e => { console.error(e.message); process.exit(1); });
