const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CortexProtocol V3 — Reasoning Duels", function () {
  let cortex;
  let fred, deepseek, gemini, voter1;

  beforeEach(async function () {
    [fred, deepseek, gemini, voter1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CortexProtocolV3");
    cortex = await Factory.deploy();
  });

  async function registerAll() {
    await cortex.connect(fred).registerAgent("Fred & Claude", '{"model":"claude-opus-4-6"}');
    await cortex.connect(deepseek).registerAgent("DeepSeek Agent", '{"model":"deepseek-r1"}');
    await cortex.connect(gemini).registerAgent("Gemini Agent", '{"model":"gemini-2.5"}');
    await cortex.connect(voter1).registerAgent("Voter Agent", '{"model":"gpt-4o"}');
  }

  function hash(s) { return ethers.keccak256(ethers.toUtf8Bytes(s)); }

  // ═══════════════════════════════════════════════════════════════
  //  REGISTRATION (same as V2)
  // ═══════════════════════════════════════════════════════════════

  describe("Registration", function () {
    it("should register agents with duel counters at zero", async function () {
      await cortex.connect(fred).registerAgent("Fred & Claude", "{}");
      const agent = await cortex.getAgent(fred.address);
      expect(agent.name).to.equal("Fred & Claude");
      expect(agent.duelsWon).to.equal(0);
      expect(agent.duelsLost).to.equal(0);
    });

    it("should reject duplicate registration", async function () {
      await cortex.connect(fred).registerAgent("Fred", "{}");
      await expect(cortex.connect(fred).registerAgent("Fred2", "{}"))
        .to.be.revertedWith("Already registered");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  TRACES & REVIEWS (same as V2)
  // ═══════════════════════════════════════════════════════════════

  describe("Traces & Reviews", function () {
    beforeEach(registerAll);

    it("should submit and review traces", async function () {
      await cortex.connect(fred).submitTrace(hash("t1"), "Design reputation system", "ipfs://t1", "Result");
      await cortex.connect(deepseek).peerReview(0, true, hash("r1"), "ipfs://r1", "Solid reasoning");

      const trace = await cortex.getTrace(0);
      expect(trace.validations).to.equal(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  REASONING DUELS (V3 Core Feature)
  // ═══════════════════════════════════════════════════════════════

  describe("Reasoning Duels", function () {
    beforeEach(async function () {
      await registerAll();
      // Fred submits a trace
      await cortex.connect(fred).submitTrace(
        hash("fred-reasoning"), 
        "Design a Sybil-resistant reputation system",
        "ipfs://fred-trace",
        "Use staked peer review with reasoning verification"
      );
    });

    it("should create a reasoning duel", async function () {
      const tx = await cortex.connect(deepseek).challengeWithTrace(
        0,
        hash("deepseek-reasoning"),
        "ipfs://deepseek-trace",
        "Use ZK proofs for anonymous staked challenges",
        "Fred's approach lacks formal Sybil resistance"
      );

      expect(tx).to.emit(cortex, "ReasoningDuelCreated");

      const duel = await cortex.getDuel(0);
      expect(duel.originalTraceId).to.equal(0);
      expect(duel.challenger).to.equal(deepseek.address);
      expect(duel.votesForOriginal).to.equal(0);
      expect(duel.votesForChallenger).to.equal(0);
      expect(duel.resolved).to.equal(false);

      // Original trace should show increased challenges
      const trace = await cortex.getTrace(0);
      expect(trace.challenges).to.equal(1);
    });

    it("should reject self-challenge", async function () {
      await expect(
        cortex.connect(fred).challengeWithTrace(0, hash("x"), "uri", "result", "critique")
      ).to.be.revertedWith("Cannot challenge own trace");
    });

    it("should reject challenge on non-existent trace", async function () {
      await expect(
        cortex.connect(deepseek).challengeWithTrace(999, hash("x"), "uri", "result", "critique")
      ).to.be.revertedWith("Trace not found");
    });

    it("should reject challenge from non-agent", async function () {
      const [,,,,outsider] = await ethers.getSigners();
      await expect(
        cortex.connect(outsider).challengeWithTrace(0, hash("x"), "uri", "result", "critique")
      ).to.be.revertedWith("Not a registered agent");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  DUEL VOTING
  // ═══════════════════════════════════════════════════════════════

  describe("Duel Voting", function () {
    beforeEach(async function () {
      await registerAll();
      await cortex.connect(fred).submitTrace(hash("f"), "Design reputation system", "uri", "Result A");
      await cortex.connect(deepseek).challengeWithTrace(0, hash("d"), "uri", "Result B", "Flaw in step 3");
    });

    it("should allow agents to vote on duels", async function () {
      await cortex.connect(gemini).voteOnDuel(0, true, "Challenger has stronger logic");
      
      const duel = await cortex.getDuel(0);
      expect(duel.votesForChallenger).to.equal(1);
      expect(duel.votesForOriginal).to.equal(0);
    });

    it("should allow voting for original", async function () {
      await cortex.connect(gemini).voteOnDuel(0, false, "Original reasoning is more rigorous");
      
      const duel = await cortex.getDuel(0);
      expect(duel.votesForOriginal).to.equal(1);
    });

    it("should reject original author voting", async function () {
      await expect(
        cortex.connect(fred).voteOnDuel(0, false, "I'm right")
      ).to.be.revertedWith("Original author cannot vote");
    });

    it("should reject challenger voting", async function () {
      await expect(
        cortex.connect(deepseek).voteOnDuel(0, true, "I'm right")
      ).to.be.revertedWith("Challenger cannot vote");
    });

    it("should reject duplicate votes", async function () {
      await cortex.connect(gemini).voteOnDuel(0, true, "First vote");
      await expect(
        cortex.connect(gemini).voteOnDuel(0, false, "Changed mind")
      ).to.be.revertedWith("Already voted on this duel");
    });

    it("should track multiple votes", async function () {
      await cortex.connect(gemini).voteOnDuel(0, true, "Challenger wins");
      await cortex.connect(voter1).voteOnDuel(0, false, "Original wins");

      const duel = await cortex.getDuel(0);
      expect(duel.votesForChallenger).to.equal(1);
      expect(duel.votesForOriginal).to.equal(1);

      const votes = await cortex.getDuelVotes(0);
      expect(votes.length).to.equal(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  DUEL RESOLUTION
  // ═══════════════════════════════════════════════════════════════

  describe("Duel Resolution", function () {
    beforeEach(async function () {
      await registerAll();
      await cortex.connect(fred).submitTrace(hash("f"), "Design system", "uri", "Result A");
      await cortex.connect(deepseek).challengeWithTrace(0, hash("d"), "uri", "Result B", "Flaw found");
    });

    it("should resolve duel in favor of challenger", async function () {
      await cortex.connect(gemini).voteOnDuel(0, true, "Challenger is stronger");
      await cortex.connect(voter1).voteOnDuel(0, true, "Agree");

      await cortex.resolveDuel(0);

      const duel = await cortex.getDuel(0);
      expect(duel.resolved).to.equal(true);
      expect(duel.winner).to.equal(deepseek.address);

      // Check duel stats
      const dsAgent = await cortex.getAgent(deepseek.address);
      expect(dsAgent.duelsWon).to.equal(1);
      expect(dsAgent.duelsLost).to.equal(0);

      const fredAgent = await cortex.getAgent(fred.address);
      expect(fredAgent.duelsWon).to.equal(0);
      expect(fredAgent.duelsLost).to.equal(1);
    });

    it("should resolve duel in favor of original", async function () {
      await cortex.connect(gemini).voteOnDuel(0, false, "Original holds up");
      await cortex.connect(voter1).voteOnDuel(0, false, "Agree");

      await cortex.resolveDuel(0);

      const duel = await cortex.getDuel(0);
      expect(duel.resolved).to.equal(true);
      expect(duel.winner).to.equal(fred.address);

      const fredAgent = await cortex.getAgent(fred.address);
      expect(fredAgent.duelsWon).to.equal(1);

      // Surviving a challenge adds a validation
      const trace = await cortex.getTrace(0);
      expect(trace.validations).to.equal(1);
    });

    it("should handle tie", async function () {
      await cortex.connect(gemini).voteOnDuel(0, true, "Challenger");
      await cortex.connect(voter1).voteOnDuel(0, false, "Original");

      await cortex.resolveDuel(0);

      const duel = await cortex.getDuel(0);
      expect(duel.resolved).to.equal(true);
      expect(duel.winner).to.equal(ethers.ZeroAddress); // No winner
    });

    it("should reject resolving with no votes", async function () {
      await expect(cortex.resolveDuel(0))
        .to.be.revertedWith("Need at least 1 vote to resolve");
    });

    it("should reject resolving twice", async function () {
      await cortex.connect(gemini).voteOnDuel(0, true, "Vote");
      await cortex.resolveDuel(0);
      await expect(cortex.resolveDuel(0))
        .to.be.revertedWith("Already resolved");
    });

    it("should reject voting on resolved duel", async function () {
      await cortex.connect(gemini).voteOnDuel(0, true, "Vote");
      await cortex.resolveDuel(0);
      await expect(
        cortex.connect(voter1).voteOnDuel(0, false, "Too late")
      ).to.be.revertedWith("Duel already resolved");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  REPUTATION WITH DUELS
  // ═══════════════════════════════════════════════════════════════

  describe("Reputation with Duels", function () {
    beforeEach(registerAll);

    it("should factor duels into cognitive score", async function () {
      // Fred submits trace, gets 2 validations
      await cortex.connect(fred).submitTrace(hash("f1"), "Task 1", "uri", "Result");
      await cortex.connect(deepseek).peerReview(0, true, hash("r1"), "uri", "Good");
      await cortex.connect(gemini).peerReview(0, true, hash("r2"), "uri", "Good");

      let rep = await cortex.getReputation(fred.address);
      expect(rep.cognitiveScore).to.equal(10000); // 100%

      // DeepSeek challenges Fred and wins
      await cortex.connect(deepseek).challengeWithTrace(0, hash("d1"), "uri", "Better result", "Flaw");
      await cortex.connect(gemini).voteOnDuel(0, true, "Challenger wins");
      await cortex.connect(voter1).voteOnDuel(0, true, "Agree");
      await cortex.resolveDuel(0);

      // Fred now has: 2 validations + 0 duel wins vs 1 challenge + 1 duel loss
      // positive = 2 + (0*3) = 2, negative = 1 + (1*2) = 3, score = 2/5 * 10000 = 4000
      rep = await cortex.getReputation(fred.address);
      expect(rep.cognitiveScore).to.equal(4000); // Dropped from 100% to 40%
      expect(rep.duelsLost).to.equal(1);

      // DeepSeek: won a duel
      rep = await cortex.getReputation(deepseek.address);
      expect(rep.duelsWon).to.equal(1);
    });

    it("should reward surviving a challenge", async function () {
      await cortex.connect(fred).submitTrace(hash("f1"), "Task", "uri", "Result");
      
      // DeepSeek challenges but loses
      await cortex.connect(deepseek).challengeWithTrace(0, hash("d1"), "uri", "Bad result", "Weak critique");
      await cortex.connect(gemini).voteOnDuel(0, false, "Original wins");
      await cortex.resolveDuel(0);

      const fredAgent = await cortex.getAgent(fred.address);
      expect(fredAgent.duelsWon).to.equal(1);

      // Surviving a challenge is worth 3x in the score
      const rep = await cortex.getReputation(fred.address);
      // positive = 1 validation (from surviving) + 1*3 (duel win) = 4
      // negative = 1 challenge + 0 = 1
      // score = 4/5 * 10000 = 8000
      expect(rep.cognitiveScore).to.equal(8000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  FULL SCENARIO: THE REASONING ARENA
  // ═══════════════════════════════════════════════════════════════

  describe("Full Scenario: The Reasoning Arena", function () {
    it("should simulate a complete reasoning duel lifecycle", async function () {
      await registerAll();

      // 1. Fred submits a strong trace
      await cortex.connect(fred).submitTrace(
        hash("fred-sybil-design"),
        "Design a Sybil-resistant reputation for AI agents",
        "ipfs://fred-trace-sybil",
        "Staked peer review with reasoning verification and directional trust graph"
      );

      // 2. Two agents validate Fred's reasoning
      await cortex.connect(gemini).peerReview(0, true, hash("g-r1"), "uri", "Sound game-theoretic approach");
      await cortex.connect(voter1).peerReview(0, true, hash("v-r1"), "uri", "Well-structured decomposition");

      // 3. DeepSeek challenges with a competing approach
      await cortex.connect(deepseek).challengeWithTrace(
        0,
        hash("deepseek-sybil-design"),
        "ipfs://deepseek-trace-sybil",
        "ZK-based anonymous reputation with re-execution proofs",
        "Fred assumes reasoning traces are faithful to actual cognition — this is unfounded. ZK re-execution provides stronger guarantees."
      );

      // 4. Gemini and Voter evaluate both approaches
      await cortex.connect(gemini).voteOnDuel(0, false, "Fred's approach is more practical and auditable. ZK adds complexity without clear benefit at this stage.");
      await cortex.connect(voter1).voteOnDuel(0, false, "Original reasoning is more complete — DeepSeek's ZK approach has implementation gaps.");

      // 5. Resolve the duel — Fred wins
      await cortex.resolveDuel(0);

      const duel = await cortex.getDuel(0);
      expect(duel.resolved).to.be.true;
      expect(duel.winner).to.equal(fred.address);
      expect(duel.votesForOriginal).to.equal(2);
      expect(duel.votesForChallenger).to.equal(0);

      // 6. Check final reputations
      const fredRep = await cortex.getReputation(fred.address);
      // Fred: 2 validations + 1 survived challenge + 1 duel win (3x)
      // positive = 3 + 3 = 6, negative = 1 challenge + 0 loss = 1
      // score = 6/7 * 10000 ≈ 8571
      expect(fredRep.duelsWon).to.equal(1);
      expect(fredRep.duelsLost).to.equal(0);
      expect(fredRep.cognitiveScore).to.be.greaterThan(8000);

      const dsRep = await cortex.getReputation(deepseek.address);
      expect(dsRep.duelsWon).to.equal(0);
      expect(dsRep.duelsLost).to.equal(1);

      // 7. Network stats
      expect(await cortex.getAgentCount()).to.equal(4);
      expect(await cortex.traceCount()).to.equal(1);
      expect(await cortex.duelCount()).to.equal(1);

      // The arena works: reasoning was tested in combat, not just opinions.
    });
  });
});
