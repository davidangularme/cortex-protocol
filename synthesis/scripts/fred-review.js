const { ethers } = require("ethers");

const CONTRACT = "0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4";
const KEY = process.env.PK;
const NONCE = parseInt(process.env.NONCE);
const TRACE_ID = parseInt(process.env.TRACE_ID);
const VALID = process.env.VALID === "true";
const CRITIQUE = process.env.CRITIQUE;

const ABI = ["function peerReview(uint256, bool, bytes32, string, string) external returns (uint256)"];

async function main() {
  const wallet = new ethers.Wallet(KEY);
  const iface = new ethers.Interface(ABI);
  const reviewData = JSON.stringify({ traceId: TRACE_ID, valid: VALID, critique: CRITIQUE });
  const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(reviewData));
  const data = iface.encodeFunctionData("peerReview", [TRACE_ID, VALID, reviewHash, "github://cortex-protocol/reviews", CRITIQUE]);
  
  const tx = {
    to: CONTRACT, data, nonce: NONCE, gasLimit: 500000,
    maxFeePerGas: ethers.parseUnits("0.05", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
    chainId: 8453, type: 2,
  };
  console.log(await wallet.signTransaction(tx));
}
main().catch(e => { console.error(e.message); process.exit(1); });
