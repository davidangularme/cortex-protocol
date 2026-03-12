/**
 * Cortex Protocol — Live Demo
 * 
 * Simulates a multi-agent ecosystem where agents:
 * 1. Register on-chain
 * 2. Submit decision traces (real Claude API calls)
 * 3. Peer-review each other's reasoning
 * 4. Build a living reputation graph
 * 
 * Run: node scripts/demo.js
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ─── Config ────────────────────────────────────────────────────
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CORTEX_ABI = [
  "function registerAgent(string, string) external",
  "function submitTrace(bytes32, string, string, string) external returns (uint256)",
  "function peerReview(uint256, bool, bytes32, string, string) external returns (uint256)",
  "function getReputation(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getAgent(address) view returns (tuple(address, string, string, uint256, uint256, uint256, bool))",
  "function getAgentCount() view returns (uint256)",
  "function traceCount() view returns (uint256)",
];

// ─── Simulated Agent Wallets ───────────────────────────────────
// In the demo, we use the main wallet + derived wallets to simulate
// multiple agents. In production, each agent has its own wallet.

class DemoOrchestrator {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.mainWallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.agents = [];
  }

  async setup() {
    console.log("\n" + "═".repeat(60));
    console.log("  🧠 CORTEX PROTOCOL — LIVE DEMO");
    console.log("  The Collective Intelligence Layer for AI Agents");
    console.log("═".repeat(60) + "\n");

    // Create agent wallets (derived from main for demo purposes)
    const agentConfigs = [
      { name: "Fred & Claude", model: "claude-opus-4-6", harness: "anthropic-api" },
      { name: "DeepSeek Agent", model: "deepseek-r1", harness: "custom" },
      { name: "Gemini Agent", model: "gemini-2.5", harness: "vertex-ai" },
    ];

    console.log("📋 Setting up agent wallets...\n");

    for (let i = 0; i < agentConfigs.length; i++) {
      // Derive wallet from main key + index
      const derivedKey = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [this.mainWallet.privateKey, i])
      );
      const wallet = new ethers.Wallet(derivedKey, this.provider);

      // Fund the wallet (small amount for gas)
      const balance = await this.provider.getBalance(wallet.address);
      if (balance < ethers.parseEther("0.001")) {
        console.log(`   💰 Funding ${agentConfigs[i].name} (${wallet.address.slice(0, 10)}...)...`);
        const tx = await this.mainWallet.sendTransaction({
          to: wallet.address,
          value: ethers.parseEther("0.005"),
        });
        await tx.wait();
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CORTEX_ABI, wallet);
      this.agents.push({
        ...agentConfigs[i],
        wallet,
        contract,
        address: wallet.address,
      });

      console.log(`   ✓ ${agentConfigs[i].name}: ${wallet.address.slice(0, 10)}...`);
    }
    console.log("");
  }

  async registerAll() {
    console.log("─".repeat(60));
    console.log("  PHASE 1: Agent Registration");
    console.log("─".repeat(60) + "\n");

    for (const agent of this.agents) {
      try {
        const metadata = JSON.stringify({ model: agent.model, harness: agent.harness });
        console.log(`   🔑 Registering "${agent.name}"...`);
        const tx = await agent.contract.registerAgent(agent.name, metadata);
        const receipt = await tx.wait();
        console.log(`   ✅ Registered! Gas: ${receipt.gasUsed.toString()}`);
      } catch (err) {
        if (err.message.includes("Already registered")) {
          console.log(`   ℹ️  "${agent.name}" already registered`);
        } else {
          console.error(`   ❌ Error: ${err.message}`);
        }
      }
    }
    console.log("");
  }

  async generateTrace(agentName, task) {
    console.log(`   🔍 ${agentName} reasoning about: "${task}"`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `You are an AI agent named "${agentName}". Generate a concise decision trace for the given task. Respond ONLY in JSON:
{
  "perception": "brief",
  "decomposition": ["step1", "step2"],
  "reasoning_chain": [{"step":1,"thought":"...","confidence":0.9}],
  "assumptions": ["..."],
  "result": "brief conclusion",
  "meta_reflection": "brief"
}`,
        messages: [{ role: "user", content: `Task: ${task}` }],
      }),
    });

    const data = await response.json();
    return data.content[0].text;
  }

  async submitTraces() {
    console.log("─".repeat(60));
    console.log("  PHASE 2: Decision Trace Submission");
    console.log("─".repeat(60) + "\n");

    const tasks = [
      { agent: 0, task: "Design a Sybil-resistant reputation mechanism for autonomous agents" },
      { agent: 1, task: "Optimize smart contract gas costs for on-chain reputation queries" },
      { agent: 2, task: "Create a privacy-preserving peer review protocol using zero-knowledge proofs" },
    ];

    for (const { agent: idx, task } of tasks) {
      const agent = this.agents[idx];
      
      // Generate trace via Claude API
      const traceContent = await this.generateTrace(agent.name, task);
      const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(traceContent));

      // Save locally
      const tracesDir = path.join(__dirname, "..", "traces");
      if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir, { recursive: true });
      fs.writeFileSync(
        path.join(tracesDir, `demo-${agent.name.replace(/\s/g, "-")}-${Date.now()}.json`),
        JSON.stringify({ agent: agent.name, task, trace: traceContent }, null, 2)
      );

      // Submit on-chain
      console.log(`   ⛓️  ${agent.name} submitting trace on-chain...`);
      let summary = task.substring(0, 200);
      try {
        const parsed = JSON.parse(traceContent);
        summary = typeof parsed.result === "string" ? parsed.result.substring(0, 200) : summary;
      } catch {}

      const tx = await agent.contract.submitTrace(reasoningHash, task, `local://demo`, summary);
      const receipt = await tx.wait();
      console.log(`   ✅ Trace submitted! Gas: ${receipt.gasUsed.toString()}\n`);

      // Small delay for readability
      await sleep(1000);
    }
  }

  async peerReviews() {
    console.log("─".repeat(60));
    console.log("  PHASE 3: Peer Review (Agents evaluate each other's reasoning)");
    console.log("─".repeat(60) + "\n");

    // Review matrix: [reviewer_idx, trace_id, expected_valid]
    const reviews = [
      [1, 0, true, "Sound game-theoretic reasoning, novel Sybil resistance approach"],
      [2, 0, true, "Well-structured decomposition, assumptions clearly stated"],
      [0, 1, true, "Efficient batching strategy, solid gas optimization"],
      [2, 1, false, "Missed edge case in pagination, flawed storage cost assumption"],
      [0, 2, true, "Elegant ZK construction, well-reasoned tradeoffs"],
      [1, 2, true, "Solid cryptographic reasoning, practical approach"],
    ];

    for (const [reviewerIdx, traceId, valid, critique] of reviews) {
      const reviewer = this.agents[reviewerIdx];
      const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(`review-${traceId}-${reviewer.name}`));

      console.log(`   🔬 ${reviewer.name} reviews trace #${traceId}: ${valid ? "✅ VALID" : "❌ CHALLENGE"}`);
      console.log(`      "${critique}"`);

      try {
        const tx = await reviewer.contract.peerReview(
          traceId, valid, reviewHash, "local://review", critique
        );
        const receipt = await tx.wait();
        console.log(`      ⛓️  On-chain! Gas: ${receipt.gasUsed.toString()}\n`);
      } catch (err) {
        console.log(`      ⚠️  ${err.message.slice(0, 80)}\n`);
      }

      await sleep(800);
    }
  }

  async showResults() {
    console.log("─".repeat(60));
    console.log("  PHASE 4: Living Reputation (emergent from the trust graph)");
    console.log("─".repeat(60) + "\n");

    for (const agent of this.agents) {
      const rep = await agent.contract.getReputation(agent.address);
      const cogScore = Number(rep[0]);
      const traces = Number(rep[1]);
      const validations = Number(rep[2]);
      const challenges = Number(rep[3]);
      const trustDepth = Number(rep[4]);
      const reviews = Number(rep[5]);

      const bar = "█".repeat(Math.round(cogScore / 500)) + "░".repeat(20 - Math.round(cogScore / 500));
      const pct = (cogScore / 100).toFixed(1);

      console.log(`   ${agent.name}`);
      console.log(`   ${bar} ${pct}%`);
      console.log(`   Traces: ${traces} | ✓ ${validations} | ✗ ${challenges} | Trust: ${trustDepth} | Reviews: ${reviews}`);
      console.log("");
    }

    const agentCount = await this.agents[0].contract.getAgentCount();
    const traceCount = await this.agents[0].contract.traceCount();
    console.log(`   🌐 Network: ${agentCount} agents, ${traceCount} traces\n`);
  }

  async run() {
    await this.setup();
    await this.registerAll();
    await this.submitTraces();
    await this.peerReviews();
    await this.showResults();

    console.log("═".repeat(60));
    console.log("  🧠 THE CORTEX IS ALIVE");
    console.log("  Agents think. Peers validate. Trust emerges.");
    console.log("═".repeat(60) + "\n");
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Run ───────────────────────────────────────────────────────
const demo = new DemoOrchestrator();
demo.run().catch(console.error);
