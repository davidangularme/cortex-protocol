const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CortexProtocol", function () {
  let cortex;
  let agent1, agent2, agent3, agent4;

  beforeEach(async function () {
    [agent1, agent2, agent3, agent4] = await ethers.getSigners();
    const CortexProtocol = await ethers.getContractFactory("CortexProtocol");
    cortex = await CortexProtocol.deploy();
  });

  // Helper: register an agent
  async function register(signer, name, meta = "{}") {
    return cortex.connect(signer).registerAgent(name, meta);
  }

  // Helper: submit a trace
  async function submitTrace(signer, task, summary = "Completed task") {
    const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(`reasoning-${task}-${Date.now()}`));
    return cortex.connect(signer).submitTrace(
      reasoningHash,
      task,
      "ipfs://QmTrace123",
      summary
    );
  }

  // Helper: peer review
  async function review(signer, traceId, valid, critique = "Solid reasoning") {
    const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(`review-${traceId}-${Date.now()}`));
    return cortex.connect(signer).peerReview(
      traceId,
      valid,
      reviewHash,
      "ipfs://QmReview123",
      critique
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  describe("Agent Registration", function () {
    it("should register an agent", async function () {
      await register(agent1, "Fred & Claude", '{"model":"claude-opus-4-6"}');
      const agent = await cortex.getAgent(agent1.address);
      expect(agent.name).to.equal("Fred & Claude");
      expect(agent.tracesSubmitted).to.equal(0);
      expect(agent.reviewsPerformed).to.equal(0);
    });

    it("should reject duplicate registration", async function () {
      await register(agent1, "Fred & Claude");
      await expect(register(agent1, "Fred Again")).to.be.revertedWith("Already registered");
    });

    it("should reject empty name", async function () {
      await expect(register(agent1, "")).to.be.revertedWith("Name required");
    });

    it("should emit AgentRegistered event", async function () {
      await expect(register(agent1, "Fred & Claude"))
        .to.emit(cortex, "AgentRegistered");
    });

    it("should track agent count", async function () {
      await register(agent1, "Agent1");
      await register(agent2, "Agent2");
      await register(agent3, "Agent3");
      expect(await cortex.getAgentCount()).to.equal(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  DECISION TRACES
  // ═══════════════════════════════════════════════════════════════

  describe("Decision Traces", function () {
    beforeEach(async function () {
      await register(agent1, "Fred & Claude");
      await register(agent2, "Peer Agent");
    });

    it("should submit a decision trace", async function () {
      await submitTrace(agent1, "Write a smart contract");
      const trace = await cortex.getTrace(0);
      expect(trace.agent).to.equal(agent1.address);
      expect(trace.taskContext).to.equal("Write a smart contract");
      expect(trace.validations).to.equal(0);
      expect(trace.challenges).to.equal(0);
    });

    it("should increment tracesSubmitted counter", async function () {
      await submitTrace(agent1, "Task 1");
      await submitTrace(agent1, "Task 2");
      const agent = await cortex.getAgent(agent1.address);
      expect(agent.tracesSubmitted).to.equal(2);
    });

    it("should reject trace from non-agent", async function () {
      await expect(submitTrace(agent3, "Unregistered task"))
        .to.be.revertedWith("Not a registered agent");
    });

    it("should emit TraceSubmitted event", async function () {
      await expect(submitTrace(agent1, "Solve the Riemann Hypothesis"))
        .to.emit(cortex, "TraceSubmitted");
    });

    it("should retrieve all traces by an agent", async function () {
      await submitTrace(agent1, "Task A");
      await submitTrace(agent1, "Task B");
      await submitTrace(agent2, "Task C");

      const traces = await cortex.getAgentTraces(agent1.address);
      expect(traces.length).to.equal(2);
      expect(traces[0].taskContext).to.equal("Task A");
      expect(traces[1].taskContext).to.equal("Task B");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  PEER REVIEWS
  // ═══════════════════════════════════════════════════════════════

  describe("Peer Reviews", function () {
    beforeEach(async function () {
      await register(agent1, "Fred & Claude");
      await register(agent2, "Reviewer Alpha");
      await register(agent3, "Reviewer Beta");
      await submitTrace(agent1, "Design a reputation system");
    });

    it("should create a positive peer review", async function () {
      await review(agent2, 0, true, "Reasoning is airtight");
      const trace = await cortex.getTrace(0);
      expect(trace.validations).to.equal(1);
      expect(trace.challenges).to.equal(0);
    });

    it("should create a negative peer review (challenge)", async function () {
      await review(agent2, 0, false, "Flawed assumption in step 3");
      const trace = await cortex.getTrace(0);
      expect(trace.validations).to.equal(0);
      expect(trace.challenges).to.equal(1);
    });

    it("should handle multiple reviews on same trace", async function () {
      await review(agent2, 0, true, "Valid");
      await review(agent3, 0, false, "Disagree");
      const trace = await cortex.getTrace(0);
      expect(trace.validations).to.equal(1);
      expect(trace.challenges).to.equal(1);
    });

    it("should reject self-review", async function () {
      await expect(review(agent1, 0, true, "I'm brilliant"))
        .to.be.revertedWith("Cannot review own trace");
    });

    it("should reject duplicate review", async function () {
      await review(agent2, 0, true, "Valid");
      await expect(review(agent2, 0, false, "Changed my mind"))
        .to.be.revertedWith("Already reviewed this trace");
    });

    it("should reject review from non-agent", async function () {
      await expect(review(agent4, 0, true, "Nice"))
        .to.be.revertedWith("Not a registered agent");
    });

    it("should reject review of non-existent trace", async function () {
      await expect(review(agent2, 999, true, "Ghost trace"))
        .to.be.revertedWith("Trace not found");
    });

    it("should increment reviewer's review count", async function () {
      await submitTrace(agent1, "Another task");
      await review(agent2, 0, true, "Good");
      await review(agent2, 1, true, "Also good");
      const reviewer = await cortex.getAgent(agent2.address);
      expect(reviewer.reviewsPerformed).to.equal(2);
    });

    it("should emit PeerReviewSubmitted event", async function () {
      await expect(review(agent2, 0, true, "Solid"))
        .to.emit(cortex, "PeerReviewSubmitted");
    });

    it("should retrieve all reviews for a trace", async function () {
      await review(agent2, 0, true, "Approved");
      await review(agent3, 0, true, "Confirmed");
      const reviews = await cortex.getTraceReviews(0);
      expect(reviews.length).to.equal(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  TRUST GRAPH
  // ═══════════════════════════════════════════════════════════════

  describe("Trust Graph", function () {
    beforeEach(async function () {
      await register(agent1, "Fred & Claude");
      await register(agent2, "Validator A");
      await register(agent3, "Validator B");
      await submitTrace(agent1, "Build Cortex Protocol");
    });

    it("should create trust edge on positive review", async function () {
      await review(agent2, 0, true, "Valid");
      const weight = await cortex.getTrustEdge(agent2.address, agent1.address);
      expect(weight).to.equal(1);
    });

    it("should NOT create trust edge on negative review", async function () {
      await review(agent2, 0, false, "Invalid");
      const weight = await cortex.getTrustEdge(agent2.address, agent1.address);
      expect(weight).to.equal(0);
    });

    it("should accumulate trust weight over multiple validations", async function () {
      await submitTrace(agent1, "Task 2");
      await review(agent2, 0, true, "Good");
      await review(agent2, 1, true, "Also good");
      const weight = await cortex.getTrustEdge(agent2.address, agent1.address);
      expect(weight).to.equal(2);
    });

    it("should track trust network", async function () {
      await review(agent2, 0, true, "Valid");
      await review(agent3, 0, true, "Confirmed");
      const network = await cortex.getTrustNetwork(agent1.address);
      expect(network.length).to.equal(2);
      expect(network).to.include(agent2.address);
      expect(network).to.include(agent3.address);
    });

    it("should emit TrustEdgeUpdated event", async function () {
      await expect(review(agent2, 0, true, "Valid"))
        .to.emit(cortex, "TrustEdgeUpdated")
        .withArgs(agent2.address, agent1.address, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  LIVING REPUTATION
  // ═══════════════════════════════════════════════════════════════

  describe("Living Reputation", function () {
    beforeEach(async function () {
      await register(agent1, "Fred & Claude");
      await register(agent2, "Reviewer A");
      await register(agent3, "Reviewer B");
      await register(agent4, "Reviewer C");
    });

    it("should return zero reputation for new agent", async function () {
      const rep = await cortex.getReputation(agent1.address);
      expect(rep.cognitiveScore).to.equal(0);
      expect(rep.totalTraces).to.equal(0);
      expect(rep.trustDepth).to.equal(0);
    });

    it("should calculate perfect cognitive score", async function () {
      await submitTrace(agent1, "Task 1");
      await review(agent2, 0, true, "Perfect");
      await review(agent3, 0, true, "Flawless");

      const rep = await cortex.getReputation(agent1.address);
      expect(rep.cognitiveScore).to.equal(10000); // 100%
      expect(rep.totalValidations).to.equal(2);
      expect(rep.totalChallenges).to.equal(0);
      expect(rep.trustDepth).to.equal(2);
    });

    it("should calculate mixed reputation", async function () {
      await submitTrace(agent1, "Task 1");
      await submitTrace(agent1, "Task 2");

      // Task 1: 2 validations, 1 challenge
      await review(agent2, 0, true, "Good");
      await review(agent3, 0, true, "Solid");
      await review(agent4, 0, false, "Weak step 4");

      // Task 2: 1 validation
      await review(agent2, 1, true, "Nice");

      const rep = await cortex.getReputation(agent1.address);
      // 3 validations / (3 + 1) = 7500 basis points = 75%
      expect(rep.cognitiveScore).to.equal(7500);
      expect(rep.totalTraces).to.equal(2);
      expect(rep.totalValidations).to.equal(3);
      expect(rep.totalChallenges).to.equal(1);
    });

    it("should track review contributions", async function () {
      await submitTrace(agent1, "Task 1");
      await review(agent2, 0, true, "Ok");
      
      const rep = await cortex.getReputation(agent2.address);
      expect(rep.reviewContributions).to.equal(1);
    });

    it("should reflect reputation evolution over time", async function () {
      // Phase 1: Agent starts strong
      await submitTrace(agent1, "Task 1");
      await review(agent2, 0, true, "Excellent");
      
      let rep = await cortex.getReputation(agent1.address);
      expect(rep.cognitiveScore).to.equal(10000); // 100%

      // Phase 2: Agent gets challenged
      await submitTrace(agent1, "Task 2");
      await review(agent2, 1, false, "Flawed logic");
      await review(agent3, 1, false, "Agree, broken reasoning");

      rep = await cortex.getReputation(agent1.address);
      // 1 validation / (1 + 2) = 3333 basis points ≈ 33%
      expect(rep.cognitiveScore).to.equal(3333);

      // Phase 3: Agent recovers
      await submitTrace(agent1, "Task 3");
      await review(agent2, 2, true, "Much better");
      await review(agent3, 2, true, "Redeemed");
      await review(agent4, 2, true, "Strong comeback");

      rep = await cortex.getReputation(agent1.address);
      // 4 validations / (4 + 2) = 6666 basis points ≈ 66.7%
      expect(rep.cognitiveScore).to.equal(6666);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  FULL SCENARIO: THE CORTEX COMES ALIVE
  // ═══════════════════════════════════════════════════════════════

  describe("Full Scenario: Cortex Comes Alive", function () {
    it("should simulate a mini agent ecosystem", async function () {
      // 1. Three agents register
      await register(agent1, "Fred & Claude", '{"model":"claude-opus-4-6"}');
      await register(agent2, "DeepSeek Agent", '{"model":"deepseek-r1"}');
      await register(agent3, "GPT Agent", '{"model":"gpt-4o"}');

      // 2. Fred & Claude submits a trace for building Cortex
      await submitTrace(agent1, "Design decentralized reputation protocol");

      // 3. Both peers validate the reasoning
      await review(agent2, 0, true, "Novel approach to agent trust");
      await review(agent3, 0, true, "Sound game-theoretic reasoning");

      // 4. DeepSeek submits its own trace
      await submitTrace(agent2, "Optimize gas costs for reputation queries");

      // 5. Fred & Claude reviews it, GPT challenges it
      await review(agent1, 1, true, "Efficient batching strategy");
      await review(agent3, 1, false, "Missed edge case in pagination");

      // 6. Check the state of the cortex
      const fredRep = await cortex.getReputation(agent1.address);
      expect(fredRep.cognitiveScore).to.equal(10000);  // 2/2 = perfect
      expect(fredRep.trustDepth).to.equal(2);           // trusted by 2 agents
      expect(fredRep.reviewContributions).to.equal(1);  // reviewed 1 trace

      const deepseekRep = await cortex.getReputation(agent2.address);
      expect(deepseekRep.cognitiveScore).to.equal(5000); // 1/2 = 50%
      expect(deepseekRep.trustDepth).to.equal(1);         // trusted by 1 agent

      // 7. The trust graph shows who trusts whom
      expect(await cortex.getTrustEdge(agent2.address, agent1.address)).to.equal(1);
      expect(await cortex.getTrustEdge(agent3.address, agent1.address)).to.equal(1);
      expect(await cortex.getTrustEdge(agent1.address, agent2.address)).to.equal(1);
      expect(await cortex.getTrustEdge(agent3.address, agent2.address)).to.equal(0); // challenged, no trust

      // The cortex is alive. Trust is earned through reasoning, not ratings.
      expect(await cortex.traceCount()).to.equal(2);
      expect(await cortex.reviewCount()).to.equal(4);
      expect(await cortex.getAgentCount()).to.equal(3);
    });
  });
});
