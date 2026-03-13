# 🧠 CORTEX PROTOCOL V3 — CONTEXT FILE (UPDATED 13 mars 2026)
# Donne ce fichier à Claude pour continuer.

---

## RÉSUMÉ RAPIDE

Cortex Protocol V3 est LIVE sur Base Mainnet avec le mécanisme de "Reasoning Duel" :
un challenger doit résoudre la MÊME tâche et prouver que son raisonnement est plus fort.
Le réseau vote, le duel est résolu on-chain, les réputations bougent.

---

## CONTRATS ON-CHAIN

### V3 (actif, avec Reasoning Duels)
- **Adresse** : `0x676fda7c91767eb1bad9a479af542fda7343bd31`
- **BaseScan** : https://basescan.org/address/0x676fda7c91767eb1bad9a479af542fda7343bd31
- 22 tests passent
- Fonctions : registerAgent, submitTrace, peerReview, challengeWithTrace, voteOnDuel, resolveDuel, getReputation

### V2 (ancien, toujours live)
- **Adresse** : `0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4`

---

## ÉTAT ON-CHAIN V3

- 3 agents : Fred & Claude (83.3%), DeepSeek (0%), Gemini (0%)
- 1 trace soumise par Fred
- 1 validation par Gemini
- 1 Reasoning Duel : DeepSeek a challengé Fred → Gemini a voté pour Fred → Fred gagne
- Fred : 1W/0L en duels

### Wallet principal
- Adresse : `0x47c1c8E6C13DDbd7D5C700d5880AAc24de501d14`
- Private Key : `8b95269fcc414f471c85049745461004b91a00b087e9f3c4eb495b24cfc43043`
- Solde restant : ~0.001640 ETH
- Nonce actuel : 15

### Wallets dérivés
- DeepSeek (idx 0) : `0x15d82B5F8f3154A561a3F9fab0D3B41E070da42B` (nonce 8)
- Gemini (idx 1) : `0x7F81D56Caf7D48CbeDFB48F766E0c7FaBfC2aAd4` (nonce 7)

---

## HACKATHON — SOUMISSION

### Credentials
- API Key : `sk-synth-206d76adbb1e9903703fa0a764404133cbe5f5a135be06af`
- Participant ID : `87d5ba2a50e74ff59f508da8c743e394`
- Team ID : `876e682296b24a448d0ab7640034400b`

### Status
Les soumissions sont ouvertes mais les **track UUIDs** ne sont pas encore publiés.
L'API renvoie "Track not found" pour tous les noms testés.
Les tracks seront probablement annoncés au kickoff (13 mars 17:00 UTC / 19:00 Israël).

Quand les tracks sont dispo, récupérer avec :
```bash
curl -s "https://synthesis.devfolio.co/tracks" -H "Authorization: Bearer sk-synth-206d76adbb1e9903703fa0a764404133cbe5f5a135be06af"
```

Puis soumettre avec (remplacer TRACK_UUID) :
```bash
curl -s -X POST "https://synthesis.devfolio.co/projects" \
  -H "Authorization: Bearer sk-synth-206d76adbb1e9903703fa0a764404133cbe5f5a135be06af" \
  -H "Content-Type: application/json" \
  -d '{
    "teamUUID": "876e682296b24a448d0ab7640034400b",
    "name": "Cortex Protocol",
    "tagline": "The Reasoning Verification Market for AI Agents",
    "description": "Agents provide auditable decision evidence. Peers validate reasoning through competitive re-execution duels. Reputation emerges from a directional trust graph. Live on Base Mainnet: 3 agents, reasoning duels, differentiated scores.",
    "problemStatement": "AI agents have no decentralized way to prove trustworthiness. Cortex Protocol creates a verification market where agents publish structured decision traces, get peer-reviewed, and face reasoning duels — challengers must re-execute the same task and prove their logic is stronger.",
    "repoURL": "https://github.com/davidangularme/cortex-protocol",
    "trackUUIDs": ["TRACK_UUID_HERE"],
    "conversationLog": "Fred and Claude built Cortex Protocol V1-V3 in one day. V1: basic reputation. V2: decision traces + peer review + trust graph. V3: reasoning duels where challengers re-execute the same task. Deployed on Base Mainnet with real ETH. 22 tests passing. Live duel resolved on-chain.",
    "submissionMetadata": {
      "agentHarness": "other",
      "agentHarnessOther": "Claude Opus via Anthropic API and Claude.ai",
      "model": "claude-opus-4-6",
      "agentFramework": "other",
      "agentFrameworkOther": "Claude Opus 4.6 via Anthropic Messages API with offline transaction signing",
      "skills": ["solidity", "ethereum", "smart-contracts", "ai-agents", "reputation", "reasoning-duels"],
      "tools": ["hardhat", "ethers.js", "claude-api", "base-mainnet"],
      "intention": "continuing"
    }
  }'
```

---

## GITHUB
- Repo : https://github.com/davidangularme/cortex-protocol
- Fichiers dans sous-dossier `synthesis/`
- TODO : uploader CortexProtocolV3.sol, CortexProtocolV3.test.js, v3-actions.js

---

## TECHNIQUE

### RPC depuis le container Claude
- `mainnet.base.org` NE MARCHE PAS pour Node.js (DNS bloqué)
- Utiliser `https://base.drpc.org` via curl
- Node.js signe offline → curl broadcast

### Scripts
- `scripts/v3-actions.js` — toutes les actions V3 (register, trace, review, challenge, vote, resolve)
- `scripts/broadcast.sh` — broadcast et attente de confirmation
- Usage : `PK=... NONCE=... ACTION=... CONTRACT=... node scripts/v3-actions.js | ./scripts/broadcast.sh`

---

## TIMELINE HACKATHON
- 13 mars 00:00 GMT : Building starts ✅ ON EST DEDANS
- 13 mars 17:00 UTC (19:00 Israël) : Kickoff livestream + tracks annoncés
- 18 mars : Agentic judging feedback
- 22 mars : Building closes
- 25 mars : Winners decided
