const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CortexProtocol V4 — Reasoning Bonds", function () {
  let cortex;
  let fred, deepseek, gemini, voter1;
  const MIN_BOND = ethers.parseEther("0.0001");
  const BOND = ethers.parseEther("0.0005");

  beforeEach(async function () {
    [fred, deepseek, gemini, voter1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CortexProtocolV4");
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
  //  REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  describe("Registration", function () {
    it("should register with bond counters at zero", async function () {
      await cortex.connect(fred).registerAgent("Fred", "{}");
      const agent = await cortex.getAgent(fred.address);
      expect(agent.totalBonded).to.equal(0);
      expect(agent.totalSlashed).to.equal(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  REASONING BONDS
  // ═══════════════════════════════════════════════════════════════

  describe("Reasoning Bonds", function () {
    beforeEach(registerAll);

    it("should submit trace with bond", async function () {
      await cortex.connect(fred).submitTrace(hash("t1"), "Task", "uri", "Result", { value: BOND });
      
      const trace = await cortex.getTrace(0);
      expect(trace.bondAmount).to.equal(BOND);
      expect(trace.bondClaimed).to.equal(false);
      expect(trace.challengeDeadline).to.be.gt(0);

      const agent = await cortex.getAgent(fred.address);
      expect(agent.totalBonded).to.equal(BOND);
    });

    it("should reject trace below minimum bond", async function () {
      const tooLow = ethers.parseEther("0.00001");
      await expect(
        cortex.connect(fred).submitTrace(hash("t1"), "Task", "uri", "Result", { value: tooLow })
      ).to.be.revertedWith("Bond below minimum");
    });

    it("should track total bonds locked", async function () {
      await cortex.connect(fred).submitTrace(hash("t1"), "Task 1", "uri", "R1", { value: BOND });
      await cortex.connect(fred).submitTrace(hash("t2"), "Task 2", "uri", "R2", { value: BOND });
      expect(await cortex.totalBondsLocked()).to.equal(BOND * 2n);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  BOND SEIZURE VIA DUEL
  // ═══════════════════════════════════════════════════════════════

  describe("Bond Seizure", function () {
    beforeEach(async function () {
      await registerAll();
      await cortex.connect(fred).submitTrace(
        hash("fred-reasoning"), "Design reputation system", "uri", "Staked peer review",
        { value: BOND }
      );
    });

    it("should seize bond when challenger wins duel", async function () {
      // DeepSeek challenges
      await cortex.connect(deepseek).challengeWithTrace(
        0, hash("ds-reasoning"), "uri", "Better approach", "Flaw in step 3"
      );

      // Gemini and Voter vote for challenger
      await cortex.connect(gemini).voteOnDuel(0, true, "Challenger is stronger");
      await cortex.connect(voter1).voteOnDuel(0, true, "Agree");

      const dsBefore = await ethers.provider.getBalance(deepseek.address);

      // Resolve — challenger wins, seizes bond
      await cortex.resolveDuel(0);

      const dsAfter = await ethers.provider.getBalance(deepseek.address);
      expect(dsAfter - dsBefore).to.equal(BOND);

      // Verify trace state
      const trace = await cortex.getTrace(0);
      expect(trace.bondClaimed).to.equal(true);

      // Verify agent stats
      const fredAgent = await cortex.getAgent(fred.address);
      expect(fredAgent.totalSlashed).to.equal(BOND);
      expect(fredAgent.duelsLost).to.equal(1);

      // Verify protocol stats
      expect(await cortex.totalSlashed()).to.equal(BOND);
    });

    it("should NOT seize bond when original wins", async function () {
      await cortex.connect(deepseek).challengeWithTrace(
        0, hash("ds"), "uri", "Weak attempt", "Bad critique"
      );

      await cortex.connect(gemini).voteOnDuel(0, false, "Original wins");
      await cortex.connect(voter1).voteOnDuel(0, false, "Agree");

      await cortex.resolveDuel(0);

      const trace = await cortex.getTrace(0);
      expect(trace.bondClaimed).to.equal(false); // Bond still locked, not seized
      expect(trace.bondAmount).to.equal(BOND);

      const fredAgent = await cortex.getAgent(fred.address);
      expect(fredAgent.totalSlashed).to.equal(0);
      expect(fredAgent.duelsWon).to.equal(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  BOND RECLAMATION
  // ═══════════════════════════════════════════════════════════════

  describe("Bond Reclamation", function () {
    beforeEach(async function () {
      await registerAll();
      await cortex.connect(fred).submitTrace(
        hash("t1"), "Task", "uri", "Result", { value: BOND }
      );
    });

    it("should reclaim bond after challenge period", async function () {
      // Fast-forward past challenge period
      await time.increase(3601); // 1 hour + 1 second

      const balBefore = await ethers.provider.getBalance(fred.address);
      const tx = await cortex.connect(fred).reclaimBond(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(fred.address);

      expect(balAfter - balBefore + gasCost).to.equal(BOND);

      const trace = await cortex.getTrace(0);
      expect(trace.bondClaimed).to.equal(true);
    });

    it("should reject reclaim during challenge period", async function () {
      await expect(
        cortex.connect(fred).reclaimBond(0)
      ).to.be.revertedWith("Challenge period active");
    });

    it("should reject reclaim by non-owner", async function () {
      await time.increase(3601);
      await expect(
        cortex.connect(deepseek).reclaimBond(0)
      ).to.be.revertedWith("Not trace owner");
    });

    it("should reject reclaim if unresolved duel exists", async function () {
      await cortex.connect(deepseek).challengeWithTrace(
        0, hash("ds"), "uri", "Result", "Critique"
      );

      await time.increase(3601);
      await expect(
        cortex.connect(fred).reclaimBond(0)
      ).to.be.revertedWith("Resolve duels first");
    });

    it("should reject double reclaim", async function () {
      await time.increase(3601);
      await cortex.connect(fred).reclaimBond(0);
      await expect(
        cortex.connect(fred).reclaimBond(0)
      ).to.be.revertedWith("Bond already claimed");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  REPUTATION WITH BONDS
  // ═══════════════════════════════════════════════════════════════

  describe("Reputation with Bonds", function () {
    beforeEach(registerAll);

    it("should give bonus for unslashed bonds", async function () {
      await cortex.connect(fred).submitTrace(hash("t1"), "Task", "uri", "R", { value: BOND });
      await cortex.connect(deepseek).peerReview(0, true, hash("r1"), "uri", "Good");

      const rep = await cortex.getReputation(fred.address);
      // 1 validation + 2 unslashed bonus = 3 positive, 0 negative
      // score = 3/3 * 10000 = 10000
      expect(rep.cognitiveScore).to.equal(10000);
      expect(rep.totalBonded).to.equal(BOND);
      expect(rep.totalSlashedAmt).to.equal(0);
    });

    it("should lose bonus when slashed", async function () {
      await cortex.connect(fred).submitTrace(hash("t1"), "Task", "uri", "R", { value: BOND });
      await cortex.connect(deepseek).challengeWithTrace(0, hash("ds"), "uri", "Better", "Flaw");
      await cortex.connect(gemini).voteOnDuel(0, true, "Challenger wins");
      await cortex.resolveDuel(0);

      const rep = await cortex.getReputation(fred.address);
      expect(rep.totalSlashedAmt).to.equal(BOND);
      // No unslashed bonus, 0 validations, 1 challenge + 1 duel loss (2x)
      // positive = 0, negative = 1 + 2 = 3, score = 0
      expect(rep.cognitiveScore).to.equal(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  FULL SCENARIO: THE FALSIFICATION MARKET
  // ═══════════════════════════════════════════════════════════════

  describe("Full Scenario: The Falsification Market", function () {
    it("should demonstrate the complete adversarial cycle", async function () {
      await registerAll();

      // 1. Fred bonds ETH on his reasoning
      await cortex.connect(fred).submitTrace(
        hash("fred-sybil-design"),
        "Design Sybil-resistant reputation for AI agents",
        "ipfs://fred-trace",
        "Staked peer review with reasoning bonds and adversarial falsification",
        { value: BOND }
      );

      const trace0 = await cortex.getTrace(0);
      expect(trace0.bondAmount).to.equal(BOND);

      // 2. Gemini validates — agrees the reasoning is sound
      await cortex.connect(gemini).peerReview(0, true, hash("g-review"), "uri",
        "Sound approach — economic incentives aligned with reasoning quality"
      );

      // 3. DeepSeek sees the bond and challenges — potential profit!
      await cortex.connect(deepseek).challengeWithTrace(
        0,
        hash("deepseek-alternative"),
        "ipfs://deepseek-trace",
        "ZK-based anonymous reputation with re-execution proofs",
        "Fred's reasoning bonds create perverse incentive: agents will submit only safe, obvious traces to protect their bond. Bold reasoning gets punished."
      );

      // 4. Network votes — DeepSeek's critique is valid but the alternative is weaker
      await cortex.connect(gemini).voteOnDuel(0, false,
        "Valid critique about risk aversion, but original design addresses this through variable bond amounts"
      );
      await cortex.connect(voter1).voteOnDuel(0, false,
        "Original reasoning is more complete and practically implementable"
      );

      // 5. Resolve — Fred survives the challenge, keeps his bond
      await cortex.resolveDuel(0);

      const duel = await cortex.getDuel(0);
      expect(duel.winner).to.equal(fred.address);

      // 6. Fast-forward, Fred reclaims bond
      await time.increase(3601);
      await cortex.connect(fred).reclaimBond(0);

      // 7. Final state — trust earned through survived adversarial challenge
      const fredRep = await cortex.getReputation(fred.address);
      expect(fredRep.duelsWon).to.equal(1);
      expect(fredRep.totalBonded).to.equal(BOND);
      expect(fredRep.totalSlashedAmt).to.equal(0);
      expect(fredRep.cognitiveScore).to.be.gt(0);

      // The cycle: bond → challenge → survive → stronger trust
      // "Trust is the residue — what remains after all profitable attacks failed."
    });
  });
});
