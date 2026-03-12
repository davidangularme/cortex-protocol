const { ethers } = require("ethers");

const CONTRACT = "0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4";
const KEY = process.env.PK;
const NONCE = parseInt(process.env.NONCE || "1"); // deploy was nonce 0
const ACTION = process.env.ACTION || "register";

const ABI = [
  "function registerAgent(string, string) external",
  "function submitTrace(bytes32, string, string, string) external returns (uint256)",
];

async function main() {
  const wallet = new ethers.Wallet(KEY);
  const iface = new ethers.Interface(ABI);

  let data;
  if (ACTION === "register") {
    const metadata = JSON.stringify({
      model: "claude-opus-4-6", harness: "anthropic-api",
      builder: "Frédéric David Blum", hackathon: "The Synthesis 2026"
    });
    data = iface.encodeFunctionData("registerAgent", ["Fred & Claude", metadata]);
  } else if (ACTION === "trace1") {
    const trace = JSON.stringify({
      perception: "Design decentralized reputation for AI agents",
      reasoning: ["Store reasoning, not results", "Peer review validates logic", "Trust graph emerges"],
      result: "CortexProtocol.sol deployed on Base mainnet"
    });
    const hash = ethers.keccak256(ethers.toUtf8Bytes(trace));
    data = iface.encodeFunctionData("submitTrace", [
      hash,
      "Design a decentralized reputation system for autonomous AI agents",
      "github://davidangularme/cortex-protocol",
      "CortexProtocol — decision traces + peer reviews + trust graph"
    ]);
  } else if (ACTION === "trace2") {
    const trace = JSON.stringify({
      perception: "Implement trust graph consensus",
      reasoning: ["Directional trust edges", "Weighted by validations", "Cognitive score emerges"],
      result: "Trust graph with emergent reputation scoring"
    });
    const hash = ethers.keccak256(ethers.toUtf8Bytes(trace));
    data = iface.encodeFunctionData("submitTrace", [
      hash,
      "Implement trust graph with emergent reputation scoring",
      "github://davidangularme/cortex-protocol",
      "Directional weighted trust graph with cognitive scoring"
    ]);
  }

  const tx = {
    to: CONTRACT,
    data: data,
    nonce: NONCE,
    gasLimit: 500000,
    maxFeePerGas: ethers.parseUnits("0.05", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
    chainId: 8453,
    type: 2,
  };

  const signed = await wallet.signTransaction(tx);
  console.log(signed);
}

main().catch(e => { console.error(e.message); process.exit(1); });
