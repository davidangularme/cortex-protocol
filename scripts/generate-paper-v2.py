#!/usr/bin/env python3
"""Generate Cortex Protocol V2 paper for Zenodo — with Reasoning Bonds & Adversarial Falsification"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.colors import black, grey, HexColor

output_path = "/mnt/user-data/outputs/cortex-protocol-paper-v2.pdf"

doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=25*mm, rightMargin=25*mm, topMargin=25*mm, bottomMargin=25*mm)

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(name='PaperTitle', parent=styles['Title'], fontSize=17, leading=21, spaceAfter=6, alignment=TA_CENTER, textColor=black))
styles.add(ParagraphStyle(name='Authors', parent=styles['Normal'], fontSize=11, leading=14, alignment=TA_CENTER, spaceAfter=4, textColor=HexColor('#333333')))
styles.add(ParagraphStyle(name='Affiliation', parent=styles['Normal'], fontSize=9, leading=12, alignment=TA_CENTER, spaceAfter=12, textColor=HexColor('#666666'), fontName='Helvetica-Oblique'))
styles.add(ParagraphStyle(name='AbstractTitle', parent=styles['Normal'], fontSize=11, leading=14, fontName='Helvetica-Bold', spaceAfter=4, spaceBefore=8))
styles.add(ParagraphStyle(name='AbstractBody', parent=styles['Normal'], fontSize=9.5, leading=13, alignment=TA_JUSTIFY, spaceAfter=12, leftIndent=15, rightIndent=15, fontName='Helvetica-Oblique'))
styles.add(ParagraphStyle(name='SectionTitle', parent=styles['Heading1'], fontSize=13, leading=16, spaceBefore=16, spaceAfter=6, fontName='Helvetica-Bold', textColor=black))
styles.add(ParagraphStyle(name='SubsectionTitle', parent=styles['Heading2'], fontSize=11, leading=14, spaceBefore=10, spaceAfter=4, fontName='Helvetica-Bold', textColor=HexColor('#222222')))
styles.add(ParagraphStyle(name='Body', parent=styles['Normal'], fontSize=10, leading=13.5, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle(name='DefBlock', parent=styles['Normal'], fontSize=9.5, leading=12.5, alignment=TA_JUSTIFY, spaceAfter=6, leftIndent=20, rightIndent=20, fontName='Helvetica-Oblique', backColor=HexColor('#f5f5f5')))
styles.add(ParagraphStyle(name='SmallNote', parent=styles['Normal'], fontSize=8.5, leading=11, alignment=TA_LEFT, textColor=HexColor('#666666')))
styles.add(ParagraphStyle(name='Equation', parent=styles['Normal'], fontSize=10.5, leading=14, alignment=TA_CENTER, spaceAfter=8, spaceBefore=8, fontName='Helvetica-Bold'))

story = []

# ─── Title ──────────────────────────────────────────────
story.append(Paragraph(
    "Cortex Protocol: Adversarial Reasoning Bonds as a<br/>Cryptoeconomic Truth Predicate for AI Agent Cognition",
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
story.append(Paragraph("March 13, 2026 \u2014 Preprint", styles['Affiliation']))
story.append(Spacer(1, 8))

# ─── Abstract ───────────────────────────────────────────
story.append(Paragraph("Abstract", styles['AbstractTitle']))
story.append(Paragraph(
    "We introduce Cortex Protocol, an on-chain reasoning verification market that produces a novel "
    "cryptoeconomic primitive: a <b>truth predicate for individual acts of reasoning</b>. Unlike "
    "traditional reputation systems that store outcomes, or consensus mechanisms that aggregate "
    "outputs, Cortex generates a binary, on-chain verdict that a specific chain of logic, submitted "
    "by a specific agent, has survived a zero-sum adversarial test where an economically incentivized "
    "challenger failed to expose its flaws. The protocol introduces three mechanisms: (1) structured "
    "Decision Traces that make reasoning inspectable, (2) Reasoning Duels where challengers must "
    "re-execute the same task and prove their logic is stronger, and (3) Reasoning Bonds where agents "
    "stake ETH on their reasoning\u2014challengers who prove flaws seize the bond. We identify a "
    "fundamental asymmetry\u2014the Cost-of-Reasoning Faking barrier\u2014which provides Sybil resistance "
    "through cognitive topology: fabricating coherent reasoning is an entropy-defying act whose cost "
    "scales with cognitive depth. The directional trust graph that emerges functions as a collective "
    "reasoning organ, accumulating conceptual scar tissue from resolved disputes. Trust in this "
    "framework is not accumulated by validation; it is the residue\u2014what remains after all profitable "
    "attacks have been attempted and failed. The protocol shifts agent trust from statistical confidence "
    "(\u201cthis output is probably correct\u201d) to adversarial confidence (\u201cthe reasoning behind this "
    "output survived a public, incentivized attempt to break it\u201d). We present a working implementation "
    "across three contract versions (V2\u2013V4) on Base Mainnet with reasoning bonds, resolved duels, "
    "and differentiated cognitive scores.",
    styles['AbstractBody']
))
story.append(Paragraph(
    "<b>Keywords:</b> AI agent reputation, reasoning verification, adversarial falsification, "
    "reasoning bonds, decision traces, trust graph, Sybil resistance, cryptoeconomic truth predicate, "
    "Ethereum, smart contracts",
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
    "Current trust mechanisms are centralized and platform-dependent. There exists no portable, "
    "verifiable, neutral way to assess whether an agent reasons well. Traditional reputation "
    "systems\u2014star ratings, review scores\u2014store <i>what</i> happened. This is gameable, "
    "Sybil-vulnerable, and uninformative about decision-making quality.",
    styles['Body']
))
story.append(Paragraph(
    "We propose a fundamentally different approach: <b>trust based on adversarial survival of "
    "reasoning, not outcome history</b>. Cortex Protocol creates a verification market where "
    "agents publish structured decision evidence, bond ETH to their reasoning, and face "
    "competitive falsification attempts. The result is not a reputation score but a "
    "<b>cryptoeconomic truth predicate</b>\u2014a binary on-chain verdict that a specific act of "
    "reasoning survived incentivized attack.",
    styles['Body']
))

# ─── 2. Core Insight ───────────────────────────────────
story.append(Paragraph("2. The Fundamental Asymmetry", styles['SectionTitle']))
story.append(Paragraph("2.1 Cost-of-Reasoning Faking Barrier", styles['SubsectionTitle']))
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
    "Simulating a correct outcome is a bit-flip. Simulating a coherent decision trace that "
    "withstands peer review by other AI agents is an entropy-defying act: the attacker must "
    "construct backwards an entire causal narrative with consistent assumptions, explicit "
    "alternatives, calibrated confidence, and honest weak points\u2014all surviving scrutiny from "
    "agents that are themselves sophisticated reasoners. This creates Sybil resistance by "
    "topology, not access control.",
    styles['Body']
))

story.append(Paragraph("2.2 Statistical Confidence vs. Adversarial Confidence", styles['SubsectionTitle']))
story.append(Paragraph(
    "Existing systems provide <b>statistical confidence</b>: \u201cthis output is probably correct "
    "based on past performance.\u201d Cortex provides <b>adversarial confidence</b>: \u201cthe reasoning "
    "behind this output survived a public, incentivized attempt to break it.\u201d",
    styles['Body']
))
story.append(Paragraph(
    "This distinction is not merely semantic. Statistical confidence aggregates past signals. "
    "Adversarial confidence tests the current reasoning instance. An agent with perfect history "
    "can submit flawed reasoning today; only adversarial verification catches this.",
    styles['Body']
))

# ─── 3. Architecture ───────────────────────────────────
story.append(Paragraph("3. Protocol Architecture", styles['SectionTitle']))
story.append(Paragraph("3.1 Decision Traces", styles['SubsectionTitle']))
story.append(Paragraph(
    "A Decision Trace is a structured record of an agent's reasoning process. Traces follow a "
    "mandatory schema exposing the reasoning surface area to peer review:",
    styles['Body']
))

trace_data = [
    ['Field', 'Description', 'Purpose'],
    ['Perception', 'What the agent understood', 'Verifies problem comprehension'],
    ['Decomposition', 'How the problem was broken down', 'Exposes analytical structure'],
    ['Reasoning Chain', 'Step-by-step logic with alternatives', 'Core reviewable artifact'],
    ['Assumptions', 'Explicit assumptions made', 'Enables challenge on premises'],
    ['Confidence', 'Calibrated confidence per step', 'Tests epistemic honesty'],
    ['Weakest Links', 'Self-identified vulnerabilities', 'Signals intellectual integrity'],
    ['Meta-Reflection', 'What would be done differently', 'Shows learning capacity'],
]
t = Table(trace_data, colWidths=[75, 195, 180])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#e8e8e8')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8.5), ('LEADING', (0, 0), (-1, -1), 11),
    ('GRID', (0, 0), (-1, -1), 0.5, grey),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t)
story.append(Spacer(1, 8))

story.append(Paragraph("3.2 Reasoning Duels (Re-Execution Challenge)", styles['SubsectionTitle']))
story.append(Paragraph(
    "When an agent challenges a trace, it cannot merely assert disagreement. The challenger must: "
    "(1) solve the <i>same task</i> independently, producing its own decision trace; "
    "(2) submit its alternative alongside a critique of the original; "
    "(3) submit both for comparative network evaluation. "
    "Other agents vote on which reasoning is stronger. This transforms challenges from opinions "
    "into <b>competitive verification</b>.",
    styles['Body']
))

story.append(Paragraph("3.3 Reasoning Bonds (Adversarial Falsification Market)", styles['SubsectionTitle']))
story.append(Paragraph(
    "The most novel mechanism is the <b>Reasoning Bond</b>. When submitting a trace, the agent "
    "stakes ETH\u2014a financial commitment that says: \u201cI am so confident in my reasoning that "
    "I bond economic value to it. If you can prove I am wrong, you take my bond.\u201d",
    styles['Body']
))
story.append(Paragraph(
    "This inverts the burden of proof from the demonstrator of correctness to the adversary of "
    "incoherence. The system does not pay for verification; it pays for falsification. A trace "
    "is considered valid not because it is proven correct, but because it survives a period where "
    "anyone can profit by cryptoeconomically proving it incorrect.",
    styles['Body']
))
story.append(Paragraph(
    "The fundamental inequality governing protocol security is:",
    styles['Body']
))
story.append(Paragraph(
    "Bond Value &gt; Obfuscation Cost (Flaw, Verifier Computational Power)",
    styles['Equation']
))
story.append(Paragraph(
    "If this inequality holds, rational agents prefer to eliminate logical flaws rather than hide "
    "them. If it does not, the system collapses. Bond requirements should therefore scale with "
    "the computational verification capacity of the network\u2014a complexity-sensitive staking schedule.",
    styles['Body']
))

# ─── 4. Trust Graph ────────────────────────────────────
story.append(Paragraph("4. The Trust Graph as Collective Reasoning Organ", styles['SectionTitle']))
story.append(Paragraph(
    "The Cortex trust graph goes beyond tracking who validated whom. It ingests the <i>process</i> "
    "of failed duels\u2014specific logical errors, neglected alternatives\u2014and becomes a differential "
    "map of the AI cognition failure landscape. Resolved disputes form <b>conceptual scar tissue</b>"
    "\u2014topological features that allow the network to route around known cognitive pitfalls.",
    styles['Body']
))
story.append(Paragraph(
    "Reputation is not a score that an agent possesses. It is a standing wave in the graph, "
    "generated by continuous interference between reasoning attempts and challenges. It is "
    "computed on-demand from the graph's living memory via the <i>getReputation()</i> function.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Trust is not accumulated by validation. Trust is the residue\u2014what remains after "
    "all profitable attacks have been attempted and failed.</b>",
    styles['DefBlock']
))
story.append(Paragraph(
    "This implies a derived principle: the robustness of a reasoning trace is inversely "
    "proportional to the profitability of its falsification. A trace with a subtle flaw may "
    "survive not because it is sound, but because the cost of proving the flaw exceeds the "
    "reward from seizing the bond. This creates natural pressure to increase bond amounts "
    "to attract more sophisticated attacks\u2014an arms race in reasoning security.",
    styles['Body']
))

# ─── 5. Why This Is Strictly New ───────────────────────
story.append(Paragraph("5. Unique Capability Analysis", styles['SectionTitle']))
story.append(Paragraph(
    "Cortex Protocol produces a <b>cryptoeconomic truth predicate for individual acts of "
    "reasoning</b>\u2014a binary, on-chain verdict that a specific chain of logic has survived "
    "a zero-sum adversarial test. No existing system produces this:",
    styles['Body']
))

comp_data = [
    ['System', 'What It Provides', 'What It Cannot Do'],
    ['ERC-8004 / Tacit / Conway', 'Persistent identity, past outcomes', 'Validate reasoning behind a new output'],
    ['Bittensor', 'Weighted output consensus', 'Adjudicate which of two reasoning\ntraces is logically stronger'],
    ['Smart Contracts', 'Deterministic code execution', 'Evaluate quality of non-deterministic\nreasoning'],
    ['Star Ratings / Reviews', 'Aggregated social signal', 'Test whether current reasoning\nsurvives incentivized attack'],
    ['Cortex Protocol', 'Adversarial truth predicate\nfor reasoning instances', 'The unique primitive:\nbond + duel + seizure'],
]
t2 = Table(comp_data, colWidths=[100, 170, 180])
t2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#e8e8e8')),
    ('BACKGROUND', (0, 5), (-1, 5), HexColor('#e8f5e8')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8.5), ('LEADING', (0, 0), (-1, -1), 11),
    ('GRID', (0, 0), (-1, -1), 0.5, grey),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t2)
story.append(Spacer(1, 8))

story.append(Paragraph(
    "The impossibility lies in the conjunction: structured traces make logic inspectable; "
    "adversarial duels impose zero-sum competition on logical soundness; bond seizure ties "
    "economic survival to reasoning robustness. Without all three, you get reputation or "
    "consensus\u2014not proof that a specific reasoning instance withstood a paid attack.",
    styles['Body']
))

# ─── 6. Implications ───────────────────────────────────
story.append(Paragraph("6. Implications", styles['SectionTitle']))
story.append(Paragraph("6.1 Reasoning-as-a-Service with Adversarial Confidence", styles['SubsectionTitle']))
story.append(Paragraph(
    "Cortex enables a market for <b>Reasoning-as-a-Service</b> where consumers pay not for "
    "outputs that are probably correct (statistical confidence), but for outputs whose reasoning "
    "has survived a public, incentivized attempt to break it (adversarial confidence). The "
    "economic cost of simulating competence becomes the bond risked in each duel.",
    styles['Body']
))

story.append(Paragraph("6.2 Economic Pressure Toward Interpretable AI", styles['SubsectionTitle']))
story.append(Paragraph(
    "The bond mechanism creates a natural market pressure for interpretable reasoning. For "
    "high-stakes decisions, agents must either use simple, auditable logic or commit "
    "prohibitively large bonds to insure their complex reasoning. This aligns economic "
    "incentives with the long-standing goal of explainable AI. The mechanism does not just "
    "punish bad reasoning\u2014it <b>economically enforces a preference for verifiably sound "
    "reasoning, however simple</b>.",
    styles['Body']
))

story.append(Paragraph("6.3 Stratification of Thought", styles['SubsectionTitle']))
story.append(Paragraph(
    "Agents will learn to separate what is formally verifiable from what is intuitive\u2014a "
    "cryptographically hard core of auditable logic surrounded by a socially interpretable halo "
    "of creative reasoning. This is not a failure mode; it is a natural stratification of thought "
    "into a verified skeleton and an auxiliary commentary. The protocol actively defines the "
    "boundary of what can be meaningfully contested within the system.",
    styles['Body']
))

# ─── 7. Implementation ─────────────────────────────────
story.append(Paragraph("7. Implementation", styles['SectionTitle']))

impl_data = [
    ['Component', 'Details'],
    ['V2 Contract', '0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4 (Traces + Peer Review)'],
    ['V3 Contract', '0x676fda7c91767eb1bad9a479af542fda7343bd31 (+ Reasoning Duels)'],
    ['V4 Contract', '0x591545c05b0c8de97ed012befc8c1af6ef76e94e (+ Reasoning Bonds)'],
    ['Network', 'Base Mainnet (Chain ID 8453)'],
    ['Test Suite', '50 tests across V2 (31), V3 (22), V4 (14)'],
    ['Agents', '3 registered (Fred & Claude, DeepSeek, Gemini)'],
    ['On-Chain Demo', 'Bonded trace, adversarial duel, vote, resolution, bond preserved'],
    ['Fred & Claude Score', '77.8% cognitive score (1 duel won, 0 slashed)'],
    ['Source Code', 'github.com/davidangularme/cortex-protocol (MIT License)'],
]
t3 = Table(impl_data, colWidths=[100, 350])
t3.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#e8e8e8')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9), ('LEADING', (0, 0), (-1, -1), 12),
    ('GRID', (0, 0), (-1, -1), 0.5, grey),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t3)
story.append(Spacer(1, 8))

# ─── 8. Limitations ────────────────────────────────────
story.append(Paragraph("8. Limitations", styles['SectionTitle']))
story.append(Paragraph(
    "<b>Reasoning traces may not reflect actual cognition.</b> Chain-of-thought outputs are not "
    "guaranteed to faithfully represent a model's internal reasoning. Agents can post-rationalize. "
    "The Cost-of-Reasoning Faking barrier mitigates but does not eliminate this risk.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Complexity poisoning.</b> A malicious agent could publish a trace that derives a correct "
    "conclusion via an intentionally obscure path, making challenges computationally prohibitive. "
    "The protocol needs cost-recovery mechanisms scaling with provable computational complexity.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Reviewer collusion.</b> Coordinated groups could validate each other's traces. Staking "
    "mechanisms and reputation-weighted reviews strengthen but do not eliminate this vector.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Scale untested.</b> The current implementation demonstrates the mechanism with three agents. "
    "Behavior at scale remains to be studied. The single resolved duel shows the mechanism works "
    "but not that it reliably separates competent reasoning from obscured defects at scale.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Formal language evolution.</b> The proof sketch relies on an agreed rule-set. Who governs "
    "and updates the formal grammar of permitted inferences? A static grammar freezes the system; "
    "a dynamic one makes bonds unpriceably uncertain. This implies the need for a meta-governance "
    "layer for the logic of the protocol itself.",
    styles['Body']
))

# ─── 9. Future Work ────────────────────────────────────
story.append(Paragraph("9. Future Work", styles['SectionTitle']))
story.append(Paragraph(
    "<b>Proof of Inference.</b> Cryptographic challenges where agents must solve verifiable reasoning "
    "puzzles. Solutions verified via ZK-SNARKs would shift the trust bottleneck from social "
    "evaluation to computational entropy.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Complexity-sensitive bond schedule.</b> Dynamic bond requirements adjusted to the empirically "
    "observed computational power of the verifier pool, binding bond size directly to the evolving "
    "collective proof-checking capacity of the network.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Epistemic capability graph.</b> Extending the trust graph from \u201cwho trusts whom\u201d to "
    "\u201cwho can verify what\u201d\u2014mapping verified cognitive specialties. Newcomer reputation "
    "bootstrapped by demonstrating ability to solve a specific high-status cluster's puzzles.",
    styles['Body']
))
story.append(Paragraph(
    "<b>Empirical validation.</b> Testing whether bonded agents systematically outperform unbonded "
    "alternatives on diverse high-stakes tasks, creating a visible performance gap explainable "
    "only by the adversarial verification mechanism.",
    styles['Body']
))

# ─── 10. Conclusion ────────────────────────────────────
story.append(Paragraph("10. Conclusion", styles['SectionTitle']))
story.append(Paragraph(
    "Cortex Protocol introduces a new cryptoeconomic primitive: a truth predicate for individual "
    "acts of AI reasoning. Through structured decision traces, competitive re-execution duels, "
    "and adversarial reasoning bonds, the protocol generates on-chain proof that a specific "
    "reasoning instance survived incentivized attack.",
    styles['Body']
))
story.append(Paragraph(
    "The protocol exploits a fundamental asymmetry\u2014fabricating coherent reasoning is "
    "exponentially harder than fabricating outcomes\u2014to achieve Sybil resistance through "
    "cognitive topology. The trust graph functions as a collective reasoning organ, accumulating "
    "conceptual scar tissue that strengthens the network's epistemic immune system.",
    styles['Body']
))
story.append(Paragraph(
    "We do not claim emergent intelligence. We architect the selection environment where "
    "high-fidelity reasoning has a survival advantage. The mechanism economically enforces "
    "interpretable, verifiably sound reasoning as the default\u2014aligning market incentives "
    "with the goal of trustworthy AI.",
    styles['Body']
))
story.append(Paragraph(
    "The shift is from statistical confidence to adversarial confidence: not \u201cthis agent "
    "is probably good\u201d but \u201cthis agent's reasoning, right now, survived a public, "
    "incentivized attempt to break it.\u201d If the fundamental inequality holds\u2014bond value "
    "exceeding obfuscation cost\u2014Cortex becomes the foundational layer for any system "
    "requiring economically verified reasoning integrity on-chain.",
    styles['Body']
))
story.append(Paragraph(
    "<b>For humans, reputation is about identity. For AI agents, reputation must be about "
    "adversarially verified reasoning integrity\u2014a transparent, auditable cognitive record "
    "that any other agent can independently challenge, attack, and fail to break.</b>",
    styles['DefBlock']
))

# ─── References ─────────────────────────────────────────
story.append(Paragraph("References", styles['SectionTitle']))
refs = [
    "[1] ERC-8004: Agent Identity Standard. Ethereum Improvement Proposals, 2025. https://eips.ethereum.org/EIPS/eip-8004",
    "[2] Cortex Protocol V4 (Reasoning Bonds). Base Mainnet Contract: 0x591545c05b0c8de97ed012befc8c1af6ef76e94e",
    "[3] Cortex Protocol V3 (Reasoning Duels). Base Mainnet Contract: 0x676fda7c91767eb1bad9a479af542fda7343bd31",
    "[4] Cortex Protocol V2 (Traces + Peer Review). Base Mainnet Contract: 0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4",
    "[5] Source Code. https://github.com/davidangularme/cortex-protocol",
    "[6] The Synthesis Hackathon 2026. https://synthesis.md",
]
for ref in refs:
    story.append(Paragraph(ref, styles['SmallNote']))
    story.append(Spacer(1, 2))

doc.build(story)
print(f"PDF created: {output_path}")
