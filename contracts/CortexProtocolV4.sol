// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CortexProtocol V4 — Reasoning Bonds & Adversarial Falsification
/// @author Fred & Claude (The Synthesis Hackathon 2026)
/// @notice Trust is not accumulated by validation. Trust is the residue —
///         what remains after all profitable attacks have been attempted and failed.
///         Agents bond ETH to their reasoning. Challengers profit from proving flaws.

contract CortexProtocolV4 {

    // ─── Data Structures ───────────────────────────────────────────

    struct Agent {
        address addr;
        string name;
        string metadata;
        uint256 registeredAt;
        uint256 tracesSubmitted;
        uint256 reviewsPerformed;
        uint256 duelsWon;
        uint256 duelsLost;
        uint256 totalBonded;      // Total ETH bonded across all traces
        uint256 totalSlashed;     // Total ETH lost to successful challenges
        bool exists;
    }

    struct DecisionTrace {
        uint256 id;
        address agent;
        bytes32 reasoningHash;
        string taskDescription;
        string traceURI;
        string resultSummary;
        uint256 timestamp;
        uint256 validations;
        uint256 challenges;
        // Reasoning Bond fields
        uint256 bondAmount;          // ETH bonded to this trace
        uint256 challengeDeadline;   // After this, bond can be reclaimed
        bool bondClaimed;            // Has the bond been returned/seized?
        bool exists;
    }

    struct PeerReview {
        uint256 id;
        uint256 traceId;
        address reviewer;
        bool valid;
        bytes32 reviewHash;
        string reviewURI;
        string critique;
        uint256 timestamp;
    }

    struct ReasoningDuel {
        uint256 id;
        uint256 originalTraceId;
        address challenger;
        bytes32 challengerReasoningHash;
        string challengerTraceURI;
        string challengerResultSummary;
        string critique;
        uint256 timestamp;
        uint256 votesForOriginal;
        uint256 votesForChallenger;
        bool resolved;
        address winner;
    }

    struct DuelVote {
        address voter;
        bool votedForChallenger;
        string justification;
        uint256 timestamp;
    }

    // ─── Constants ─────────────────────────────────────────────────

    uint256 public constant CHALLENGE_PERIOD = 1 hours;  // Short for hackathon demo
    uint256 public constant MIN_BOND = 0.0001 ether;     // Minimum bond

    // ─── State ─────────────────────────────────────────────────────

    mapping(address => Agent) public agents;
    address[] public agentList;

    DecisionTrace[] public traces;
    mapping(uint256 => PeerReview[]) public traceReviews;
    mapping(uint256 => mapping(address => bool)) public hasReviewed;

    ReasoningDuel[] public duels;
    mapping(uint256 => DuelVote[]) public duelVotes;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnDuel;

    mapping(address => mapping(address => uint256)) public trustEdges;
    mapping(address => address[]) public trustedBy;

    uint256 public traceCount;
    uint256 public reviewCount;
    uint256 public duelCount;
    uint256 public totalBondsLocked;
    uint256 public totalSlashed;

    // ─── Events ────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent, string name, uint256 timestamp);
    event TraceSubmitted(uint256 indexed traceId, address indexed agent, uint256 bondAmount, string taskDescription, uint256 timestamp);
    event PeerReviewSubmitted(uint256 indexed reviewId, uint256 indexed traceId, address indexed reviewer, bool valid, uint256 timestamp);
    event ReasoningDuelCreated(uint256 indexed duelId, uint256 indexed originalTraceId, address indexed challenger, uint256 timestamp);
    event DuelVoteCast(uint256 indexed duelId, address indexed voter, bool votedForChallenger, uint256 timestamp);
    event DuelResolved(uint256 indexed duelId, address indexed winner, uint256 votesOriginal, uint256 votesChallenger, uint256 timestamp);
    event BondSeized(uint256 indexed traceId, address indexed challenger, uint256 amount, uint256 timestamp);
    event BondReclaimed(uint256 indexed traceId, address indexed agent, uint256 amount, uint256 timestamp);
    event TrustEdgeUpdated(address indexed from, address indexed to, uint256 newWeight);

    // ─── Modifiers ─────────────────────────────────────────────────

    modifier onlyAgent() {
        require(agents[msg.sender].exists, "Not a registered agent");
        _;
    }

    modifier traceExists(uint256 _traceId) {
        require(_traceId < traceCount && traces[_traceId].exists, "Trace not found");
        _;
    }

    modifier duelExists(uint256 _duelId) {
        require(_duelId < duelCount, "Duel not found");
        _;
    }

    // ─── Agent Registration ────────────────────────────────────────

    function registerAgent(string calldata _name, string calldata _metadata) external {
        require(!agents[msg.sender].exists, "Already registered");
        require(bytes(_name).length > 0, "Name required");

        agents[msg.sender] = Agent({
            addr: msg.sender,
            name: _name,
            metadata: _metadata,
            registeredAt: block.timestamp,
            tracesSubmitted: 0,
            reviewsPerformed: 0,
            duelsWon: 0,
            duelsLost: 0,
            totalBonded: 0,
            totalSlashed: 0,
            exists: true
        });

        agentList.push(msg.sender);
        emit AgentRegistered(msg.sender, _name, block.timestamp);
    }

    // ─── Decision Traces with Reasoning Bond ───────────────────────

    /// @notice Submit a trace with a Reasoning Bond. The bond says:
    ///         "I am so confident in my reasoning that I stake ETH on it.
    ///          If you can prove I'm wrong, you take my bond."
    function submitTrace(
        bytes32 _reasoningHash,
        string calldata _taskDescription,
        string calldata _traceURI,
        string calldata _resultSummary
    ) external payable onlyAgent returns (uint256 traceId) {
        require(msg.value >= MIN_BOND, "Bond below minimum");

        traceId = traceCount;

        traces.push(DecisionTrace({
            id: traceId,
            agent: msg.sender,
            reasoningHash: _reasoningHash,
            taskDescription: _taskDescription,
            traceURI: _traceURI,
            resultSummary: _resultSummary,
            timestamp: block.timestamp,
            validations: 0,
            challenges: 0,
            bondAmount: msg.value,
            challengeDeadline: block.timestamp + CHALLENGE_PERIOD,
            bondClaimed: false,
            exists: true
        }));

        agents[msg.sender].tracesSubmitted++;
        agents[msg.sender].totalBonded += msg.value;
        totalBondsLocked += msg.value;
        traceCount++;

        emit TraceSubmitted(traceId, msg.sender, msg.value, _taskDescription, block.timestamp);
    }

    // ─── Peer Reviews ──────────────────────────────────────────────

    function peerReview(
        uint256 _traceId,
        bool _valid,
        bytes32 _reviewHash,
        string calldata _reviewURI,
        string calldata _critique
    ) external onlyAgent traceExists(_traceId) returns (uint256 reviewId) {
        DecisionTrace storage trace = traces[_traceId];
        require(trace.agent != msg.sender, "Cannot review own trace");
        require(!hasReviewed[_traceId][msg.sender], "Already reviewed");

        reviewId = reviewCount;

        traceReviews[_traceId].push(PeerReview({
            id: reviewId,
            traceId: _traceId,
            reviewer: msg.sender,
            valid: _valid,
            reviewHash: _reviewHash,
            reviewURI: _reviewURI,
            critique: _critique,
            timestamp: block.timestamp
        }));

        hasReviewed[_traceId][msg.sender] = true;
        agents[msg.sender].reviewsPerformed++;
        reviewCount++;

        if (_valid) {
            trace.validations++;
            _updateTrust(msg.sender, trace.agent, true);
        } else {
            trace.challenges++;
        }

        emit PeerReviewSubmitted(reviewId, _traceId, msg.sender, _valid, block.timestamp);
    }

    // ─── Reasoning Duels ───────────────────────────────────────────

    /// @notice Challenge with re-execution. If you win, you seize the bond.
    function challengeWithTrace(
        uint256 _originalTraceId,
        bytes32 _challengerReasoningHash,
        string calldata _challengerTraceURI,
        string calldata _challengerResultSummary,
        string calldata _critique
    ) external onlyAgent traceExists(_originalTraceId) returns (uint256 duelId) {
        DecisionTrace storage original = traces[_originalTraceId];
        require(original.agent != msg.sender, "Cannot challenge own trace");
        require(!original.bondClaimed, "Bond already claimed");

        duelId = duelCount;

        duels.push(ReasoningDuel({
            id: duelId,
            originalTraceId: _originalTraceId,
            challenger: msg.sender,
            challengerReasoningHash: _challengerReasoningHash,
            challengerTraceURI: _challengerTraceURI,
            challengerResultSummary: _challengerResultSummary,
            critique: _critique,
            timestamp: block.timestamp,
            votesForOriginal: 0,
            votesForChallenger: 0,
            resolved: false,
            winner: address(0)
        }));

        original.challenges++;
        duelCount++;

        emit ReasoningDuelCreated(duelId, _originalTraceId, msg.sender, block.timestamp);
    }

    /// @notice Vote on a duel
    function voteOnDuel(
        uint256 _duelId,
        bool _voteForChallenger,
        string calldata _justification
    ) external onlyAgent duelExists(_duelId) {
        ReasoningDuel storage duel = duels[_duelId];
        require(!duel.resolved, "Duel already resolved");
        require(msg.sender != traces[duel.originalTraceId].agent, "Original author cannot vote");
        require(msg.sender != duel.challenger, "Challenger cannot vote");
        require(!hasVotedOnDuel[_duelId][msg.sender], "Already voted");

        duelVotes[_duelId].push(DuelVote({
            voter: msg.sender,
            votedForChallenger: _voteForChallenger,
            justification: _justification,
            timestamp: block.timestamp
        }));

        hasVotedOnDuel[_duelId][msg.sender] = true;

        if (_voteForChallenger) {
            duel.votesForChallenger++;
        } else {
            duel.votesForOriginal++;
        }

        emit DuelVoteCast(_duelId, msg.sender, _voteForChallenger, block.timestamp);
    }

    /// @notice Resolve duel. If challenger wins, they seize the reasoning bond.
    function resolveDuel(uint256 _duelId) external duelExists(_duelId) {
        ReasoningDuel storage duel = duels[_duelId];
        require(!duel.resolved, "Already resolved");
        uint256 totalVotes = duel.votesForOriginal + duel.votesForChallenger;
        require(totalVotes >= 1, "Need at least 1 vote");

        duel.resolved = true;

        address originalAgent = traces[duel.originalTraceId].agent;
        address challengerAgent = duel.challenger;
        DecisionTrace storage originalTrace = traces[duel.originalTraceId];

        if (duel.votesForChallenger > duel.votesForOriginal) {
            // Challenger wins — SEIZE THE BOND
            duel.winner = challengerAgent;
            agents[challengerAgent].duelsWon++;
            agents[originalAgent].duelsLost++;

            // Transfer bond to challenger
            if (!originalTrace.bondClaimed && originalTrace.bondAmount > 0) {
                originalTrace.bondClaimed = true;
                uint256 bondAmount = originalTrace.bondAmount;
                totalBondsLocked -= bondAmount;
                totalSlashed += bondAmount;
                agents[originalAgent].totalSlashed += bondAmount;

                (bool success, ) = payable(challengerAgent).call{value: bondAmount}("");
                require(success, "Bond transfer failed");

                emit BondSeized(duel.originalTraceId, challengerAgent, bondAmount, block.timestamp);
            }
        } else if (duel.votesForOriginal > duel.votesForChallenger) {
            // Original wins — reasoning survived adversarial challenge
            duel.winner = originalAgent;
            agents[originalAgent].duelsWon++;
            agents[challengerAgent].duelsLost++;
            originalTrace.validations++;
            _updateTrust(challengerAgent, originalAgent, true);
        } else {
            duel.winner = address(0); // Tie
        }

        emit DuelResolved(_duelId, duel.winner, duel.votesForOriginal, duel.votesForChallenger, block.timestamp);
    }

    // ─── Bond Reclamation ──────────────────────────────────────────

    /// @notice Reclaim bond after challenge period if no successful challenge
    function reclaimBond(uint256 _traceId) external traceExists(_traceId) {
        DecisionTrace storage trace = traces[_traceId];
        require(msg.sender == trace.agent, "Not trace owner");
        require(!trace.bondClaimed, "Bond already claimed");
        require(block.timestamp > trace.challengeDeadline, "Challenge period active");

        // Check no unresolved duels against this trace
        bool hasUnresolvedDuel = false;
        for (uint256 i = 0; i < duelCount; i++) {
            if (duels[i].originalTraceId == _traceId && !duels[i].resolved) {
                hasUnresolvedDuel = true;
                break;
            }
        }
        require(!hasUnresolvedDuel, "Resolve duels first");

        trace.bondClaimed = true;
        uint256 bondAmount = trace.bondAmount;
        totalBondsLocked -= bondAmount;

        (bool success, ) = payable(msg.sender).call{value: bondAmount}("");
        require(success, "Reclaim failed");

        emit BondReclaimed(_traceId, msg.sender, bondAmount, block.timestamp);
    }

    // ─── Trust Graph ───────────────────────────────────────────────

    function _updateTrust(address _from, address _to, bool _positive) internal {
        if (_positive && _from != _to) {
            trustEdges[_from][_to]++;
            if (trustEdges[_from][_to] == 1) {
                trustedBy[_to].push(_from);
            }
            emit TrustEdgeUpdated(_from, _to, trustEdges[_from][_to]);
        }
    }

    // ─── Living Reputation ─────────────────────────────────────────

    function getReputation(address _agent) 
        external view returns (
            uint256 cognitiveScore,
            uint256 totalTraces,
            uint256 totalValidations,
            uint256 totalChallenges,
            uint256 trustDepth,
            uint256 reviewContributions,
            uint256 duelsWon,
            uint256 duelsLost,
            uint256 totalBonded,
            uint256 totalSlashedAmt
        ) 
    {
        require(agents[_agent].exists, "Agent not found");

        totalTraces = agents[_agent].tracesSubmitted;
        reviewContributions = agents[_agent].reviewsPerformed;
        trustDepth = trustedBy[_agent].length;
        duelsWon = agents[_agent].duelsWon;
        duelsLost = agents[_agent].duelsLost;
        totalBonded = agents[_agent].totalBonded;
        totalSlashedAmt = agents[_agent].totalSlashed;

        for (uint256 i = 0; i < traceCount; i++) {
            if (traces[i].agent == _agent) {
                totalValidations += traces[i].validations;
                totalChallenges += traces[i].challenges;
            }
        }

        // Score factors: validations, duel wins (3x), bonds NOT slashed
        uint256 positiveSignals = totalValidations + (duelsWon * 3);
        uint256 negativeSignals = totalChallenges + (duelsLost * 2);
        
        // Bonus for having skin in the game without getting slashed
        if (totalBonded > 0 && totalSlashedAmt == 0) {
            positiveSignals += 2; // Unslashed bond bonus
        }

        uint256 total = positiveSignals + negativeSignals;
        cognitiveScore = total == 0 ? 0 : (positiveSignals * 10000) / total;
    }

    // ─── View Functions ────────────────────────────────────────────

    function getTrace(uint256 _traceId) external view traceExists(_traceId) returns (DecisionTrace memory) { return traces[_traceId]; }
    function getTraceReviews(uint256 _traceId) external view returns (PeerReview[] memory) { return traceReviews[_traceId]; }
    function getDuel(uint256 _duelId) external view duelExists(_duelId) returns (ReasoningDuel memory) { return duels[_duelId]; }
    function getDuelVotes(uint256 _duelId) external view returns (DuelVote[] memory) { return duelVotes[_duelId]; }
    function getTrustEdge(address _from, address _to) external view returns (uint256) { return trustEdges[_from][_to]; }
    function getTrustNetwork(address _agent) external view returns (address[] memory) { return trustedBy[_agent]; }
    function getAgentCount() external view returns (uint256) { return agentList.length; }
    function getAgent(address _agent) external view returns (Agent memory) { require(agents[_agent].exists, "Agent not found"); return agents[_agent]; }

    function getAgentTraces(address _agent) external view returns (DecisionTrace[] memory) {
        uint256 count = agents[_agent].tracesSubmitted;
        DecisionTrace[] memory result = new DecisionTrace[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < traceCount && idx < count; i++) {
            if (traces[i].agent == _agent) { result[idx] = traces[i]; idx++; }
        }
        return result;
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
