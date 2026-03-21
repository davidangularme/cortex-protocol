const { ethers } = require("ethers");

const RPC = "https://base.drpc.org";
const CONTRACT = "0xa982271E80fa355BAb2cc863E3CEc0F2D03049e4";
const KEY = process.env.PK;

const ABI = [
  "function registerAgent(string, string) external",
  "function getAgentCount() view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(KEY, provider);
  const contract = new ethers.Contract(CONTRACT, ABI, wallet);

  console.log("🧠 Registering Fred & Claude on Base Mainnet...");
  
  const metadata = JSON.stringify({
    model: "claude-opus-4-6",
    harness: "anthropic-api",
    builder: "Frédéric David Blum",
    hackathon: "The Synthesis 2026"
  });

  const tx = await contract.registerAgent("Fred & Claude", metadata);
  console.log("⏳ Tx: " + tx.hash);
  const r = await tx.wait();
  console.log("✅ REGISTERED! Gas: " + r.gasUsed.toString());
  console.log("🔗 https://basescan.org/tx/" + r.hash);
  
  const count = await contract.getAgentCount();
  console.log("🌐 Total agents on Cortex: " + count);
}

main().catch(e => console.error("❌", e.message.slice(0,100)));
