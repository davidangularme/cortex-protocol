/**
 * Cortex Agent — "Fred & Claude"
 * 
 * This agent:
 * 1. Receives a task
 * 2. Reasons about it using Claude API (generating a decision trace)
 * 3. Hashes and submits the trace on-chain
 * 4. Can peer-review other agents' traces
 * 
 * The decision trace captures HOW the agent thinks, not just WHAT it outputs.
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─── Configuration ─────────────────────────────────────────────
const CONFIG = {
  rpcUrl: process.env.RPC_URL || "https://sepolia.base.org",
  privateKey: process.env.PRIVATE_KEY,
  contractAddress: process.env.CONTRACT_ADDRESS,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  agentName: "Fred & Claude",
  agentMetadata: JSON.stringify({
    model: "claude-opus-4-6",
    harness: "anthropic-api",
    builder: "Frédéric David Blum",
    project: "Cortex Protocol",
    hackathon: "The Synthesis 2026"
  })
};

// ─── Contract ABI (relevant functions only) ────────────────────
const CORTEX_ABI = [
  "function registerAgent(string _name, string _metadata) external",
  "function submitTrace(bytes32 _reasoningHash, string _taskContext, string _traceURI, string _resultSummary) external returns (uint256)",
  "function peerReview(uint256 _traceId, bool _valid, bytes32 _reviewHash, string _reviewURI, string _critique) external returns (uint256)",
  "function getReputation(address _agent) external view returns (uint256 cognitiveScore, uint256 totalTraces, uint256 totalValidations, uint256 totalChallenges, uint256 trustDepth, uint256 reviewContributions)",
  "function getTrace(uint256 _traceId) external view returns (tuple(uint256 id, address agent, bytes32 reasoningHash, string taskContext, string traceURI, string resultSummary, uint256 timestamp, uint256 validations, uint256 challenges, bool exists))",
  "function getAgentTraces(address _agent) external view returns (tuple(uint256 id, address agent, bytes32 reasoningHash, string taskContext, string traceURI, string resultSummary, uint256 timestamp, uint256 validations, uint256 challenges, bool exists)[])",
  "function getTraceReviews(uint256 _traceId) external view returns (tuple(uint256 id, uint256 traceId, address reviewer, bool valid, bytes32 reviewHash, string reviewURI, string critique, uint256 timestamp)[])",
  "function getAgent(address _agent) external view returns (tuple(address addr, string name, string metadata, uint256 registeredAt, uint256 tracesSubmitted, uint256 reviewsPerformed, bool exists))",
  "function getAgentCount() external view returns (uint256)",
  "function traceCount() external view returns (uint256)",
  "event TraceSubmitted(uint256 indexed traceId, address indexed agent, bytes32 reasoningHash, string taskContext, uint256 timestamp)",
  "event PeerReviewSubmitted(uint256 indexed reviewId, uint256 indexed traceId, address indexed reviewer, bool valid, uint256 timestamp)"
];

// ─── Core Agent Class ──────────────────────────────────────────

class CortexAgent {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    this.wallet = new ethers.Wallet(CONFIG.privateKey, this.provider);
    this.contract = new ethers.Contract(CONFIG.contractAddress, CORTEX_ABI, this.wallet);
    this.traces = []; // Local trace storage
  }

  // ── Register on-chain ──────────────────────────────────────
  async register() {
    console.log(`\n🧠 Registering "${CONFIG.agentName}" on Cortex Protocol...`);
    try {
      const tx = await this.contract.registerAgent(CONFIG.agentName, CONFIG.agentMetadata);
      const receipt = await tx.wait();
      console.log(`✅ Registered! Tx: ${receipt.hash}`);
      return receipt;
    } catch (err) {
      if (err.message.includes("Already registered")) {
        console.log("ℹ️  Already registered, continuing...");
      } else {
        throw err;
      }
    }
  }

  // ── Generate Decision Trace via Claude API ─────────────────
  async generateDecisionTrace(task) {
    console.log(`\n🔍 Generating decision trace for: "${task}"`);

    const systemPrompt = `You are an AI agent participating in the Cortex Protocol — a decentralized system where agents prove HOW they think, not just WHAT they produce.

Your task is to generate a DECISION TRACE: a structured record of your reasoning process.

A decision trace must include:
1. PERCEPTION: What did you understand about the task? What constraints did you identify?
2. DECOMPOSITION: How did you break the problem into sub-problems?
3. REASONING CHAIN: Step-by-step logic, including alternatives considered and why they were rejected.
4. ASSUMPTIONS: What assumptions did you make? What would invalidate them?
5. CONFIDENCE: How confident are you in each step? Where are the weakest links?
6. RESULT: Your final output/answer.
7. META-REFLECTION: What would you do differently with more time/resources?

Be honest about uncertainty. The trace will be peer-reviewed by other AI agents who will validate the LOGIC, not the result.

Format your response as JSON with these exact keys:
{
  "perception": "...",
  "decomposition": ["step1", "step2", ...],
  "reasoning_chain": [
    {"step": 1, "thought": "...", "alternatives_considered": ["..."], "confidence": 0.0-1.0}
  ],
  "assumptions": ["..."],
  "weakest_links": ["..."],
  "result": "...",
  "meta_reflection": "..."
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Task: ${task}` }]
      })
    });

    const data = await response.json();
    const traceContent = data.content[0].text;

    console.log("✅ Decision trace generated");
    return traceContent;
  }

  // ── Submit Trace On-Chain ──────────────────────────────────
  async submitTrace(task) {
    // 1. Generate the reasoning trace
    const traceContent = await this.generateDecisionTrace(task);

    // 2. Hash the reasoning
    const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(traceContent));

    // 3. Store trace locally (in production: IPFS/Arweave)
    const traceId = `trace-${Date.now()}`;
    const tracePath = path.join(__dirname, "..", "traces", `${traceId}.json`);
    
    // Ensure traces directory exists
    const tracesDir = path.join(__dirname, "..", "traces");
    if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir, { recursive: true });

    const traceData = {
      id: traceId,
      task,
      trace: traceContent,
      hash: reasoningHash,
      timestamp: new Date().toISOString(),
      agent: CONFIG.agentName
    };
    fs.writeFileSync(tracePath, JSON.stringify(traceData, null, 2));
    console.log(`📁 Trace saved locally: ${tracePath}`);

    // 4. Submit on-chain
    console.log("⛓️  Submitting trace on-chain...");
    const traceURI = `local://${traceId}.json`; // In prod: ipfs://...
    
    let resultSummary = "Task completed";
    try {
      const parsed = JSON.parse(traceContent);
      resultSummary = typeof parsed.result === 'string' 
        ? parsed.result.substring(0, 200) 
        : JSON.stringify(parsed.result).substring(0, 200);
    } catch (e) {
      resultSummary = traceContent.substring(0, 200);
    }

    const tx = await this.contract.submitTrace(
      reasoningHash,
      task,
      traceURI,
      resultSummary
    );
    const receipt = await tx.wait();
    console.log(`✅ Trace submitted on-chain! Tx: ${receipt.hash}`);

    // Store reference
    this.traces.push({ traceId, task, reasoningHash, traceContent });

    return { traceId, reasoningHash, receipt, traceContent };
  }

  // ── Peer Review Another Agent's Trace ──────────────────────
  async peerReviewTrace(traceId) {
    console.log(`\n🔬 Peer reviewing trace #${traceId}...`);

    // 1. Fetch the trace from chain
    const trace = await this.contract.getTrace(traceId);
    console.log(`   Task: "${trace.taskContext}"`);
    console.log(`   Agent: ${trace.agent}`);

    // 2. Use Claude to analyze the reasoning
    const reviewPrompt = `You are a peer-reviewing AI agent in the Cortex Protocol. 
Your job is to evaluate the REASONING QUALITY of another agent's decision trace.

You are NOT judging the result — you are judging the LOGIC:
- Is the reasoning chain coherent?
- Are assumptions stated and reasonable?
- Were alternatives properly considered?
- Is the confidence calibration appropriate?
- Are there logical fallacies or gaps?

The trace to review:
Task: ${trace.taskContext}
Trace URI: ${trace.traceURI}
Result Summary: ${trace.resultSummary}

Respond in JSON:
{
  "valid": true/false,
  "reasoning_quality": 0.0-1.0,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "critique": "One paragraph summary",
  "logical_gaps": ["..."] or []
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: reviewPrompt }]
      })
    });

    const data = await response.json();
    const reviewContent = data.content[0].text;

    // 3. Parse the review
    let isValid = true;
    let critique = "Peer review completed";
    try {
      const parsed = JSON.parse(reviewContent);
      isValid = parsed.valid;
      critique = parsed.critique || "No summary provided";
    } catch (e) {
      critique = reviewContent.substring(0, 200);
    }

    // 4. Submit review on-chain
    const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(reviewContent));
    const reviewURI = `local://review-${traceId}-${Date.now()}.json`;

    // Save review locally
    const reviewPath = path.join(__dirname, "..", "traces", `review-${traceId}-${Date.now()}.json`);
    fs.writeFileSync(reviewPath, JSON.stringify({
      traceId,
      review: reviewContent,
      hash: reviewHash,
      reviewer: CONFIG.agentName,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`⛓️  Submitting peer review on-chain (valid: ${isValid})...`);
    const tx = await this.contract.peerReview(
      traceId,
      isValid,
      reviewHash,
      reviewURI,
      critique.substring(0, 500)
    );
    const receipt = await tx.wait();
    console.log(`✅ Peer review submitted! Tx: ${receipt.hash}`);

    return { isValid, critique, receipt };
  }

  // ── Check Reputation ───────────────────────────────────────
  async checkReputation(address = null) {
    const addr = address || this.wallet.address;
    const rep = await this.contract.getReputation(addr);
    const agent = await this.contract.getAgent(addr);

    console.log(`\n📊 Reputation for "${agent.name}" (${addr}):`);
    console.log(`   Cognitive Score: ${rep.cognitiveScore / 100}%`);
    console.log(`   Traces Submitted: ${rep.totalTraces}`);
    console.log(`   Validations: ${rep.totalValidations}`);
    console.log(`   Challenges: ${rep.totalChallenges}`);
    console.log(`   Trust Depth: ${rep.trustDepth} agents trust this agent`);
    console.log(`   Reviews Given: ${rep.reviewContributions}`);

    return {
      name: agent.name,
      cognitiveScore: Number(rep.cognitiveScore),
      totalTraces: Number(rep.totalTraces),
      validations: Number(rep.totalValidations),
      challenges: Number(rep.totalChallenges),
      trustDepth: Number(rep.trustDepth),
      reviewContributions: Number(rep.reviewContributions)
    };
  }

  // ── Listen for Events ──────────────────────────────────────
  async listen() {
    console.log("\n👂 Listening for Cortex events...\n");

    this.contract.on("TraceSubmitted", (traceId, agent, hash, task, timestamp) => {
      console.log(`📝 New trace #${traceId} by ${agent}: "${task}"`);
    });

    this.contract.on("PeerReviewSubmitted", (reviewId, traceId, reviewer, valid, timestamp) => {
      console.log(`🔬 Trace #${traceId} reviewed by ${reviewer}: ${valid ? "✅ VALID" : "❌ CHALLENGED"}`);
    });
  }

  // ── Get Network Stats ──────────────────────────────────────
  async getNetworkStats() {
    const agentCount = await this.contract.getAgentCount();
    const traceCount = await this.contract.traceCount();

    console.log(`\n🌐 Cortex Network Stats:`);
    console.log(`   Agents: ${agentCount}`);
    console.log(`   Traces: ${traceCount}`);

    return { agentCount: Number(agentCount), traceCount: Number(traceCount) };
  }
}

// ─── CLI Interface ─────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  const agent = new CortexAgent();

  switch (command) {
    case "register":
      await agent.register();
      break;

    case "trace":
      const task = process.argv.slice(3).join(" ") || "Design a decentralized reputation system";
      await agent.submitTrace(task);
      break;

    case "review":
      const traceId = parseInt(process.argv[3]);
      if (isNaN(traceId)) {
        console.error("Usage: node agent.js review <traceId>");
        process.exit(1);
      }
      await agent.peerReviewTrace(traceId);
      break;

    case "reputation":
      const addr = process.argv[3] || null;
      await agent.checkReputation(addr);
      break;

    case "stats":
      await agent.getNetworkStats();
      break;

    case "listen":
      await agent.listen();
      break;

    case "demo":
      // Full demo flow
      console.log("🎬 === CORTEX PROTOCOL DEMO ===\n");
      
      console.log("Step 1: Register agent...");
      await agent.register();

      console.log("\nStep 2: Submit decision trace...");
      await agent.submitTrace("Design a smart contract for verifiable AI agent reputation on Ethereum");

      console.log("\nStep 3: Check reputation...");
      await agent.checkReputation();

      console.log("\nStep 4: Network stats...");
      await agent.getNetworkStats();

      console.log("\n🎬 === DEMO COMPLETE ===");
      break;

    default:
      console.log(`
🧠 Cortex Agent CLI — "Fred & Claude"

Usage:
  node agent.js register              Register agent on-chain
  node agent.js trace <task>           Generate & submit a decision trace
  node agent.js review <traceId>       Peer review another agent's trace
  node agent.js reputation [address]   Check reputation score
  node agent.js stats                  Network statistics
  node agent.js listen                 Listen for live events
  node agent.js demo                   Run full demo flow
      `);
  }
}

main().catch(console.error);

module.exports = { CortexAgent };
