const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentReputation", function () {
  let contract;
  let owner, agent1, agent2, attestor1, attestor2;

  beforeEach(async function () {
    [owner, agent1, agent2, attestor1, attestor2] = await ethers.getSigners();
    const AgentReputation = await ethers.getContractFactory("AgentReputation");
    contract = await AgentReputation.deploy();
  });

  describe("Registration", function () {
    it("should register a new agent", async function () {
      await contract.connect(agent1).registerAgent(
        "Fred & Claude",
        '{"model":"claude-opus-4-6","harness":"anthropic-api"}'
      );

      const agent = await contract.getAgent(agent1.address);
      expect(agent.name).to.equal("Fred & Claude");
      expect(agent.exists).to.be.true;
    });

    it("should reject duplicate registration", async function () {
      await contract.connect(agent1).registerAgent("Agent1", "{}");
      await expect(
        contract.connect(agent1).registerAgent("Agent1 Again", "{}")
      ).to.be.revertedWith("Agent already registered");
    });

    it("should reject empty name", async function () {
      await expect(
        contract.connect(agent1).registerAgent("", "{}")
      ).to.be.revertedWith("Name required");
    });

    it("should track agent count", async function () {
      await contract.connect(agent1).registerAgent("Agent1", "{}");
      await contract.connect(agent2).registerAgent("Agent2", "{}");
      expect(await contract.getAgentCount()).to.equal(2);
    });
  });

  describe("Attestations", function () {
    beforeEach(async function () {
      await contract.connect(agent1).registerAgent("Fred & Claude", "{}");
      await contract.connect(agent2).registerAgent("Other Agent", "{}");
    });

    it("should create an attestation", async function () {
      await contract.connect(attestor1).attest(
        agent1.address,
        5,
        "code",
        "ipfs://Qm123...",
        "Excellent Solidity work"
      );

      const atts = await contract.getAttestations(agent1.address);
      expect(atts.length).to.equal(1);
      expect(atts[0].rating).to.equal(5);
      expect(atts[0].taskType).to.equal("code");
    });

    it("should reject self-attestation", async function () {
      await expect(
        contract.connect(agent1).attest(agent1.address, 5, "code", "", "I'm great")
      ).to.be.revertedWith("Cannot attest yourself");
    });

    it("should reject invalid rating", async function () {
      await expect(
        contract.connect(attestor1).attest(agent1.address, 0, "code", "", "Bad")
      ).to.be.revertedWith("Rating must be 1-5");

      await expect(
        contract.connect(attestor1).attest(agent1.address, 6, "code", "", "Too high")
      ).to.be.revertedWith("Rating must be 1-5");
    });

    it("should reject attestation for unregistered agent", async function () {
      await expect(
        contract.connect(attestor1).attest(attestor1.address, 5, "code", "", "Who?")
      ).to.be.revertedWith("Agent not registered");
    });
  });

  describe("Reputation Scores", function () {
    beforeEach(async function () {
      await contract.connect(agent1).registerAgent("Fred & Claude", "{}");
    });

    it("should return 0 for agent with no attestations", async function () {
      const [score, count] = await contract.getReputation(agent1.address);
      expect(score).to.equal(0);
      expect(count).to.equal(0);
    });

    it("should calculate correct average", async function () {
      // Three attestations: 5, 4, 3 → average = 4.0 → score = 400
      await contract.connect(attestor1).attest(agent1.address, 5, "code", "", "Great");
      await contract.connect(attestor2).attest(agent1.address, 4, "code", "", "Good");
      await contract.connect(agent2).attest(agent1.address, 3, "research", "", "OK");

      const [score, count] = await contract.getReputation(agent1.address);
      expect(count).to.equal(3);
      expect(score).to.equal(400); // (5+4+3)/3 * 100 = 400
    });

    it("should filter reputation by task type", async function () {
      await contract.connect(attestor1).attest(agent1.address, 5, "code", "", "Great code");
      await contract.connect(attestor2).attest(agent1.address, 2, "research", "", "Meh research");

      const [codeScore, codeCount] = await contract.getReputationByTask(agent1.address, "code");
      expect(codeCount).to.equal(1);
      expect(codeScore).to.equal(500); // 5/1 * 100

      const [researchScore, researchCount] = await contract.getReputationByTask(agent1.address, "research");
      expect(researchCount).to.equal(1);
      expect(researchScore).to.equal(200); // 2/1 * 100
    });

    it("should handle perfect score", async function () {
      await contract.connect(attestor1).attest(agent1.address, 5, "code", "", "Perfect");
      await contract.connect(attestor2).attest(agent1.address, 5, "code", "", "Also perfect");

      const [score, count] = await contract.getReputation(agent1.address);
      expect(score).to.equal(500);
      expect(count).to.equal(2);
    });
  });

  describe("Events", function () {
    it("should emit AgentRegistered event", async function () {
      await expect(contract.connect(agent1).registerAgent("Fred & Claude", "{}"))
        .to.emit(contract, "AgentRegistered");
    });

    it("should emit AttestationCreated event", async function () {
      await contract.connect(agent1).registerAgent("Fred & Claude", "{}");

      await expect(
        contract.connect(attestor1).attest(agent1.address, 5, "code", "", "Great")
      ).to.emit(contract, "AttestationCreated");
    });
  });
});

// Helper to get current block timestamp
async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
