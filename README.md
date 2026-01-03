# Synthesis Ledger SDK (V42)

Decentralized infrastructure for the deterministic verification and permanent auditing of AI agent logic. Logic is anchored on **Arweave** and verified on **Base Mainnet**.

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

## 🛠 Core Functions

### Multi-Model Consensus (MMC)

The SDK employs a 10-trial forensic simulation to ensure logic integrity.

* **Silo A (Toil)**: Monitors operational waste.
* **Silo B (Security)**: Identifies structural vulnerabilities.
* **Silo C (Economy)**: Prevents fee-split arbitrage.
* **Silo D (Structure)**: Verifies schema compliance.

### The Strike System

Atomics falling below the **7800 BPS Floor** receive a strike. Three strikes result in logic obsolescence.

## 📊 Economic Model

| Action | Cost | Distribution |
| --- | --- | --- |
| **Sandbox Run** | Free (BYOK) | N/A |
| **Certified Run** | $0.10 USD | 50% Founder / 10% Creator / 40% Community |
| **Immune Strike** | Managed | Deducted from Community Audit Pool (CAP) |

## 🔗 Repository Structure

* `/contracts`: Solidity source for Token and Ledger.
* `/agent`: Sentinel forensic audit agents.
* `/script`: Seeding and anchoring automation.
* `/docs`: Technical blueprints for all 99 Atomics.

## ⚖️ Governance

Managed by the **Genesis 90 Council**. New members require a 1/3 consensus vote after the initial 90-day transition window.