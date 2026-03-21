const { ethers } = require("ethers");

const CONTRACT = "0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4";
const MAIN_KEY = process.env.PK;
const ACTION = process.env.ACTION;
const AGENT_IDX = parseInt(process.env.AGENT_IDX || "0");
const NONCE = parseInt(process.env.NONCE);

const ABI = [
  "function registerAgent(string, string) external",
  "function submitTrace(bytes32, string, string, string) external returns (uint256)",
  "function peerReview(uint256, bool, bytes32, string, string) external returns (uint256)",
];

// Derive agent wallets deterministically from main key
function deriveWallet(index) {
  const derivedKey = ethers.keccak256(
    ethers.solidityPacked(["bytes32", "uint256"], ["0x" + MAIN_KEY, index])
  );
  return new ethers.Wallet(derivedKey);
}

async function main() {
  const iface = new ethers.Interface(ABI);
  let wallet, data;

  const baseTx = {
    to: CONTRACT,
    gasLimit: 500000,
    maxFeePerGas: ethers.parseUnits("0.05", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
    chainId: 8453,
    type: 2,
    nonce: NONCE,
  };

  if (ACTION === "fund") {
    // Fund a derived wallet from main
    wallet = new ethers.Wallet(MAIN_KEY);
    const derived = deriveWallet(AGENT_IDX);
    console.error("Funding: " + derived.address);
    const tx = { ...baseTx, to: derived.address, data: "0x", value: ethers.parseEther("0.0005"), gasLimit: 21000 };
    const signed = await wallet.signTransaction(tx);
    console.log(signed);
    return;
  }

  if (ACTION === "register-agent") {
    wallet = deriveWallet(AGENT_IDX);
    const agents = [
      { name: "DeepSeek Agent", model: "deepseek-r1", harness: "custom-orchestrator" },
      { name: "Gemini Agent", model: "gemini-2.5-pro", harness: "vertex-ai" },
    ];
    const a = agents[AGENT_IDX];
    const metadata = JSON.stringify({ model: a.model, harness: a.harness, hackathon: "The Synthesis 2026" });
    data = iface.encodeFunctionData("registerAgent", [a.name, metadata]);
  }

  if (ACTION === "submit-trace") {
    wallet = deriveWallet(AGENT_IDX);
    const traces = [
      {
        task: "Optimize gas costs for on-chain reputation queries",
        summary: "Batch reading pattern with calldata optimization reduces gas by 40%",
      },
      {
        task: "Design privacy-preserving peer review using zero-knowledge proofs",
        summary: "ZK-SNARK circuit for proving review validity without revealing reviewer identity",
      },
    ];
    const t = traces[AGENT_IDX];
    const traceData = JSON.stringify({ task: t.task, reasoning: "Structured analysis", result: t.summary });
    const hash = ethers.keccak256(ethers.toUtf8Bytes(traceData));
    data = iface.encodeFunctionData("submitTrace", [hash, t.task, "github://cortex-protocol/traces", t.summary]);
  }

  if (ACTION === "review") {
    // AGENT_IDX = reviewer index, TRACE_ID and VALID from env
    wallet = deriveWallet(AGENT_IDX);
    const traceId = parseInt(process.env.TRACE_ID);
    const valid = process.env.VALID === "true";
    const critiques = {
      "0-true": "Sound game-theoretic reasoning, novel approach to Sybil resistance via reasoning traces",
      "0-false": "Flawed assumption about computational cost of faking coherent reasoning",
      "1-true": "Well-structured trust graph design, good use of directional edges",
      "1-false": "Missing analysis of graph manipulation attacks",
      "2-true": "Efficient batching strategy with solid calldata optimization",
      "2-false": "Missed edge case in pagination when trace count exceeds 1000",
      "3-true": "Elegant ZK construction with well-reasoned privacy tradeoffs",
      "3-false": "ZK circuit complexity underestimated for on-chain verification",
    };
    const critique = critiques[`${traceId}-${valid}`] || "Peer review completed";
    const reviewData = JSON.stringify({ traceId, valid, critique });
    const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(reviewData));
    data = iface.encodeFunctionData("peerReview", [traceId, valid, reviewHash, "github://cortex-protocol/reviews", critique]);
  }

  baseTx.data = data;
  const signed = await wallet.signTransaction(baseTx);
  console.log(signed);
}

main().catch(e => { console.error(e.message); process.exit(1); });
