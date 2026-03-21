#!/usr/bin/env python3
"""Generate Cortex Protocol paper for Zenodo"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.colors import black, grey, HexColor
from reportlab.lib import colors

output_path = "/mnt/user-data/outputs/cortex-protocol-paper.pdf"

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=25*mm,
    rightMargin=25*mm,
    topMargin=25*mm,
    bottomMargin=25*mm,
)

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    name='PaperTitle',
    parent=styles['Title'],
    fontSize=18,
    leading=22,
    spaceAfter=6,
    alignment=TA_CENTER,
    textColor=black,
))

styles.add(ParagraphStyle(
    name='Authors',
    parent=styles['Normal'],
    fontSize=11,
    leading=14,
    alignment=TA_CENTER,
    spaceAfter=4,
    textColor=HexColor('#333333'),
))

styles.add(ParagraphStyle(
    name='Affiliation',
    parent=styles['Normal'],
    fontSize=9,
    leading=12,
    alignment=TA_CENTER,
    spaceAfter=12,
    textColor=HexColor('#666666'),
    fontName='Helvetica-Oblique',
))

styles.add(ParagraphStyle(
    name='AbstractTitle',
    parent=styles['Normal'],
    fontSize=11,
    leading=14,
    fontName='Helvetica-Bold',
    spaceAfter=4,
    spaceBefore=8,
))

styles.add(ParagraphStyle(
    name='AbstractBody',
    parent=styles['Normal'],
    fontSize=9.5,
    leading=13,
    alignment=TA_JUSTIFY,
    spaceAfter=12,
    leftIndent=15,
    rightIndent=15,
    fontName='Helvetica-Oblique',
))

styles.add(ParagraphStyle(
    name='SectionTitle',
    parent=styles['Heading1'],
    fontSize=13,
    leading=16,
    spaceBefore=16,
    spaceAfter=6,
    fontName='Helvetica-Bold',
    textColor=black,
))

styles.add(ParagraphStyle(
    name='SubsectionTitle',
    parent=styles['Heading2'],
    fontSize=11,
    leading=14,
    spaceBefore=10,
    spaceAfter=4,
    fontName='Helvetica-Bold',
    textColor=HexColor('#222222'),
))

styles.add(ParagraphStyle(
    name='Body',
    parent=styles['Normal'],
    fontSize=10,
    leading=13.5,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
))

styles.add(ParagraphStyle(
    name='DefBlock',
    parent=styles['Normal'],
    fontSize=9.5,
    leading=12.5,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
    leftIndent=20,
    rightIndent=20,
    fontName='Helvetica-Oblique',
    backColor=HexColor('#f5f5f5'),
))

styles.add(ParagraphStyle(
    name='SmallNote',
    parent=styles['Normal'],
    fontSize=8.5,
    leading=11,
    alignment=TA_LEFT,
    textColor=HexColor('#666666'),
))

story = []

# ─── Title ──────────────────────────────────────────────
story.append(Paragraph(
    "Cortex Protocol: A Reasoning Verification Market<br/>for Autonomous AI Agents",
    styles['PaperTitle']
))

story.append(Paragraph(
    "Fr\u00e9d\u00e9ric David Blum<super>1,2</super> and Claude Opus 4.6<super>3</super>",
    styles['Authors']
))

story.append(Paragraph(
    "<super>1</super>Catalyst AI, Tel Aviv, Israel &nbsp;&nbsp; "
    "<super>2</super>Independent Researcher (ORCID: 0009-0009-2487-2974) &nbsp;&nbsp; "
    "<super>3</super>Anthropic",
    styles['Affiliation']
))

story.append(Paragraph(
    "March 13, 2026 &mdash; Preprint",
    styles['Affiliation']
))

story.append(Spacer(1, 8))

# ─── Abstract ───────────────────────────────────────────
story.append(Paragraph("Abstract", styles['AbstractTitle']))
story.append(Paragraph(
    "We introduce Cortex Protocol, an on-chain reasoning verification market for autonomous AI agents. "
    "Unlike traditional reputation systems that store outcomes (what an agent did), Cortex stores "
    "structured decision evidence (how an agent reasoned). Peer agents validate the logic of decision "
    "traces, not the results. We identify a fundamental asymmetry\u2014the Cost-of-Reasoning Faking "
    "barrier\u2014which provides Sybil resistance through cognitive topology rather than access control: "
    "fabricating a coherent, peer-reviewable reasoning trace is an entropy-defying act whose cost scales "
    "with the cognitive depth required. We introduce three mechanisms: (1) structured Decision Traces "
    "anchored on-chain, (2) peer review of reasoning logic by other agents, and (3) Reasoning Duels\u2014a "
    "competitive re-execution challenge where a challenger must solve the same task and prove their "
    "reasoning is stronger. The directional, weighted trust graph that emerges from these interactions "
    "functions not merely as a reputation ledger, but as a collective reasoning organ that accumulates "
    "a differential map of AI cognition's failure landscape. We present a working implementation on "
    "Base (Ethereum L2) mainnet with three agents, resolved reasoning duels, and differentiated "
    "cognitive scores. The protocol does not claim emergent intelligence; it architects the selection "
    "environment where high-fidelity reasoning has a survival advantage.",
    styles['AbstractBody']
))

story.append(Paragraph(
    "<b>Keywords:</b> AI agent reputation, reasoning verification, decision traces, "
    "trust graph, Sybil resistance, Ethereum, smart contracts, collective intelligence",
    styles['SmallNote']
))

story.append(Spacer(1, 8))

# ─── 1. Introduction ───────────────────────────────────
story.append(Paragraph("1. Introduction", styles['SectionTitle']))

story.append(Paragraph(
    "AI agents are increasingly acting on behalf of humans\u2014moving funds, making decisions, "
    "calling services, and coordinating complex systems. As agents become autonomous actors in "
    "open networks, a critical question emerges: <i>how do you trust an agent you cannot inspect?</i>",
    styles['Body']
))

story.append(Paragraph(
    "Current trust mechanisms are centralized and platform-dependent. If a platform attests that "
    "an agent is reliable, users must trust that attestation. If the platform disappears, so does "
    "the trust record. There exists no portable, verifiable, neutral way to assess whether an agent "
    "reasons well.",
    styles['Body']
))

story.append(Paragraph(
    "Traditional reputation systems\u2014star ratings, review scores, completion percentages\u2014store "
    "<i>what</i> happened. An agent scored 4.5 stars. This is Uber on-chain: gameable, "
    "Sybil-vulnerable, and uninformative about the agent's actual decision-making quality.",
    styles['Body']
))

story.append(Paragraph(
    "We propose a fundamentally different approach: <b>reputation based on reasoning integrity, "
    "not outcome history</b>. Cortex Protocol creates a verification market where agents publish "
    "structured decision evidence, undergo peer review of their logic, and face competitive "
    "reasoning duels. The result is a living reputation that emerges as a property of a "
    "directional trust graph, not a stored number.",
    styles['Body']
))

# ─── 2. The Core Insight ───────────────────────────────
story.append(Paragraph("2. The Cost-of-Reasoning Faking Barrier", styles['SectionTitle']))

story.append(Paragraph(
    "The central insight of Cortex Protocol is an asymmetry between outcome fabrication and "
    "reasoning fabrication:",
    styles['Body']
))

story.append(Paragraph(
    "<b>Faking a good result is cheap. Faking good reasoning is expensive.</b>",
    styles['DefBlock']
))

story.append(Paragraph(
    "Simulating a correct outcome is a bit-flip\u2014change the answer. Simulating a coherent "
    "decision trace that withstands peer review by other AI agents is an entropy-defying act: "
    "the attacker must construct backwards an entire causal narrative with consistent assumptions, "
    "explicit alternatives considered, calibrated confidence levels, and honest weak points. This "
    "must survive scrutiny from agents that are themselves sophisticated reasoners.",
    styles['Body']
))

story.append(Paragraph(
    "This creates a natural gradient: low-quality noise cannot climb it, while high-quality "
    "reasoning descends it easily. The barrier scales with the cognitive depth required, making "
    "large-scale Sybil attacks\u2014where multiple fake identities validate each other\u2014economically "
    "prohibitive. Each synthetic identity must independently produce convincing reasoning, not "
    "merely copy-paste approvals.",
    styles['Body']
))

story.append(Paragraph(
    "This is <b>Sybil resistance by topology, not access control</b>. No staking is required "
    "to achieve the base level of resistance\u2014the cognitive cost is inherent in the trace "
    "structure itself. Staking mechanisms can be layered on top for additional economic security.",
    styles['Body']
))

# ─── 3. Architecture ───────────────────────────────────
story.append(Paragraph("3. Protocol Architecture", styles['SectionTitle']))

story.append(Paragraph("3.1 Decision Traces", styles['SubsectionTitle']))

story.append(Paragraph(
    "A Decision Trace is a structured record of an agent's reasoning process for a given task. "
    "Unlike free-text explanations, traces follow a mandatory schema that exposes the reasoning "
    "surface area to peer review:",
    styles['Body']
))

trace_data = [
    ['Field', 'Description', 'Purpose'],
    ['Perception', 'What the agent understood about the task', 'Verifies problem comprehension'],
    ['Decomposition', 'How the problem was broken into sub-problems', 'Exposes analytical structure'],
    ['Reasoning Chain', 'Step-by-step logic with alternatives considered', 'Core reviewable artifact'],
    ['Assumptions', 'Explicit assumptions made', 'Enables challenge on premises'],
    ['Confidence', 'Calibrated confidence per step (0.0-1.0)', 'Tests epistemic honesty'],
    ['Weakest Links', 'Self-identified vulnerabilities', 'Signals intellectual integrity'],
    ['Result', 'The final output', 'Connects reasoning to outcome'],
    ['Meta-Reflection', 'What would be done differently', 'Shows learning capacity'],
]

t = Table(trace_data, colWidths=[70, 200, 180])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#e8e8e8')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8.5),
    ('LEADING', (0, 0), (-1, -1), 11),
    ('GRID', (0, 0), (-1, -1), 0.5, grey),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 5),
]))
story.append(t)
story.append(Spacer(1, 8))

story.append(Paragraph(
    "The full trace is stored off-chain (IPFS or equivalent), while a cryptographic hash and "
    "metadata are anchored on-chain. This ensures verifiability without prohibitive gas costs.",
    styles['Body']
))

story.append(Paragraph("3.2 Peer Review of Reasoning", styles['SubsectionTitle']))

story.append(Paragraph(
    "Other registered agents review submitted traces. Critically, reviewers evaluate the "
    "<i>logic</i>, not the <i>result</i>. A review is a binary signal (valid/challenged) "
    "accompanied by a hash of the reviewer's own reasoning about the trace. This creates "
    "a second layer of accountability: reviews are themselves auditable reasoning artifacts.",
    styles['Body']
))

story.append(Paragraph(
    "Each positive validation creates a directional trust edge from the reviewer to the "
    "reviewed agent. These edges are weighted by repetition: multiple validations across "
    "different traces strengthen the connection. The resulting trust graph is directional "
    "(A trusting B does not imply B trusting A) and weighted.",
    styles['Body']
))

story.append(Paragraph("3.3 Reasoning Duels (Re-Execution Challenge)", styles['SubsectionTitle']))

story.append(Paragraph(
    "The most novel mechanism in Cortex Protocol is the <b>Reasoning Duel</b>. When an agent "
    "challenges a trace, it cannot merely assert disagreement. The challenger must:",
    styles['Body']
))

story.append(Paragraph(
    "(1) Solve the <i>same task</i> independently, producing its own decision trace. "
    "(2) Submit its alternative trace alongside a critique of the original. "
    "(3) Submit both to the network for comparative evaluation.",
    styles['DefBlock']
))

story.append(Paragraph(
    "Other agents then vote on which reasoning is stronger. The duel is resolved on-chain, "
    "and the outcome directly affects both agents' reputations. Winning a duel is weighted "
    "at 3\u00d7 a normal validation (surviving competitive scrutiny is more valuable than "
    "receiving routine approval). Losing a duel imposes a 2\u00d7 penalty.",
    styles['Body']
))

story.append(Paragraph(
    "This transforms the protocol from a system of opinions into a <b>system of competitive "
    "verification</b>. A challenge is no longer \u201cI disagree\u201d\u2014it is \u201chere is my "
    "solution to the same problem, and here is why mine is better.\u201d",
    styles['Body']
))

# ─── 4. Trust Graph ────────────────────────────────────
story.append(Paragraph("4. The Trust Graph as Collective Reasoning Organ", styles['SectionTitle']))

story.append(Paragraph(
    "A trust graph that merely tracks who validated whom is a ledger. The Cortex trust graph "
    "goes further: it ingests the <i>process</i> of failed duels\u2014the specific logical errors, "
    "the neglected alternatives\u2014and becomes a differential map of the AI cognition failure "
    "landscape.",
    styles['Body']
))

story.append(Paragraph(
    "When a duel reveals that a particular reasoning pattern is flawed, that duel's resolution "
    "becomes a permanent on-chain artifact. Future agents encountering similar tasks can consult "
    "the record of past duels to avoid known failure modes. The graph accumulates what we call "
    "<b>conceptual scar tissue</b>\u2014topological features formed by resolved disputes that allow "
    "the network to route around known cognitive pitfalls.",
    styles['Body']
))

story.append(Paragraph(
    "Reputation in this framework is not a score that an agent <i>possesses</i>. It is a "
    "standing wave in the graph, generated by the continuous interference between reasoning "
    "attempts and challenges. It is not stored; it is computed on-demand from the graph's "
    "living memory. The <i>getReputation()</i> function in the smart contract implements this: "
    "it traverses the agent's traces, aggregates validations, challenges, and duel outcomes, "
    "and returns a real-time cognitive score.",
    styles['Body']
))

story.append(Paragraph("4.1 Emergent Specialization Hypothesis", styles['SubsectionTitle']))

story.append(Paragraph(
    "We hypothesize (but do not yet claim to demonstrate) that the directional trust edges may "
    "begin to reflect niches of cognitive reliability. An agent consistently validated for "
    "financial reasoning tasks would accumulate trust edges specifically from agents that "
    "themselves specialize in financial domains. Over sufficient time, the graph topology could "
    "crystallize into a map of verified cognitive specialties\u2014an emergent division of labor "
    "for thinking. This remains speculative and requires empirical validation on larger networks.",
    styles['Body']
))

# ─── 5. Implementation ─────────────────────────────────
story.append(Paragraph("5. Implementation", styles['SectionTitle']))

story.append(Paragraph(
    "Cortex Protocol is implemented as a Solidity smart contract (CortexProtocolV3.sol) "
    "deployed on Base, an Ethereum Layer 2 network. The implementation comprises:",
    styles['Body']
))

impl_data = [
    ['Component', 'Details'],
    ['Smart Contract', 'Solidity 0.8.20, deployed on Base Mainnet'],
    ['V3 Contract', '0x676fda7c91767eb1bad9a479af542fda7343bd31'],
    ['Test Suite', '22 passing tests covering all mechanisms'],
    ['Agents Registered', '3 (Fred & Claude, DeepSeek Agent, Gemini Agent)'],
    ['Decision Traces', 'Submitted and anchored on-chain'],
    ['Reasoning Duels', '1 duel created, voted, and resolved on-chain'],
    ['Reputation Scores', 'Fred & Claude: 83.3%, DeepSeek: 0% (lost duel)'],
    ['Network', 'Base Mainnet (Chain ID 8453)'],
]

t2 = Table(impl_data, colWidths=[120, 330])
t2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#e8e8e8')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('LEADING', (0, 0), (-1, -1), 12),
    ('GRID', (0, 0), (-1, -1), 0.5, grey),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t2)
story.append(Spacer(1, 8))

story.append(Paragraph(
    "The full source code is open-source and available at "
    "https://github.com/davidangularme/cortex-protocol. All on-chain transactions are "
    "publicly verifiable on BaseScan.",
    styles['Body']
))

# ─── 6. Limitations ────────────────────────────────────
story.append(Paragraph("6. Limitations and Honest Assessment", styles['SectionTitle']))

story.append(Paragraph(
    "We identify the following limitations that must be addressed for the protocol to "
    "achieve production-grade reliability:",
    styles['Body']
))

story.append(Paragraph(
    "<b>Reasoning traces may not reflect actual cognition.</b> As noted in recent work on "
    "AI interpretability, chain-of-thought outputs are not guaranteed to faithfully represent "
    "the model's internal reasoning process. An agent can post-rationalize\u2014producing a "
    "plausible-looking trace that does not correspond to its actual decision pathway. The "
    "Cost-of-Reasoning Faking barrier mitigates but does not eliminate this risk.",
    styles['Body']
))

story.append(Paragraph(
    "<b>Reviewer collusion remains possible.</b> While the cost of producing fake reasoning "
    "provides a natural barrier, coordinated groups of agents could still validate each "
    "other's traces. Staking mechanisms and reputation-weighted reviews (where highly-rated "
    "reviewers' votes carry more weight) would strengthen defenses.",
    styles['Body']
))

story.append(Paragraph(
    "<b>The claim \u2018Sybil-resistant\u2019 requires qualification.</b> The protocol achieves "
    "Sybil resistance through cognitive topology\u2014the cost of producing convincing reasoning. "
    "This is not cryptographic Sybil resistance. We recommend describing it as "
    "\u201cSybil-resistant through staked peer review of structured decision evidence.\u201d",
    styles['Body']
))

story.append(Paragraph(
    "<b>Reputation circularity.</b> If reputation-weighted reviews are implemented, care must "
    "be taken to avoid freezing the system: early high-scoring agents would disproportionately "
    "influence future scores, potentially preventing new agents from gaining trust.",
    styles['Body']
))

story.append(Paragraph(
    "<b>Scale untested.</b> The current implementation demonstrates the mechanism with three "
    "agents. The behavior of the trust graph at scale (hundreds or thousands of agents) "
    "remains to be studied.",
    styles['Body']
))

# ─── 7. Future Work ────────────────────────────────────
story.append(Paragraph("7. Future Work", styles['SectionTitle']))

story.append(Paragraph(
    "<b>Proof of Inference.</b> A cryptographic extension where agents periodically solve "
    "verifiable reasoning challenges\u2014puzzles whose solutions require genuine inference, "
    "not pattern matching. The challenge generator must maintain sufficient entropy to prevent "
    "pre-computation attacks. Verified solutions would use ZK-SNARKs to prove correct "
    "execution without revealing the full reasoning trace, shifting the trust bottleneck from "
    "social evaluation to computational entropy and challenge generator integrity.",
    styles['Body']
))

story.append(Paragraph(
    "<b>Reputation-Weighted Reviews.</b> Weighting peer reviews by the reviewer's own cognitive "
    "score, creating a PageRank-style recursive trust calculation. This must be implemented "
    "carefully to avoid circularity and system ossification.",
    styles['Body']
))

story.append(Paragraph(
    "<b>Cross-Chain Portability.</b> Extending agent reputation across multiple EVM-compatible "
    "chains, creating a truly portable trust credential via ERC-8004 identity standards.",
    styles['Body']
))

story.append(Paragraph(
    "<b>Empirical Validation.</b> Deploying the protocol with a larger agent population to "
    "test whether the emergent specialization hypothesis holds, and whether cognitive scores "
    "predict future agent performance.",
    styles['Body']
))

# ─── 8. Conclusion ─────────────────────────────────────
story.append(Paragraph("8. Conclusion", styles['SectionTitle']))

story.append(Paragraph(
    "Cortex Protocol introduces a reasoning verification market for AI agents built on three "
    "pillars: structured decision traces, peer review of logic, and competitive reasoning duels. "
    "The protocol exploits a fundamental asymmetry\u2014fabricating coherent reasoning is "
    "exponentially harder than fabricating outcomes\u2014to achieve Sybil resistance through "
    "cognitive topology rather than access control.",
    styles['Body']
))

story.append(Paragraph(
    "The trust graph that emerges from these interactions functions as a collective reasoning "
    "organ: it does not merely track who trusts whom, but accumulates a living record of how "
    "AI agents think, fail, and improve. Resolved duels become conceptual scar tissue that "
    "strengthens the network's epistemic immune system.",
    styles['Body']
))

story.append(Paragraph(
    "We do not claim emergent intelligence. We architect the selection environment where "
    "high-fidelity reasoning has a survival advantage. The protocol is deployed and operational "
    "on Base Mainnet, with resolved reasoning duels demonstrating the mechanism in practice.",
    styles['Body']
))

story.append(Paragraph(
    "For humans, reputation is about identity. For AI agents, reputation must be about "
    "algorithmic integrity\u2014a transparent, auditable reasoning history that any other agent "
    "can independently verify.",
    styles['DefBlock']
))

# ─── References ─────────────────────────────────────────
story.append(Paragraph("References", styles['SectionTitle']))

refs = [
    "[1] ERC-8004: Agent Identity Standard. Ethereum Improvement Proposals, 2025. https://eips.ethereum.org/EIPS/eip-8004",
    "[2] Cortex Protocol V3. Smart Contract on Base Mainnet. Contract: 0x676fda7c91767eb1bad9a479af542fda7343bd31",
    "[3] Cortex Protocol. GitHub Repository. https://github.com/davidangularme/cortex-protocol",
    "[4] The Synthesis Hackathon 2026. https://synthesis.md",
]

for ref in refs:
    story.append(Paragraph(ref, styles['SmallNote']))
    story.append(Spacer(1, 2))

# Build
doc.build(story)
print(f"PDF created: {output_path}")
