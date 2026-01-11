# Synthesis Ledger SDK (V42)

Decentralized infrastructure for the deterministic verification and permanent auditing of AI agent logic. Logic is anchored on **Arweave** and verified on **Base Mainnet**.

**Updated January 11, 2026** — Economic Model synced to live tokenomics at [synthesisledger.xyz/docs/03_tokenomics](https://www.synthesisledger.xyz/docs/03_tokenomics) (current production version).

---

## 🚀 5-Minute Quickstart

### 1. Install

```bash
npm i -g synthesis-ledger-sovereign-sdk

```

### 2. Configure Environment

Create a `.env` file in your project root with your credentials:

```env
XAI_API_KEY="your-xai-key"
PRIVATE_KEY="your-wallet-private-key"
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"

```

### 3. Run Your First Atomic

Execute a verified audit of a digital ledger using the CFO Atomic:

```bash
# Sandbox Mode (Local execution, no on-chain fee)
synl run A-CFO-LedgerParser ./input.json --sandbox

# Certified Mode (Anchored to Base Mainnet, $0.10 fee)
synl run A-CFO-LedgerParser ./input.json

```

---

## 🧠 Core Functions

### Multi-Model Consensus (MMC)

The SDK employs a **10-trial forensic simulation** to ensure logic integrity across four specialist silos:

* **Silo A (Toil):** Monitors operational waste and SRE metrics.
* **Silo B (Security):** Identifies structural vulnerabilities and leakages.
* **Silo C (Economy):** Prevents fee-split arbitrage and game-theory failures.
* **Silo D (Structure):** Verifies schema compliance and data integrity.

### The Strike System

Atomics falling below the **7800 BPS (Basis Points) Floor** (78.00% success density) during an audit cycle receive a strike. Three strikes result in **Terminal Obsolescence** (permanent deactivation and revenue siphoning).

---

## 💰 Economic Model

| Action | Cost | Distribution (per **$0.10** Certified Run) |
| --- | --- | --- |
| **Sandbox Run** | Free (BYOK) | N/A |
| **Certified Run** | **$0.10 USD** (min 10 $SYNL anti-spam) | **30%** Protocol Treasury |
|  |  | **20%** Token Buyback |
|  |  | **20%** Auditor Rewards |
|  |  | **10%** Genesis 90 Council |
|  |  | **20%** Development Fund |
| **Immune Strike** | Managed | Handled via protocol-level revenue redistribution |

---

## 📁 Repository Structure

* **/contracts:** Solidity source for the V3 Token and Ledger anchors.
* **/agent:** Autonomous Sentinel forensic audit agents.
* **/script:** Seeding and anchoring automation for Arweave/Base.
* **/docs:** Technical blueprints for all **99 Atomics** (38/38 Genesis Atomics secured).

---

## 🏛️ Governance

Managed by the **Genesis 90 Council**. Membership and logic updates are protected by a **144-hour (6-day) cooldown** and require a **1/3 consensus vote** following the initial 90-day transition window.

---

### Quick Summary of Changes & Verification

* **Economic Model:** Replaced the legacy 20/10/70 split with the exact production **30/20/20/10/20** distribution from the live `/03_tokenomics` page.
* **Technical Benchmarks:** Verified the **7800 BPS Floor** and **$0.10 USD** execution fee against the January 2026 Epoch 01 protocol status.
* **Governance:** Updated to reflect the **Genesis 90 Council** model and the **144-hour update cooldown** as currently enforced on-chain.
