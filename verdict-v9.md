# verdict-v9 — quilt-jepa round-9 (wave 63, lanes 63-b + 63-b-r)

**Provenance:** registration-v9 sealed pre-run (`84de8046…`, mtime 1790900000000, commit `d5640de`
pushed before any execution; seal re-verified fail-closed at every run startup). Design probe
`receipts/design9.json` receipted PRE-SEAL with 5 fail-closed pipeline identities, ALL TRUE
(I-E9 Jepa4-wd0; I-A9 cured-dose capture-extension on the 2e-4 arm [20000, 75000] bit-exact vs
run7/design8/run8 receipts; I-B9 saturation stage-path identity + control third-switch
disclosure; I-D9 GWIN anchor; I-F9 DIP9 1x-row anchors). The I-B9 identity unavoidably computed
the CONTROL third-switch ratio (`0.7354070016984524`) and I-A9 the cured arm's 75000-checkpoint
|Wc| (`8.691686529662682`) plus both snapshot shas — DISCLOSED in the registration and bound
bit-exact in the run (design9 cross-check 9/9, zero mismatches). No other round-9 claim value was
measured anywhere pre-seal.

**Resume receipt (63-b → 63-b-r):** the prior incarnation sealed and pushed the registration, then
died on a backend result-return deadline mid-run. On-disk audit found the staged first executions
(coreRun5 #1/#2, sha_carried `ff60c211…` == run8 R4 row; coreRun8 #1, round-6/7/8 shas
`7a20e613…`/`30657dbe…`/`34ec241a…` all == run8 R4 row, round-9 layer `c972511d…`) — committed
unchanged as the resume receipt `02c5389`. The prior incarnation's leftover process staged
coreRun8 #2 (metrics sha-certified to the same rows) before dying at a receipt-assembly DEFECT:
the design9 snapshot-sha binding rows referenced coreRun8-internal locals (`arms7`/`m0`) out of
scope, and staging drops snapshot bytes by design (`pack()`) — a ReferenceError that killed both
the prior execution and the first resumed one BEFORE any receipt write. **The 63-b-r repair**
(runner-level only; zero arithmetic, zero gate change, core/ byte-untouched): coreRun8 computes
the three registered snapshot shas from the LIVE snapshots into a side-channel `out6.snap_shas`
(OUTSIDE every metrics layer — the five metric-layer shas are byte-unchanged and still bind the
staged first executions), and the assembly binds them from the snap_shas-carrying execution
FAIL-CLOSED (a snap_shas-less staged coreRun8 #2 is re-executed fresh; its metrics re-bound to
the staged twin at all five R4 layers). The repair is validated by the data: the side-channel
shas reproduced the design9 disclosures bit-exactly (`57b2c76d…` / `6d314586…` / `e53fd67c…`).

Receipt of record: `receipts/run9.json` (chain tip `cd7a842e…`, independently re-derived from
GENESIS). Determinism: the receipt was reproduced **BYTE-IDENTICAL** (sha256 `bc411f66…`) by an
independent fresh full execution (all four stages re-executed from scratch) — the nine-round
crown closes end-to-end.

## Scorecard: 22/25 — CURE9 and DIP9 are honest FAILs on pre-priced branches; SAT9 PASS

| Claim | Verdict | Measured |
|---|---|---|
| G learning-sanity (carried) | PASS | 0.34923 (== run4 pin) |
| L2 difficulty meter (carried) | PASS | hard 4.2848e-4 > trivial 2.6970e-4 |
| R1 hard-world learning (carried) | PASS | 0.16931 (== run4 pin) |
| R2v4 pace-aware EMA (carried) | PASS | drift 2.640e-3 < 0.01 |
| R3v4 percentile-z surprise (carried) | PASS | z-conc 3.5407 > 3.0 |
| R3L ladder saturation (carried) | PASS | amp 1.2 == amp 0.9 bit-exact (lever closed) |
| R2x K4 cross-pace (carried) | PASS | drift 4.429e-3 @0.15 / 1.761e-3 @0.5, same K4 |
| RHOR finite horizon (carried) | PASS | D=30174, slow 1.938e-5 → runaway 7.290e-2 (3761×) |
| RLONG longevity law (carried) | PASS | main dose D=null exec=5e5 (censor floor 16.5706×), wd1e-4 D=48091, guards unrelaxed (g 0.3508 / r1 0.1708 / drift 2.617e-3) — bit-exact vs design6/run6/run7/run8 |
| R3D depth/window law (carried) | PASS | anchored 3.5407@400 / 2.2614@1200 / 3.4082@2000 / 3.1927@2200, multiplier exactly 1 at the anchor |
| GWIN g-window law (carried) | PASS | g 0.3041@0.15(W200) / 0.4341@0.5(W60), anchor bit-exact |
| RLONG7 dose-response (carried) | PASS | 7-dose rate curve strictly monotone; bracket wd* in (1.5e-4, 2e-4) re-bound bit-exact |
| PLAST plasticity cost (carried) | PASS | 0.6644@20k / 0.5958@100k / 0.5864@500k (decayed), 0.7135@20k (control), rho20 = 0.9312 — bit-exact vs run7 |
| R3DxR3L composition (carried) | PASS | plateau extends to ALL depth sites bit-exact; anchored 3.0 restoration survives |
| GWIN7 full grid (carried) | PASS | 0.3041@0.15 / 0.2537@0.2 / 0.3506@0.25 / 0.3492@0.3 / 0.4033@0.4 / 0.4341@0.5 / 0.4271@0.6 |
| MECH plasticity-advantage mechanism (carried) | **FAIL** (honest round-8 carry, re-scored under the UNCHANGED rule) | leg 1 (ordering) HELD — Spearman = 1.0; leg 2 (compounding) still on its pre-priced SATURATION branch: rho20_2 = 0.955014 ∈ [rho20_1 = 0.931166, 1) — a one-time re-balancing, not a compounding asset |
| GWIN8 low-pace extension + dip law (carried) | PASS | g(0.1, W300) = 0.27634 < 0.5; dip is a LOCAL MINIMUM (0.27634 > g(0.2) = 0.25370); dip magnitude 0.073635 ≥ 0.05 — anchors bit-exact |
| REDOSE main-dose re-registration decision (carried) | PASS | rate(2e-4) = −3.778708210171146e-6 re-bound bit-exact < 0; D = 85387 ≥ 60348; guards UNRELAXED (g 0.35028 / r1 0.17031 / drift 2.617e-3) — bit-exact vs run8 |
| OVERDECAY over-decay plasticity (carried) | PASS | 0.570098@20k / 0.508588@100k, both < 1.0; 0.570098 ≤ 0.664411 — no reversal; arm bit-exact vs design6 |
| **CURE9 cured-dose re-registration** | **FAIL** | **15 of 16 checks pass — the arm is re-bound bit-exact everywhere (rate −3.778708210171146e-6, D 85387 == exec, D-ratio 2.8298203751574205 ∈ [2.5, 3.2], guards bit-exact vs run8, 20k ratio 0.6841500024733943 bit-exact with rho20_cured_20k = 0.958830 < 1, both 75k probes ENGAGE (0.550745 / 0.598006 < 1.0), wc75 capture validation 8.691686529662682 bit-exact == the design9 I-A9 disclosure, wc75 composition 8.6917 > 6.4436 consistent) — but the DOSE-ORDERING leg REVERSES at 75k: ratio(2e-4, 75000) = 0.5507446127932 < ratio(3e-4, 75000) = 0.5980059011717661. The registered ordering-reversal branch fired — see below.** |
| **SAT9 saturation successor** | **PASS** | 13/13 checks. Third switch (fresh World2(seedC = 2856986428) from the END state of the registered second switch, no weight reset): ratio3(3e-4) = **0.7025685901201354** (first10 7.879e-4 → last10 5.535e-4), ratio3(wd0) = **0.7354070016984524** (bit-exact == the design9 disclosure). The CONCAVE-SATURATION curve held: **rho20_3 = 0.9553466155442152 ∈ [rho20_2 = 0.955013877487518, 1.0)** with inc3 = **0.0003327380566972016** ≤ inc2 = 0.0238479387466166 — the advantage PERSISTS without growing and the increment COLLAPSED (71× smaller): the curve has gone FLAT, not convex. Composition persists: end-of-stage-2 |Wc| decayed 9.4674 < control 17.6931; end-of-stage-3 9.3807 < 17.6794. All stage bindings bit-exact (stage-1/2 ratios == the receipted first/second-switch values on BOTH arms; end1 shas == run8's r8_end_weights_sha_decayed/control). |
| **DIP9 dip-law shape** | **FAIL** | **The lr-0.2 dip is WINDOW-FRAGILE — 4 of 13 checks fail.** At 0.5x (W {100, 75, 60}): g = 0.56927 / **0.60448** / 0.61882 — the site is no longer below its left neighbor (the curve is monotone rising through it): local-min fails low-side. At 2x (W {400, 300, 240}): g = 0.13808 / **0.16207** / 0.14798 — the site becomes a local MAX (both neighbors below): local-min fails BOTH sides. dipmag(0.5x) = **−0.010440** ≤ dipmag(1x) = 0.073635 ✓ but dipmag(2x) = **−0.019046** < 0.073635 ✗ (both neighbor scalings have NEGATIVE dip magnitude — the dip does not exist outside the registered window). The registered 1x anchors re-bind bit-exact (0.253695 == run7, 0.304100 == design6, 0.350561 == run7, dipmag_1x == run8's 0.0736349882819407) and the RECOVERY legs hold (g(0.2): 0.60448@W75 > 0.25370@W150 > 0.16207@W300 — monotone in window depth). |
| R4 determinism crown (round-9 form) | PASS | two full executions byte-identical at ALL FIVE metric layers (round-9 sha `c972511d…` on both twins, composite sha equal) AND run4 **29/29** + run5 **92/92** + design5-pairs **63/63** + design6 **101/101** + run6 **105/105** + run6-carried **92/92** + design7 **2/2** + run7-carried **92/92** + run7-round6 **105/105** + run7-round7 **87/87** + run8-carried **92/92** + run8-round6 **105/105** + run8-round7 **87/87** + run8-round8 **71/71** + design8-disclosed **3/3** + design9-disclosed **9/9** — **ZERO mismatches**; SHA-LEVEL chain bound to run8.json's R4 row (ff60c211… / 7a20e613… / 30657dbe… / 34ec241a…); receipt reproduced **BYTE-IDENTICAL** (sha256 bc411f66…) by an independent fresh full execution — **probe==run==twin==r4==r5==r6==r7==r8==r9, the chain now NINE rounds deep** |
| R5 mesh conservation (carried) | PASS | drift 9.468e-9 ≤ 1e-6 rel, variance non-increasing |
| R6v4 impact-sensitive no-repair (carried) | PASS | corr 0.6343 > 0.3, jump 2.755 > 1.5, sha-invariant, recheck delta 0 |

## The round-8-priced questions, answered

1. **Does wd 2e-4 confirm as the plasticity main dose (the cured dose) for round 10?**
   **THE DOSE DECISION IS DEFERRED — the registered ordering-reversal branch fired.** The 2e-4
   arm reproduced every round-7/8 receipt bit-exactly from the fresh execution (the dose-selection
   re-bind is clean), and the plasticity advantage held at its own dose at BOTH depths: 20k ratio
   0.6841500024733943 (bit-exact vs run8's dose grid; rho20_cured_20k = 0.958830 < 1) and 75k
   ratio 0.550745 < 1.0 (learning ENGAGES from the cured dose's deepest finite state). The
   |Wc|-room composition also stayed consistent (wc75(2e-4) = 8.6917 > wc75(3e-4) = 6.4436 — the
   milder cure keeps the larger weights). What failed is the **ordering law at depth**: at the
   shared 20k depth the round-8 grid ordered milder-cure-faster-re-adaptation perfectly
   (Spearman 1.0, smaller |Wc| ⇒ smaller ratio); at 75k the cured side INVERTS — the 2e-4 arm
   (larger |Wc| = 8.69) re-adapts FASTER than the 3e-4 arm (smaller |Wc| = 6.44): 0.5507 < 0.5980.
   Per the registered FAIL branch: the |Wc|-room law is DEPTH-FRAGILE on the cured side — the
   mechanism needs re-pricing and the dose decision is deferred to round 10 with the reversal as
   the priced question. **The two-dose regime is NOT confirmed as the round-10 operating point;
   wd 3e-4 remains the longevity main dose (unchanged — the only receipted dose whose two-phase
   is eliminated within the 5e5 window); the 2e-4 candidate is neither confirmed nor demoted.**
2. **What happens to the plasticity advantage on a THIRD switch — washout, compounding, or a
   stable level?** A stable level — the pre-registered CONCAVE-SATURATION branch held at its
   interior: rho20_3 = 0.955347 ∈ [rho20_2 = 0.955014, 1.0). Neither priced failure branch fired:
   no washout (the advantage persists, rho20_3 < 1), no compounding resumption (rho20_3 ≥
   rho20_2), and the increment did not expand — it COLLAPSED from 0.023848 to 0.000333 (71×
   smaller). The saturation curve is FLAT: whatever re-balancing the cure buys is bought once
   (switch 1) and then HELD through switches 2 and 3 essentially unchanged. The mechanism leg
   corroborates: the decayed arm's contracted-|Wc| room persists through both switches (end-2
   9.4674 vs control 17.6931; end-3 9.3807 vs 17.6794). The control re-adapting within the third
   window (0.7354, unlike its second-switch 1.1800) is exactly the disclosed pre-seal fact.
3. **Does the lr-0.2 dip's local-minimum shape survive at neighboring W scalings?** **NO — the
   dip is a property of the registered window, not of the pace grid.** At 0.5x contraction the
   whole grid shifts UP (0.569/0.604/0.619 — shallower windows adapt less) and the site stops
   being a local minimum (its left neighbor is lower); at 2x expansion the whole grid shifts DOWN
   (0.138/0.162/0.148 — deeper windows adapt more) and the site becomes a local maximum. The
   registered 0.05 dip-law gate does NOT survive at either scaling (dipmags −0.0104/−0.0190 — the
   receipted gate-nothing finding, now answered). What DOES generalize is the monotone RECOVERY
   at the dip site along W (0.6045 → 0.2537 → 0.1621): the site's adaptation decreases
   monotonically with window depth. The registered FAIL branch fired verbatim: the dip law's
   shape claim NARROWS to the registered W(lr) window and the law gains W-domain boundaries on
   BOTH sides (below W150 the site is not a minimum; above W150 the site is a maximum).

## Honest notes of record

- **CURE9 and DIP9 are the round's honest FAILs** — each on a branch priced in the registration
  BEFORE the run (ordering-reversal → decision deferred; window-fragile → shape narrows to the
  registered W). No threshold surgery anywhere; the SAT9 prediction was scored against its
  registered band with the decayed leg first measured inside run9.
- The dose probes (75k switch continuations on both arms), the third-switch probes (both arms),
  and the six window-scaled g points are NEW measurements; every receipted anchor reproduced
  bit-exactly inside the same executions that measured them (run4 29/29, run5 92/92, design6 AND
  run6 AND run7 AND run8 at all four metric layers, design8 3/3, design9 9/9).
- Runner-level changes this round: the prior incarnation's staged additions (captureAt extensions
  on the 2e-4 and 3e-4 arms — design9 I-A9 identity class; trivialSwitchProbe3 with per-stage
  end-weight capture — design9 I-B9 stage-1/2 arithmetic identity re-bound on both arms; six
  DIP9 gGateFlex points — 1x row receipted via design9 I-F9) plus the **63-b-r receipt-assembly
  repair** disclosed in the header (`resume_repair`) and above: a side-channel carrying the three
  registered design9 snapshot shas out of coreRun8 (where the live snapshots exist) to the
  fail-closed binding site. Zero arithmetic, zero gate constants, core/ byte-untouched; the five
  metric-layer shas are unchanged and still bind the pre-repair staged executions — the repair's
  side-channel values were then proven bit-exact against the design9 disclosures by the run.
- The resume chain, honestly: audit found staging with coreRun5 #1/#2 + coreRun8 #1; by commit
  time the prior incarnation's leftover process had added coreRun8 #2 (the committed receipt
  `02c5389` therefore carries all four pre-repair stages — its commit message says three, the
  file has four, sha256 `5c2e3661…` matches the committed bytes; disclosed here rather than
  rewritten). The leftover process then died at the assembly defect; no partial receipt was ever
  written by any incarnation. The receipt of record assembled with coreRun5 #1/#2 + coreRun8 #1
  from the staged pre-repair executions and coreRun8 #2 executed fresh under the repaired runner
  (bound to the staged twin at all five metric layers by R4), then reproduced BYTE-IDENTICAL by a
  fully fresh execution — the staged-resume law exercised end-to-end again.
- Spend: $0 external — the entire round is local deterministic compute (two full executions of
  the round-4..9 pipeline plus the reproduction, ~6 minutes total).
- Round-10 agenda priced by this receipt: (1) the DOSE DECISION — re-price the |Wc|-room
  mechanism for depth (why does the 2e-4 arm's larger-|Wc| state re-adapt faster at 75k? measure
  the ordering across a depth ladder, not a single shared depth) and re-run the dose-selection
  registration with the reversal as the priced question; (2) the saturation plateau — the curve
  is flat at rho20 ≈ 0.955: does it hold at a fourth switch, and does the plateau survive a
  DIFFERENT probe world (the trivial-world switch readout is the only one so far); (3) the dip
  law's W-domain — map the boundary between W75 and W150 (and W240 and W300) to locate where the
  local-minimum shape is born and dies.

## M8 coverage pointer

The round-9 row of the archive-coverage registry is folded by the registered v3 successor
instrument: `registration-coverage-v3.json` + `receipts/coverage-v3.json` (rounds 4–9, claims
sealed per round [8, 11, 14, 18, 22, 25], cumulative 98, receipts-level cells extended with the
round-9 measurements) — per the v2 instrument's own upgrade rule ("may upgrade the metric by
registering the upgrade, never by editing this one"); the v1 and v2 instruments and receipts are
byte-untouched history.

*Every number above is read from `receipts/run9.json` (chain tip cd7a842e…), not re-measured.*
