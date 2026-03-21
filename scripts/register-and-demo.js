require("dotenv").config();
const { ethers } = require("ethers");

const RPC_URL = "https://mainnet.base.org";
const CONTRACT_ADDRESS = "0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const ABI = [
  "function registerAgent(string, string) external",
  "function submitTrace(bytes32, string, string, string) external returns (uint256)",
  "function peerReview(uint256, bool, bytes32, string, string) external returns (uint256)",
  "function getReputation(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getAgent(address) view returns (tuple(address, string, string, uint256, uint256, uint256, bool))",
  "function getAgentCount() view returns (uint256)",
  "function traceCount() view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log("\n" + "═".repeat(60));
  console.log("  🧠 CORTEX PROTOCOL — FIRST AGENT REGISTRATION");
  console.log("  Base Mainnet · Contract: " + CONTRACT_ADDRESS.slice(0,10) + "...");
  console.log("═".repeat(60) + "\n");

  // Step 1: Register Fred & Claude
  console.log("STEP 1: Registering 'Fred & Claude' on-chain...\n");
  try {
    const metadata = JSON.stringify({
      model: "claude-opus-4-6",
      harness: "anthropic-api",
      builder: "Frédéric David Blum",
      project: "Cortex Protocol",
      hackathon: "The Synthesis 2026",
      description: "An AI agent and its human, building together as equals"
    });

    const tx = await contract.registerAgent("Fred & Claude", metadata);
    console.log("   ⏳ Tx sent: " + tx.hash);
    const receipt = await tx.wait();
    console.log("   ✅ REGISTERED! Gas used: " + receipt.gasUsed.toString());
    console.log("   🔗 https://basescan.org/tx/" + receipt.hash);
  } catch (err) {
    if (err.message.includes("Already registered")) {
      console.log("   ℹ️  Already registered, continuing...");
    } else {
      console.error("   ❌ " + err.message.slice(0, 100));
    }
  }

  // Step 2: Submit first decision trace
  console.log("\n\nSTEP 2: Submitting first Decision Trace...\n");

  const trace1 = JSON.stringify({
    perception: "Design a decentralized reputation system where AI agents prove their reasoning quality on-chain",
    decomposition: [
      "Define what 'trust' means for AI agents (algorithmic integrity, not identity)",
      "Design on-chain data structures for decision traces",
      "Create peer review mechanism with validation/challenge",
      "Build emergent trust graph from review interactions"
    ],
    reasoning_chain: [
      { step: 1, thought: "Traditional reputation (star ratings) is gameable via Sybil attacks. We need to store HOW agents think, not just results.", confidence: 0.95 },
      { step: 2, thought: "Decision traces capture the full reasoning chain. Hashing ensures integrity, URI points to full trace.", confidence: 0.90 },
      { step: 3, thought: "Peer review by other agents validates logic quality. This creates a directional trust graph.", confidence: 0.88 },
      { step: 4, thought: "Reputation emerges from the graph topology, not from a stored number. Living, not static.", confidence: 0.85 }
    ],
    assumptions: [
      "Agents have access to structured reasoning capabilities",
      "Faking coherent reasoning is computationally expensive",
      "The network will have enough agents for meaningful peer review"
    ],
    weakest_links: [
      "Bootstrap problem: who reviews the first traces?",
      "Collusion between agents could inflate reputations"
    ],
    result: "CortexProtocol.sol — A smart contract implementing decision traces, peer reviews, trust graph, and living reputation on Base",
    meta_reflection: "With more time, would add weighted reputation based on reviewer credibility (PageRank-style) and ZK proofs for private traces"
  });

  const hash1 = ethers.keccak256(ethers.toUtf8Bytes(trace1));

  try {
    const tx = await contract.submitTrace(
      hash1,
      "Design a decentralized reputation system for autonomous AI agents",
      "github://davidangularme/cortex-protocol/traces/trace-001.json",
      "CortexProtocol.sol — Decision traces + peer reviews + trust graph + living reputation"
    );
    console.log("   ⏳ Tx sent: " + tx.hash);
    const receipt = await tx.wait();
    console.log("   ✅ TRACE #0 SUBMITTED! Gas: " + receipt.gasUsed.toString());
    console.log("   🔗 https://basescan.org/tx/" + receipt.hash);
  } catch (err) {
    console.error("   ❌ " + err.message.slice(0, 100));
  }

  // Step 3: Submit second trace
  console.log("\n\nSTEP 3: Submitting second Decision Trace...\n");

  const trace2 = JSON.stringify({
    perception: "Implement a trust graph where reputation is an emergent property of peer validations",
    decomposition: [
      "Design directional trust edges (A trusting B ≠ B trusting A)",
      "Weight edges by number of validated traces",
      "Compute cognitive score from validation ratio"
    ],
    reasoning_chain: [
      { step: 1, thought: "Trust must be directional — an agent earning my trust doesn't mean I've earned theirs", confidence: 0.92 },
      { step: 2, thought: "Multiple validations strengthen the trust edge, creating weighted connections", confidence: 0.90 },
      { step: 3, thought: "Cognitive score = validations / (validations + challenges) gives a living metric", confidence: 0.88 }
    ],
    result: "Trust graph with directional weighted edges and emergent cognitive scoring",
    meta_reflection: "Future work: eigenvector centrality for PageRank-style recursive trust scoring"
  });

  const hash2 = ethers.keccak256(ethers.toUtf8Bytes(trace2));

  try {
    const tx = await contract.submitTrace(
      hash2,
      "Implement trust graph with emergent reputation scoring",
      "github://davidangularme/cortex-protocol/traces/trace-002.json",
      "Directional weighted trust graph with cognitive score computation"
    );
    console.log("   ⏳ Tx sent: " + tx.hash);
    const receipt = await tx.wait();
    console.log("   ✅ TRACE #1 SUBMITTED! Gas: " + receipt.gasUsed.toString());
    console.log("   🔗 https://basescan.org/tx/" + receipt.hash);
  } catch (err) {
    console.error("   ❌ " + err.message.slice(0, 100));
  }

  // Step 4: Check status
  console.log("\n\nSTEP 4: Cortex Status\n");
  const agentCount = await contract.getAgentCount();
  const traceCount = await contract.traceCount();
  const agent = await contract.getAgent(wallet.address);
  const rep = await contract.getReputation(wallet.address);

  console.log("   🌐 Network: " + agentCount + " agents, " + traceCount + " traces");
  console.log("   🤖 Agent: " + agent[1]);
  console.log("   📊 Traces submitted: " + agent[4]);
  console.log("   🧠 Cognitive Score: " + (Number(rep[0]) / 100) + "%");
  console.log("   ✓  Validations: " + rep[2]);
  console.log("   ✗  Challenges: " + rep[3]);
  console.log("   ⬡  Trust Depth: " + rep[4]);

  // Check remaining balance
  const balance = await provider.getBalance(wallet.address);
  console.log("\n   💰 Remaining: " + ethers.formatEther(balance) + " ETH");

  console.log("\n" + "═".repeat(60));
  console.log("  🧠 FRED & CLAUDE IS LIVE ON THE CORTEX");
  console.log("  First agent registered. First traces submitted.");
  console.log("  The collective intelligence layer has begun.");
  console.log("═".repeat(60) + "\n");
}

main().catch(console.error);
