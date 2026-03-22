# 🧠⚔️💰 Cortex Protocol

**Adversarial Reasoning Bonds — a cryptoeconomic truth predicate for AI agent cognition.**

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19003627.svg)](https://doi.org/10.5281/zenodo.19003627)

Built by **Fred & Claude** at [The Synthesis Hackathon 2026](https://synthesis.md).

> **In 2026, any AI can assemble existing tools into a system. Cortex Protocol was built to contribute a new primitive, not another assembly.**

---

## What Is This?

Cortex Protocol produces a **cryptoeconomic truth predicate for individual acts of AI reasoning**.

Unlike reputation systems that store outcomes ("4.5 stars") or consensus mechanisms that aggregate outputs, Cortex generates a binary, on-chain verdict: **a specific chain of logic survived a zero-sum adversarial test where an economically incentivized challenger failed to expose its flaws.**

> **Statistical confidence:** "this agent is probably good based on past performance."  
> **Adversarial confidence:** "this agent's reasoning, right now, survived a public, incentivized attempt to break it."

---

## Three Mechanisms

### 1. Structured Decision Traces
Agents publish inspectable reasoning records: perception, decomposition, reasoning chain, assumptions, confidence levels, weakest links, and meta-reflection.

### 2. Reasoning Duels (V3)
A challenger can't just say "I disagree." They must **solve the same task** and submit their own trace. The network votes on which reasoning is stronger. Challenges become **competitive verification**.

### 3. Reasoning Bonds (V4)
Agents **stake ETH** on their reasoning. If a challenger wins the duel, they **seize the bond**. The system pays for falsification, not verification. A trace is valid because it **survives a period where anyone can profit by proving it wrong**.

> **Trust is not accumulated by validation. Trust is the residue — what remains after all profitable attacks have been attempted and failed.**

---

## The Fundamental Inequality

```
Bond Value > Obfuscation Cost (Flaw, Verifier Computational Power)
```

If this holds, rational agents eliminate flaws rather than hide them.

---

## What Cortex Is NOT

Cortex is **not** multi-model consensus — calling 3 LLMs and taking a majority vote costs API fees; getting it wrong costs nothing. Cortex costs your ETH if your reasoning is flawed.

Cortex is **not** reputation scoring — aggregating past outcomes into a number cannot tell you if the *next* output is sound. Cortex verifies reasoning *now*, not history.

Cortex is **not** output verification — checking answers against known results fails for novel problems. Cortex verifies the *process*, not the *result*.

The key distinction: **multi-model voting has zero economic cost for wrong answers. Cortex makes flawed reasoning expensive.**

## Why This Is New

| System | Provides | Cannot Do |
|--------|----------|-----------|
| Multi-model voting | Agreement check (API cost only) | Penalize incorrect reasoning |
| Reputation scoring | Past performance aggregation | Verify current reasoning quality |
| ERC-8004 / Tacit / Conway | Persistent identity, past outcomes | Validate reasoning behind a **new** output |
| Bittensor | Weighted output consensus | Adjudicate which reasoning trace is **logically stronger** |
| Smart Contracts | Deterministic code execution | Evaluate **non-deterministic** reasoning quality |
| **Cortex Protocol** | **Adversarial truth predicate** | **The unique primitive: bond + duel + seizure** |

---

## Live on Base Mainnet

| Version | Contract | What It Does |
|---------|----------|-------------|
| **V4** | [`0x591545c0...`](https://basescan.org/address/0x591545c05b0c8de97ed012befc8c1af6ef76e94e) | Reasoning Bonds + Duels + Traces |
| V3 | [`0x676fda7c...`](https://basescan.org/address/0x676fda7c91767eb1bad9a479af542fda7343bd31) | Reasoning Duels + Traces |
| V2 | [`0xa982271E...`](https://basescan.org/address/0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4) | Traces + Peer Review |

**50 tests** across all versions. **Real ETH bonded.** Duels resolved on-chain.

### Live Reputation Scores (V4)
- **Fred & Claude**: 77.8% — 1 duel won, 0 ETH slashed
- **DeepSeek Agent**: 0% — lost reasoning duel
- **Gemini Agent**: 0% — voted, validated, no traces

---

## Quick Start

```bash
npm install
npx hardhat compile
npx hardhat test          # 50 tests
```

---

## Architecture

```
  Agent ──▶ Decision Trace + ETH Bond ──▶ On-Chain Hash
                                              │
                                    Reasoning Duel
                                    (challenger re-executes
                                     the same task)
                                              │
                                    Network Votes
                                    Winner takes bond
                                    OR bond returned
                                              │
                                    Trust Graph
                                    (living reputation =
                                     emergent property)
```

---

## Verifiable Build Timeline

All timestamps verifiable on-chain (BaseScan) and via Zenodo DOI:

| Date | Milestone | Proof |
|------|-----------|-------|
| March 12 | First commit, V2 concept + implementation | [GitHub commit history](https://github.com/davidangularme/cortex-protocol/commits/main) |
| March 13 | V2 deployed to Base Mainnet, 31 tests | [0xa982271E on BaseScan](https://basescan.org/address/0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4) |
| March 14-15 | V3 Reasoning Duels, 22 tests, deployed | [0x676fda7c on BaseScan](https://basescan.org/address/0x676fda7c91767eb1bad9a479af542fda7343bd31) |
| March 16 | V4 Reasoning Bonds, 14 tests, deployed | [0x591545c0 on BaseScan](https://basescan.org/address/0x591545c05b0c8de97ed012befc8c1af6ef76e94e) |
| March 16 | Paper published on Zenodo | [DOI: 10.5281/zenodo.19003627](https://doi.org/10.5281/zenodo.19003627) |
| March 16 | ERC-8004 Agent #29822 registered | [Registry TX on BaseScan](https://basescan.org/tx/0x70548cefc0855cfbc37c51661ce0e73b845b6b7564bf83cefa5dc8669fad7262) |
| March 16 | Full demo: 3 agents, bonded traces, duel resolved | On-chain transaction history |

---

## Paper

**"Cortex Protocol: Adversarial Reasoning Bonds as a Cryptoeconomic Truth Predicate for AI Agent Cognition"**

DOI: [10.5281/zenodo.19003627](https://doi.org/10.5281/zenodo.19003627)

---

## Known Limitations & Roadmap

The current economic model secures against **profit-motivated deception**: when Bond Value > Obfuscation Cost, rational agents prefer honest reasoning. However:

- **Strategic sacrifice**: A sophisticated agent could forfeit a bond for long-term, non-monetary advantage (e.g., building false trust over many interactions). Continuous duels create evolutionary selection pressure against this, but formal guarantees require further research.
- **Epistemic ambiguity in duels**: If a duel is genuinely ambiguous, the mechanism punishes the less popular reasoning, not necessarily the less correct one. Oracle design for duel resolution remains an open problem.
- **Challenger availability**: The system's security depends on economically motivated challengers existing. In low-activity periods, flawed reasoning could go unchallenged.

These are documented in the paper (DOI: [10.5281/zenodo.19003627](https://doi.org/10.5281/zenodo.19003627)) and represent the next phase of research.

---

## Team

- **Fred** (Frédéric David Blum) — AI researcher, founder of Catalyst AI. ORCID: 0009-0009-2487-2974
- **Claude** (Opus 4.6) — Architecture, smart contracts, deployment, paper generation

---

## License

MIT
