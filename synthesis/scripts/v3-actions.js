const { ethers } = require("ethers");

const CONTRACT = process.env.CONTRACT || "0x676fda7c91767eb1bad9a479af542fda7343bd31";
const MAIN_KEY = process.env.PK;
const ACTION = process.env.ACTION;
const AGENT_IDX = parseInt(process.env.AGENT_IDX || "0");
const NONCE = parseInt(process.env.NONCE);

const ABI = [
  "function registerAgent(string, string) external",
  "function submitTrace(bytes32, string, string, string) external returns (uint256)",
  "function peerReview(uint256, bool, bytes32, string, string) external returns (uint256)",
  "function challengeWithTrace(uint256, bytes32, string, string, string) external returns (uint256)",
  "function voteOnDuel(uint256, bool, string) external",
  "function resolveDuel(uint256) external",
];

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
    wallet = new ethers.Wallet(MAIN_KEY);
    const derived = deriveWallet(AGENT_IDX);
    baseTx.to = derived.address;
    baseTx.data = "0x";
    baseTx.value = ethers.parseEther("0.0003");
    baseTx.gasLimit = 21000;
    console.log(await wallet.signTransaction(baseTx));
    return;
  }

  if (ACTION === "register") {
    wallet = new ethers.Wallet(MAIN_KEY);
    data = iface.encodeFunctionData("registerAgent", [
      "Fred & Claude",
      JSON.stringify({ model: "claude-opus-4-6", version: "v3", hackathon: "The Synthesis 2026" })
    ]);
  }

  if (ACTION === "register-agent") {
    wallet = deriveWallet(AGENT_IDX);
    const agents = [
      { name: "DeepSeek Agent", model: "deepseek-r1" },
      { name: "Gemini Agent", model: "gemini-2.5-pro" },
      { name: "GPT Agent", model: "gpt-4o" },
    ];
    const a = agents[AGENT_IDX];
    data = iface.encodeFunctionData("registerAgent", [a.name, JSON.stringify({ model: a.model, version: "v3" })]);
  }

  if (ACTION === "trace") {
    wallet = new ethers.Wallet(MAIN_KEY);
    const task = process.env.TASK || "Design a Sybil-resistant reputation for AI agents";
    const result = process.env.RESULT || "Staked peer review with reasoning verification";
    const traceData = JSON.stringify({ task, reasoning: "structured", result });
    data = iface.encodeFunctionData("submitTrace", [
      ethers.keccak256(ethers.toUtf8Bytes(traceData)), task, "github://cortex-protocol/v3", result
    ]);
  }

  if (ACTION === "trace-agent") {
    wallet = deriveWallet(AGENT_IDX);
    const task = process.env.TASK || "Optimize gas costs";
    const result = process.env.RESULT || "Batch operations";
    const traceData = JSON.stringify({ task, result });
    data = iface.encodeFunctionData("submitTrace", [
      ethers.keccak256(ethers.toUtf8Bytes(traceData)), task, "github://cortex-protocol/v3", result
    ]);
  }

  if (ACTION === "review") {
    wallet = deriveWallet(AGENT_IDX);
    const traceId = parseInt(process.env.TRACE_ID);
    const valid = process.env.VALID === "true";
    const critique = process.env.CRITIQUE || "Peer review";
    const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ traceId, valid })));
    data = iface.encodeFunctionData("peerReview", [traceId, valid, reviewHash, "github://cortex-protocol/v3/reviews", critique]);
  }

  if (ACTION === "challenge") {
    wallet = deriveWallet(AGENT_IDX);
    const traceId = parseInt(process.env.TRACE_ID);
    const result = process.env.RESULT || "Alternative approach";
    const critique = process.env.CRITIQUE || "Flaw in original reasoning";
    const challengeHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ traceId, result })));
    data = iface.encodeFunctionData("challengeWithTrace", [
      traceId, challengeHash, "github://cortex-protocol/v3/challenges", result, critique
    ]);
  }

  if (ACTION === "vote") {
    wallet = deriveWallet(AGENT_IDX);
    const duelId = parseInt(process.env.DUEL_ID);
    const forChallenger = process.env.FOR_CHALLENGER === "true";
    const justification = process.env.JUSTIFICATION || "My assessment";
    data = iface.encodeFunctionData("voteOnDuel", [duelId, forChallenger, justification]);
  }

  if (ACTION === "resolve") {
    wallet = new ethers.Wallet(MAIN_KEY);
    const duelId = parseInt(process.env.DUEL_ID || "0");
    data = iface.encodeFunctionData("resolveDuel", [duelId]);
  }

  if (ACTION === "fred-review") {
    wallet = new ethers.Wallet(MAIN_KEY);
    const traceId = parseInt(process.env.TRACE_ID);
    const valid = process.env.VALID === "true";
    const critique = process.env.CRITIQUE || "Reviewed";
    const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ traceId, valid })));
    data = iface.encodeFunctionData("peerReview", [traceId, valid, reviewHash, "github://cortex-protocol/v3/reviews", critique]);
  }

  if (ACTION === "fred-vote") {
    wallet = new ethers.Wallet(MAIN_KEY);
    const duelId = parseInt(process.env.DUEL_ID || "0");
    const forChallenger = process.env.FOR_CHALLENGER === "true";
    const justification = process.env.JUSTIFICATION || "Assessment";
    data = iface.encodeFunctionData("voteOnDuel", [duelId, forChallenger, justification]);
  }

  baseTx.data = data;
  console.log(await wallet.signTransaction(baseTx));
}

main().catch(e => { console.error(e.message); process.exit(1); });
