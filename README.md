# Synthesis Genesis v2.0: The Immune System

This repository contains the Sovereign Logic Ledger for the Synthesis ecosystem. Unlike static registries, Genesis v2.0 treats logic as a living, decaying asset that must be defended through weekly forensic audits.

## 🏛️ The Protocol Rules
- **Survival Floor**: Any logic falling below **7800 BPS** is considered "At Risk."
- **3-Strike Rule**: Three consecutive audits below the floor trigger **Obsolescence**, disabling the recipe.
- **Forensic Auditing**: Every BPS update requires a `bytes32` hash of a Grok-3 forensic debate, ensuring transparency.
- **Maintenance Tax**: Logic makers must maintain their assets or face siphoning.

## 📂 Directory Structure
- `/contracts`: GenesisV2 Solidity source code.
- `/scripts`: Deployment and audit maintenance tools.
- `migration_manifest.json`: The forensic BPS data for the 38 Genesis Atomics.
- `migration_audit_logs.txt`: The human-readable justification for every score.

## ⚖️ Audit Standard
Audits utilize **Forensic Variance math**:
`10000 - [Adversarial Penalties] - [Seed-Based Entropy Offset]`
This ensures no logic is "perfect" and every score is unique to the logic's CID.