# SYNL Token Distribution (1 Billion Total)

This document serves as the formal specification for the **Synthesis Ledger** tokenomics (aligned with live docs at https://www.synthesisledger.xyz/docs/03_tokenomics).  
The primary objective is a community-first, governed distribution that ensures long-term protocol stability, decentralization, and verifiable alignment.

**Total Fixed Supply**: 1,000,000,000 $SYNL (hard-capped at genesis on Base Mainnet – no further minting possible).

## 📊 Core Allocation Matrix

| Category                  | Allocation | SYNL Amount    | Purpose & Usage                                      | Vesting Schedule                          |
|---------------------------|------------|----------------|------------------------------------------------------|-------------------------------------------|
| **Ecosystem & Rewards**   | 40.0%     | 400,000,000   | SDK rewards, referrals, atomic creation incentives, performance-based payouts | Performance-based Weekly Decay           |
| **Treasury & Liquidity**  | 25.0%     | 250,000,000   | Infrastructure, audit costs, decentralized hosting, initial DEX liquidity & listings | Multi-sig locked                         |
| **Genesis 90 Council**    | 20.0%     | 200,000,000   | Active governance, strike issuance, protocol stewardship | 4-Year Linear / 1-Year Cliff             |
| **Core Team & Advisors**  | 14.9%     | 149,000,000   | Ongoing development and advisory contributions      | 4-Year Linear / 1-Year Cliff             |
| **Founder (Lars Horpestad)** | 0.1%    | 1,000,000     | Long-term skin-in-the-game                           | 4-Year Linear / 1-Year Cliff             |

**Note**: Early Supporters and AI/DeFi Partners allocations from prior V42 drafts have been consolidated into Ecosystem & Treasury/Liquidity for simplicity and decentralization.

## 🔒 Hardened Vesting Schedule
All major pools are governed by smart-contract-enforced vesting to prevent supply shocks.

- **Founder Allocation (0.1%)**: 12-month cliff + 48-month linear unlock post-cliff. Verified via `mintFounderVesting` in `SYNL_Token_V42.sol`.
- **Genesis 90 Council, Core Team & Advisors**: 1-year cliff + 4-year linear.
- **Treasury & Liquidity**: Multi-sig governance control (Genesis 90 Council).
- **Ecosystem & Rewards**: Activity/performance-based releases with weekly decay mechanism.

## 📉 Supply Dynamics & Revenue Notes
- **Exponential Decay Model** for weekly release limits (initial ~30.7M SYNL, 2% weekly reduction) to maintain scarcity.
- **Revenue Redistribution** (separate from initial allocation): For each $0.10 Certified Run fee — 30% Protocol Treasury, 20% Token Buyback, 20% Auditor Rewards, 10% Genesis 90 Council, 20% Development Fund (see live docs for full details).

## 🛠️ Verification & Transparency
- **Token Address**: 0x77c4E6919241d6D36e35626F02336D6d4605bfa4 (Base Mainnet)
- Public endpoints: `totalSupply()`, `getCirculatingSupply()`, burned tokens via `usedHashes` mapping.

This file should be kept in sync with https://www.synthesisledger.xyz/docs/03_tokenomics.
