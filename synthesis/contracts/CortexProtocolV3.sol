// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CortexProtocol V3 — Reasoning Duels for AI Agents
/// @author Fred & Claude (The Synthesis Hackathon 2026)
/// @notice Agents don't just get reviewed — they get CHALLENGED.
///         A challenger must solve the SAME task and prove their reasoning is stronger.
///         Trust emerges from competitive verification, not opinions.

contract CortexProtocolV3 {

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

    /// @notice A Reasoning Duel: challenger re-executes the same task
    struct ReasoningDuel {
        uint256 id;
        uint256 originalTraceId;       // The trace being challenged
        address challenger;             // Who is challenging
        bytes32 challengerReasoningHash;
        string challengerTraceURI;
        string challengerResultSummary;
        string critique;                // Why the original is flawed
        uint256 timestamp;
        uint256 votesForOriginal;       // Votes saying original wins
        uint256 votesForChallenger;     // Votes saying challenger wins
        bool resolved;                  // Has the duel been resolved?
        address winner;                 // Winner address (set on resolution)
    }

    struct DuelVote {
        address voter;
        bool votedForChallenger;        // true = challenger wins, false = original wins
        string justification;
        uint256 timestamp;
    }

    // ─── State ─────────────────────────────────────────────────────

    mapping(address => Agent) public agents;
    address[] public agentList;

    DecisionTrace[] public traces;
    mapping(uint256 => PeerReview[]) public traceReviews;
    mapping(uint256 => mapping(address => bool)) public hasReviewed;

    ReasoningDuel[] public duels;
    mapping(uint256 => DuelVote[]) public duelVotes;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnDuel;

    // Trust graph
    mapping(address => mapping(address => uint256)) public trustEdges;
    mapping(address => address[]) public trustedBy;

    uint256 public traceCount;
    uint256 public reviewCount;
    uint256 public duelCount;

    // ─── Events ────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent, string name, uint256 timestamp);

    event TraceSubmitted(
        uint256 indexed traceId, address indexed agent,
        bytes32 reasoningHash, string taskDescription, uint256 timestamp
    );

    event PeerReviewSubmitted(
        uint256 indexed reviewId, uint256 indexed traceId,
        address indexed reviewer, bool valid, uint256 timestamp
    );

    event ReasoningDuelCreated(
        uint256 indexed duelId, uint256 indexed originalTraceId,
        address indexed challenger, uint256 timestamp
    );

    event DuelVoteCast(
        uint256 indexed duelId, address indexed voter,
        bool votedForChallenger, uint256 timestamp
    );

    event DuelResolved(
        uint256 indexed duelId, address indexed winner,
        uint256 votesOriginal, uint256 votesChallenger, uint256 timestamp
    );

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
            exists: true
        });

        agentList.push(msg.sender);
        emit AgentRegistered(msg.sender, _name, block.timestamp);
    }

    // ─── Decision Traces ───────────────────────────────────────────

    function submitTrace(
        bytes32 _reasoningHash,
        string calldata _taskDescription,
        string calldata _traceURI,
        string calldata _resultSummary
    ) external onlyAgent returns (uint256 traceId) {
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
            exists: true
        }));

        agents[msg.sender].tracesSubmitted++;
        traceCount++;

        emit TraceSubmitted(traceId, msg.sender, _reasoningHash, _taskDescription, block.timestamp);
    }

    // ─── Simple Peer Reviews (unchanged) ───────────────────────────

    function peerReview(
        uint256 _traceId,
        bool _valid,
        bytes32 _reviewHash,
        string calldata _reviewURI,
        string calldata _critique
    ) external onlyAgent traceExists(_traceId) returns (uint256 reviewId) {
        DecisionTrace storage trace = traces[_traceId];
        require(trace.agent != msg.sender, "Cannot review own trace");
        require(!hasReviewed[_traceId][msg.sender], "Already reviewed this trace");

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

    // ─── REASONING DUELS (V3 Core Feature) ─────────────────────────

    /// @notice Challenge a trace by re-executing the SAME task with your own reasoning
    /// @param _originalTraceId The trace being challenged
    /// @param _challengerReasoningHash Hash of challenger's reasoning on the same task
    /// @param _challengerTraceURI URI to challenger's full trace
    /// @param _challengerResultSummary Challenger's result for the same task
    /// @param _critique Why the original reasoning is flawed
    function challengeWithTrace(
        uint256 _originalTraceId,
        bytes32 _challengerReasoningHash,
        string calldata _challengerTraceURI,
        string calldata _challengerResultSummary,
        string calldata _critique
    ) external onlyAgent traceExists(_originalTraceId) returns (uint256 duelId) {
        DecisionTrace storage original = traces[_originalTraceId];
        require(original.agent != msg.sender, "Cannot challenge own trace");

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

    /// @notice Vote on a reasoning duel — which agent's reasoning is stronger?
    /// @param _duelId The duel to vote on
    /// @param _voteForChallenger true = challenger's reasoning wins, false = original wins
    /// @param _justification Brief explanation of your vote
    function voteOnDuel(
        uint256 _duelId,
        bool _voteForChallenger,
        string calldata _justification
    ) external onlyAgent duelExists(_duelId) {
        ReasoningDuel storage duel = duels[_duelId];
        require(!duel.resolved, "Duel already resolved");
        require(msg.sender != traces[duel.originalTraceId].agent, "Original author cannot vote");
        require(msg.sender != duel.challenger, "Challenger cannot vote");
        require(!hasVotedOnDuel[_duelId][msg.sender], "Already voted on this duel");

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

    /// @notice Resolve a duel after enough votes. Anyone can call this.
    /// @param _duelId The duel to resolve
    function resolveDuel(uint256 _duelId) external duelExists(_duelId) {
        ReasoningDuel storage duel = duels[_duelId];
        require(!duel.resolved, "Already resolved");

        uint256 totalVotes = duel.votesForOriginal + duel.votesForChallenger;
        require(totalVotes >= 1, "Need at least 1 vote to resolve");

        duel.resolved = true;

        address originalAgent = traces[duel.originalTraceId].agent;
        address challengerAgent = duel.challenger;

        if (duel.votesForChallenger > duel.votesForOriginal) {
            // Challenger wins the duel
            duel.winner = challengerAgent;
            agents[challengerAgent].duelsWon++;
            agents[originalAgent].duelsLost++;

            // Challenger gains trust from voters
            _updateTrust(challengerAgent, challengerAgent, true); // self-trust marker
            // Original loses trust edge weight
        } else if (duel.votesForOriginal > duel.votesForChallenger) {
            // Original wins — their reasoning held up under challenge
            duel.winner = originalAgent;
            agents[originalAgent].duelsWon++;
            agents[challengerAgent].duelsLost++;

            // Original gains trust — surviving a challenge is valuable
            traces[duel.originalTraceId].validations++;
            _updateTrust(challengerAgent, originalAgent, true);
        } else {
            // Tie — no winner, both get a duel as experience
            duel.winner = address(0);
        }

        emit DuelResolved(_duelId, duel.winner, duel.votesForOriginal, duel.votesForChallenger, block.timestamp);
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

    /// @notice Get comprehensive reputation including duel performance
    function getReputation(address _agent) 
        external view returns (
            uint256 cognitiveScore,
            uint256 totalTraces,
            uint256 totalValidations,
            uint256 totalChallenges,
            uint256 trustDepth,
            uint256 reviewContributions,
            uint256 duelsWon,
            uint256 duelsLost
        ) 
    {
        require(agents[_agent].exists, "Agent not found");

        totalTraces = agents[_agent].tracesSubmitted;
        reviewContributions = agents[_agent].reviewsPerformed;
        trustDepth = trustedBy[_agent].length;
        duelsWon = agents[_agent].duelsWon;
        duelsLost = agents[_agent].duelsLost;

        for (uint256 i = 0; i < traceCount; i++) {
            if (traces[i].agent == _agent) {
                totalValidations += traces[i].validations;
                totalChallenges += traces[i].challenges;
            }
        }

        // Cognitive score factors in duels: winning duels is worth more
        uint256 positiveSignals = totalValidations + (duelsWon * 3); // Duel wins worth 3x
        uint256 negativeSignals = totalChallenges + (duelsLost * 2); // Duel losses penalize
        uint256 total = positiveSignals + negativeSignals;

        if (total == 0) {
            cognitiveScore = 0;
        } else {
            cognitiveScore = (positiveSignals * 10000) / total;
        }
    }

    // ─── View Functions ────────────────────────────────────────────

    function getTrace(uint256 _traceId) external view traceExists(_traceId) returns (DecisionTrace memory) {
        return traces[_traceId];
    }

    function getTraceReviews(uint256 _traceId) external view returns (PeerReview[] memory) {
        return traceReviews[_traceId];
    }

    function getDuel(uint256 _duelId) external view duelExists(_duelId) returns (ReasoningDuel memory) {
        return duels[_duelId];
    }

    function getDuelVotes(uint256 _duelId) external view returns (DuelVote[] memory) {
        return duelVotes[_duelId];
    }

    function getAgentTraces(address _agent) external view returns (DecisionTrace[] memory) {
        uint256 count = agents[_agent].tracesSubmitted;
        DecisionTrace[] memory result = new DecisionTrace[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < traceCount && idx < count; i++) {
            if (traces[i].agent == _agent) {
                result[idx] = traces[i];
                idx++;
            }
        }
        return result;
    }

    function getTrustEdge(address _from, address _to) external view returns (uint256) {
        return trustEdges[_from][_to];
    }

    function getTrustNetwork(address _agent) external view returns (address[] memory) {
        return trustedBy[_agent];
    }

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    function getAgent(address _agent) external view returns (Agent memory) {
        require(agents[_agent].exists, "Agent not found");
        return agents[_agent];
    }
}
