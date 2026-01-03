# SYNL Token Distribution (1 Billion Total)

This document serves as the formal specification for the **Synthesis Ledger V42** tokenomics. The primary objective is a community-first distribution that ensures long-term protocol stability and verifiable founder alignment.

## 📊 Core Allocation Matrix

| Category | Allocation | SYNL Amount | Purpose & Usage |
| --- | --- | --- | --- |
| **Community & Ecosystem** | 40.0% | 400,000,000 | SDK rewards, referrals, and atomic creation incentives. |
| **Protocol Treasury** | 30.0% | 300,000,000 | Infrastructure, audit costs, and ongoing development. |
| **Early Supporters** | 15.0% | 150,000,000 | Genesis contributors, beta testers, and academic partners. |
| **Liquidity Pool** | 10.0% | 100,000,000 | Initial DEX liquidity and exchange listings. |
| **AI/DeFi Partners** | 4.9% | 49,000,000 | Strategic integrations and cross-protocol growth. |
| **Founder (Lars H.)** | 0.1% | 1,000,000 | Long-term skin-in-the-game. |

## 🔒 Hardened Vesting Schedule

To prevent supply shocks and ensure continuous development, all major pools are governed by smart-contract-enforced vesting schedules.

### 1. Founder Allocation (0.1%)

* **Total**: 1,000,000 SYNL
* **Cliff**: 12 Months (No tokens released for the first year).
* **Vesting**: 48 Months linear unlock post-cliff.
* **Verification**: Monitored via the `mintFounderVesting` function in `SYNL_Token_V42.sol`.

### 2. Protocol Treasury (30.0%)

* **Total**: 300,000,000 SYNL
* **Vesting**: 4 years linear (monthly releases).
* **Control**: Multisig governance (Genesis 90 Council).

### 3. Community Rewards (40.0%)

* **Total**: 400,000,000 SYNL
* **Vesting**: Activity-based (2-year average projection).
* **Mechanism**: SDK usage rewards and referral payouts (10% ongoing).

## 📉 Supply Dynamics

The Synthesis Ledger utilizes an **Exponential Decay Model** for its weekly release limit to maintain scarcity as the network scales.

* **Initial Weekly Limit**: 30,757,333 SYNL
* **Decay Rate**: 2% weekly reduction (DECAY_BPS = 9800).
* **Long-Term Projection**: By Year 2, over 60% of the total supply will be circulating or vested to community participants.

## 🛠️ Verification & Transparency

The following public endpoints allow real-time auditing of the token supply on the **Base Mainnet**:

* **Total Supply Check**: `totalSupply()`
* **Circulating Supply**: `getCirculatingSupply()`
* **Burned Tokens**: View via the `usedHashes` mapping for verified execution rewards.