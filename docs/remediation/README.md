# Dear Tomorrow remediation tracker

Updated 28 November 2026. The original audit is preserved verbatim at [1fa2c6f](https://github.com/3eebu/DearTomorrow/tree/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit). This tracker records later work separately. Severity refers to the original audit.

| Finding | Original priority | Status | Subject |
|---|---|---|---|
| DT-QA-01 | P1 | [Resolved in Phase 1](PHASE_1.md#dt-qa-01) | Cloud photo and workspace storage disclosures |
| DT-QA-02 | P1 | Open | Text contrast |
| DT-QA-03 | P2 | Open | Montage replay accessible name |
| DT-QA-04 | P2 | Open | Mobile navigation continuity |
| DT-QA-05 | P2 | [Resolved in Phase 1](PHASE_1.md#dt-qa-05) | Guest persistence and backup guidance |
| DT-QA-06 | P2 | Open | Landscape and personal Tree distinction |
| DT-QA-07 | P2 | [Implemented and profiled in development](PHASE_3.md#dt-qa-07) | Cloud library scaling |
| DT-QA-08 | P1 | [Open · protected HTTPS required](PHASE_3.md#dt-qa-08) | Large transfers and recovery over hosted HTTPS |
| DT-QA-09 | P1 | [Open · actual inbox and Google consent required](PHASE_3.md#dt-qa-09) | Actual email and Google on the release origin |
| DT-QA-10 | P1 | [Isolated drill passed. Provider restore and alert receipt pending external verification](PHASE_4.md#dt-qa-10) | Recovery, retention and incident response |
| DT-QA-11 | P1 | [Draft screens implemented. Founder and legal review pending](PHASE_4.md#dt-qa-11) | Public privacy and service information |
| DT-QA-12 | P2 | [Race mitigation and isolated retention checks passed. Hosted retention pending](PHASE_4.md#dt-qa-12) | Unused attachment retention |
| DT-QA-13 | P2 | Open | WebKit navigation errors |
| DT-QA-14 | P2 | Open | Frame pacing during book turns |
| DT-QA-15 | P2 | [Resolved in Phase 1](PHASE_1.md#dt-qa-15) | Operational source of truth |
| DT-QA-16 | P2 | [Implemented · real Google closure pending](PHASE_3.md#dt-qa-16) | OAuth-only account closure |
| DT-QA-17 | P2 | Open | Founder audio parity |
| DT-QA-18 | Frozen | Frozen | Billing and proactive third-party delivery |
| DT-QA-19 | Frozen | Frozen | GPU landscape replacement |
| DT-QA-20 | P2 | Open | Production font delivery |

Phase 1 and Phase 3 used isolated production builds and the designated development backend. Phase 4 used a separate local restore target. Protected staging has its own revision. [Development status](../PROGRESS.md) · [Phase 1 evidence and screenshots](PHASE_1.md) · [Phase 3 evidence](PHASE_3.md) · [Phase 4 evidence](PHASE_4.md) · [Recovery and incident runbook](PHASE_4_OPERATIONS.md)
