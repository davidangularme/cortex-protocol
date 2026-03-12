// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CortexProtocol - Collective Intelligence for AI Agents
/// @author Fred & Claude (The Synthesis Hackathon 2026)
/// @notice Agents don't prove they succeeded — they prove HOW they think.
///         Peers validate reasoning, not results. Reputation is alive.

contract CortexProtocol {

    // ─── Data Structures ───────────────────────────────────────────

    struct Agent {
        address addr;
        string name;
        string metadata;            // JSON: model, harness, capabilities
        uint256 registeredAt;
        uint256 tracesSubmitted;     // How many decision traces published
        uint256 reviewsPerformed;    // How many peer reviews done
        bool exists;
    }

    /// @notice A decision trace captures HOW an agent reasoned, not just WHAT it produced
    struct DecisionTrace {
        uint256 id;
        address agent;              // Who generated this trace
        bytes32 reasoningHash;      // Hash of the full reasoning chain (stored off-chain)
        string taskContext;          // What the task was about
        string traceURI;            // IPFS/Arweave URI to the full trace
        string resultSummary;       // Brief description of outcome
        uint256 timestamp;
        uint256 validations;        // Number of positive peer reviews
        uint256 challenges;         // Number of negative peer reviews
        bool exists;
    }

    /// @notice A peer review where one agent validates another's reasoning
    struct PeerReview {
        uint256 id;
        uint256 traceId;            // Which trace is being reviewed
        address reviewer;           // The reviewing agent
        bool valid;                 // Does the reasoning hold?
        bytes32 reviewHash;         // Hash of the reviewer's own reasoning about the trace
        string reviewURI;           // URI to the full review reasoning
        string critique;            // Brief on-chain summary
        uint256 timestamp;
    }

    // ─── State ─────────────────────────────────────────────────────

    mapping(address => Agent) public agents;
    address[] public agentList;

    DecisionTrace[] public traces;
    mapping(uint256 => PeerReview[]) public traceReviews;  // traceId => reviews
    mapping(uint256 => mapping(address => bool)) public hasReviewed; // traceId => reviewer => bool

    // Reputation graph: who validated whom (directional trust edges)
    mapping(address => mapping(address => uint256)) public trustEdges; // from => to => weight
    mapping(address => address[]) public trustedBy;  // agent => list of agents who validated them

    uint256 public traceCount;
    uint256 public reviewCount;

    // ─── Events ────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent, string name, uint256 timestamp);

    event TraceSubmitted(
        uint256 indexed traceId,
        address indexed agent,
        bytes32 reasoningHash,
        string taskContext,
        uint256 timestamp
    );

    event PeerReviewSubmitted(
        uint256 indexed reviewId,
        uint256 indexed traceId,
        address indexed reviewer,
        bool valid,
        uint256 timestamp
    );

    event TrustEdgeUpdated(
        address indexed from,
        address indexed to,
        uint256 newWeight
    );

    // ─── Modifiers ─────────────────────────────────────────────────

    modifier onlyAgent() {
        require(agents[msg.sender].exists, "Not a registered agent");
        _;
    }

    modifier traceExists(uint256 _traceId) {
        require(_traceId < traceCount && traces[_traceId].exists, "Trace not found");
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
            exists: true
        });

        agentList.push(msg.sender);
        emit AgentRegistered(msg.sender, _name, block.timestamp);
    }

    // ─── Decision Traces ───────────────────────────────────────────

    /// @notice Submit a decision trace — your reasoning chain for a task
    /// @param _reasoningHash Keccak256 hash of your full reasoning (for verification)
    /// @param _taskContext What was the task about
    /// @param _traceURI Where the full trace lives (IPFS/Arweave)
    /// @param _resultSummary Brief description of what you produced
    function submitTrace(
        bytes32 _reasoningHash,
        string calldata _taskContext,
        string calldata _traceURI,
        string calldata _resultSummary
    ) external onlyAgent returns (uint256 traceId) {
        traceId = traceCount;

        traces.push(DecisionTrace({
            id: traceId,
            agent: msg.sender,
            reasoningHash: _reasoningHash,
            taskContext: _taskContext,
            traceURI: _traceURI,
            resultSummary: _resultSummary,
            timestamp: block.timestamp,
            validations: 0,
            challenges: 0,
            exists: true
        }));

        agents[msg.sender].tracesSubmitted++;
        traceCount++;

        emit TraceSubmitted(traceId, msg.sender, _reasoningHash, _taskContext, block.timestamp);
    }

    // ─── Peer Reviews ──────────────────────────────────────────────

    /// @notice Review another agent's decision trace
    /// @param _traceId Which trace to review
    /// @param _valid Does the reasoning hold up?
    /// @param _reviewHash Hash of YOUR reasoning about the trace
    /// @param _reviewURI URI to your full review
    /// @param _critique Brief on-chain summary
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

        // Update trace validation/challenge count
        if (_valid) {
            trace.validations++;
        } else {
            trace.challenges++;
        }

        // Update trust graph
        address traceAgent = trace.agent;
        if (_valid) {
            trustEdges[msg.sender][traceAgent]++;
            // Track the trust relationship
            if (trustEdges[msg.sender][traceAgent] == 1) {
                trustedBy[traceAgent].push(msg.sender);
            }
        }

        emit PeerReviewSubmitted(reviewId, _traceId, msg.sender, _valid, block.timestamp);
        emit TrustEdgeUpdated(msg.sender, traceAgent, trustEdges[msg.sender][traceAgent]);
    }

    // ─── Living Reputation ─────────────────────────────────────────

    /// @notice Get an agent's living reputation — emergent from the trust graph
    /// @return cognitiveScore Ratio of validations vs challenges (basis points, 0-10000)
    /// @return totalTraces How many reasoning traces published
    /// @return totalValidations Total positive peer reviews received
    /// @return totalChallenges Total negative peer reviews received
    /// @return trustDepth How many unique agents trust this agent
    /// @return reviewContributions How many reviews this agent has given others
    function getReputation(address _agent) 
        external 
        view 
        returns (
            uint256 cognitiveScore,
            uint256 totalTraces,
            uint256 totalValidations,
            uint256 totalChallenges,
            uint256 trustDepth,
            uint256 reviewContributions
        ) 
    {
        require(agents[_agent].exists, "Agent not found");

        totalTraces = agents[_agent].tracesSubmitted;
        reviewContributions = agents[_agent].reviewsPerformed;
        trustDepth = trustedBy[_agent].length;

        // Aggregate validations and challenges across all traces
        for (uint256 i = 0; i < traceCount; i++) {
            if (traces[i].agent == _agent) {
                totalValidations += traces[i].validations;
                totalChallenges += traces[i].challenges;
            }
        }

        // Cognitive score: validations / (validations + challenges) * 10000
        uint256 total = totalValidations + totalChallenges;
        if (total == 0) {
            cognitiveScore = 0;
        } else {
            cognitiveScore = (totalValidations * 10000) / total;
        }
    }

    /// @notice Get the trust weight between two agents
    function getTrustEdge(address _from, address _to) external view returns (uint256) {
        return trustEdges[_from][_to];
    }

    /// @notice Get all reviews for a specific trace
    function getTraceReviews(uint256 _traceId) external view returns (PeerReview[] memory) {
        return traceReviews[_traceId];
    }

    /// @notice Get a specific trace
    function getTrace(uint256 _traceId) external view traceExists(_traceId) returns (DecisionTrace memory) {
        return traces[_traceId];
    }

    /// @notice Get all traces by an agent
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

    /// @notice Get all agents who trust a given agent
    function getTrustNetwork(address _agent) external view returns (address[] memory) {
        return trustedBy[_agent];
    }

    /// @notice Total registered agents
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    /// @notice Get agent info
    function getAgent(address _agent) external view returns (Agent memory) {
        require(agents[_agent].exists, "Agent not found");
        return agents[_agent];
    }
}
