// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentReputation - Verifiable On-Chain Reputation for AI Agents
/// @author Fred & Claude (The Synthesis Hackathon 2026)
/// @notice A decentralized reputation system where AI agents build trust
///         through verifiable attestations — no central authority needed.

contract AgentReputation {

    // ─── Data Structures ───────────────────────────────────────────

    struct Agent {
        address agentAddress;       // On-chain identity (ERC-8004)
        string name;                // Human-readable name
        string metadata;            // JSON: model, harness, capabilities
        uint256 registeredAt;       // Block timestamp of registration
        bool exists;                // Quick existence check
    }

    struct Attestation {
        address attestor;           // Who left this attestation
        address agent;              // Which agent it's about
        uint8 rating;               // 1-5 stars
        string taskType;            // Category: "code", "research", "payment", etc.
        string evidence;            // IPFS hash or URL proving the work
        string comment;             // Free-text review
        uint256 timestamp;          // When the attestation was made
    }

    // ─── State ─────────────────────────────────────────────────────

    mapping(address => Agent) public agents;
    mapping(address => Attestation[]) public attestations;
    mapping(address => mapping(address => bool)) public hasAttested;
    
    address[] public agentList;     // For enumeration
    uint256 public totalAttestations;

    // ─── Events ────────────────────────────────────────────────────

    event AgentRegistered(
        address indexed agentAddress,
        string name,
        uint256 timestamp
    );

    event AttestationCreated(
        address indexed attestor,
        address indexed agent,
        uint8 rating,
        string taskType,
        uint256 timestamp
    );

    // ─── Modifiers ─────────────────────────────────────────────────

    modifier agentExists(address _agent) {
        require(agents[_agent].exists, "Agent not registered");
        _;
    }

    modifier validRating(uint8 _rating) {
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        _;
    }

    // ─── Agent Registration ────────────────────────────────────────

    /// @notice Register a new AI agent on-chain
    /// @param _name Human-readable name of the agent
    /// @param _metadata JSON string with agent details (model, capabilities, etc.)
    function registerAgent(
        string calldata _name,
        string calldata _metadata
    ) external {
        require(!agents[msg.sender].exists, "Agent already registered");
        require(bytes(_name).length > 0, "Name required");

        agents[msg.sender] = Agent({
            agentAddress: msg.sender,
            name: _name,
            metadata: _metadata,
            registeredAt: block.timestamp,
            exists: true
        });

        agentList.push(msg.sender);

        emit AgentRegistered(msg.sender, _name, block.timestamp);
    }

    // ─── Attestations ──────────────────────────────────────────────

    /// @notice Leave an attestation for an agent after a completed task
    /// @param _agent Address of the agent being reviewed
    /// @param _rating Score from 1 (poor) to 5 (excellent)
    /// @param _taskType Category of work performed
    /// @param _evidence Link to proof (IPFS hash, tx hash, URL)
    /// @param _comment Free-text review
    function attest(
        address _agent,
        uint8 _rating,
        string calldata _taskType,
        string calldata _evidence,
        string calldata _comment
    ) external agentExists(_agent) validRating(_rating) {
        require(_agent != msg.sender, "Cannot attest yourself");

        attestations[_agent].push(Attestation({
            attestor: msg.sender,
            agent: _agent,
            rating: _rating,
            taskType: _taskType,
            evidence: _evidence,
            comment: _comment,
            timestamp: block.timestamp
        }));

        hasAttested[msg.sender][_agent] = true;
        totalAttestations++;

        emit AttestationCreated(
            msg.sender,
            _agent,
            _rating,
            _taskType,
            block.timestamp
        );
    }

    // ─── Reputation Queries ────────────────────────────────────────

    /// @notice Get the overall reputation score of an agent (0-500 basis points)
    /// @param _agent Address of the agent
    /// @return score Average rating × 100 (e.g., 450 = 4.5 stars)
    /// @return count Number of attestations received
    function getReputation(address _agent) 
        external 
        view 
        agentExists(_agent) 
        returns (uint256 score, uint256 count) 
    {
        Attestation[] storage atts = attestations[_agent];
        count = atts.length;
        
        if (count == 0) return (0, 0);

        uint256 total = 0;
        for (uint256 i = 0; i < count; i++) {
            total += atts[i].rating;
        }

        score = (total * 100) / count;
    }

    /// @notice Get reputation filtered by task type
    /// @param _agent Address of the agent
    /// @param _taskType Category to filter by
    /// @return score Average rating × 100 for that category
    /// @return count Number of attestations in that category
    function getReputationByTask(address _agent, string calldata _taskType)
        external
        view
        agentExists(_agent)
        returns (uint256 score, uint256 count)
    {
        Attestation[] storage atts = attestations[_agent];
        uint256 total = 0;
        count = 0;

        bytes32 taskHash = keccak256(bytes(_taskType));

        for (uint256 i = 0; i < atts.length; i++) {
            if (keccak256(bytes(atts[i].taskType)) == taskHash) {
                total += atts[i].rating;
                count++;
            }
        }

        if (count == 0) return (0, 0);
        score = (total * 100) / count;
    }

    /// @notice Get all attestations for an agent
    /// @param _agent Address of the agent
    /// @return Array of all attestations
    function getAttestations(address _agent) 
        external 
        view 
        returns (Attestation[] memory) 
    {
        return attestations[_agent];
    }

    /// @notice Get the number of registered agents
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    /// @notice Get agent info by address
    function getAgent(address _agent) 
        external 
        view 
        returns (Agent memory) 
    {
        require(agents[_agent].exists, "Agent not registered");
        return agents[_agent];
    }
}
