# verdict-v8 — quilt-jepa round-8 (wave 62, lane 62-a)

**Provenance:** registration-v8 sealed pre-run (`260c01ba…`, mtime 1790682000000, commit `b5bc818`
pushed before any execution; the sealed registration, probe8.mjs and its receipt were found
on-disk from the lane's prior incarnation, seal re-verified bit-intact (masked sha + mtime), and
committed unchanged — resume-first, compose-don't-clobber). Design probe `receipts/design8.json`
receipted PRE-SEAL with 5 fail-closed pipeline identities, ALL TRUE (I-E Jepa4-wd0; I-A
capture-extension on the wd0 anchor; I-B the 2e-4 registered-prefix rate; I-C second-switch
determinism + stage-1 arithmetic identity to the carried probe; I-D GWIN anchor). The I-C identity
unavoidably computed the CONTROL second-switch ratio (`1.17997507686084`) and first-switch ratio
(`0.7135257300287862`) — DISCLOSED in the registration and bound bit-exact in the run (design8
cross-check 3/3, zero mismatches). No other round-8 claim value was measured anywhere pre-seal.
Infra receipt: the sandbox kills long executions (kill, not OOM); the four full executions were
staged to disk on completion and resumed across relaunches (this lane exercised the path: an
execution killed after coreRun5 #1 staged was resumed byte-exactly — the R4 twin shas bind the
resumed execution to its fresh twin). No claim arithmetic, gate, or execution count was touched.
Receipt of record: `receipts/run8.json` (chain tip `c37d617c…`).

## Scorecard: 21/22 — MECH is an HONEST FAIL on its pre-priced saturation branch

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
| RLONG longevity law (carried) | PASS | main dose D=null exec=5e5 (censor floor 16.5706×), wd1e-4 D=48091, guards unrelaxed (g 0.3508 / r1 0.1708 / drift 2.61e-3) — bit-exact vs design6/run6/run7 |
| R3D depth/window law (carried) | PASS | anchored 3.5407@400 / 2.2614@1200 / 3.4082@2000 / 3.1927@2200, multiplier exactly 1 at the anchor |
| GWIN g-window law (carried) | PASS | g 0.3041@0.15(W200) / 0.4341@0.5(W60), anchor bit-exact |
| RLONG7 dose-response (carried) | PASS | 7-dose rate curve strictly monotone; bracket wd* in (1.5e-4, 2e-4) re-bound bit-exact |
| PLAST plasticity cost (carried) | PASS | 0.6644@20k / 0.5958@100k / 0.5864@500k (decayed), 0.7135@20k (control), rho20 = 0.9312 — bit-exact vs run7 |
| R3DxR3L composition (carried) | PASS | plateau extends to ALL depth sites bit-exact; anchored 3.0 restoration survives |
| GWIN7 full grid (carried) | PASS | 0.3041@0.15 / 0.2537@0.2 / 0.3506@0.25 / 0.3492@0.3 / 0.4033@0.4 / 0.4341@0.5 / 0.4271@0.6 |
| **MECH plasticity-advantage mechanism** | **FAIL** | **leg 1 (ordering) HELD — Spearman = 1.0; leg 2 (compounding) FAILED on the pre-priced SATURATION branch: rho20_2 = 0.955014 ∈ [rho20_1 = 0.931166, 1). Sealed FAIL verbatim — see below.** |
| **GWIN8 low-pace extension + dip law** | **PASS** | g(0.1, W300) = **0.27634** < 0.5 (law extends); g(0.1) > g(0.2) = 0.25370 (**the lr-0.2 dip is a LOCAL MINIMUM**); dip magnitude (g(0.15)+g(0.25))/2 − g(0.2) = **0.073635 ≥ 0.05** — the declared re-scoring leg binds; anchors bit-exact (0.15 == design6, 0.2/0.25 == run7) |
| **REDOSE main-dose re-registration decision** | **PASS** | rate(2e-4) = **−3.778708210171146e-6** re-bound bit-exact < 0; D(2e-4) = **85387** = 2.83× D_wd0 ≥ 60348 (the round-6 factor gate, verbatim constant); guards UNRELAXED at 2e-4: g = 0.35028 < 0.5, r1 = 0.17031 < 0.5, drift = 2.617e-3 < 0.01; guards at 2.5e-4 receipted gate-nothing (g 0.35054 / r1 0.17056 / drift 2.612e-3) |
| **OVERDECAY over-decay plasticity** | **PASS** | ratio(1e-3, 20k) = **0.570098** < 1.0 and ratio(1e-3, 100k) = **0.508588** < 1.0 — learning engages from heavily over-decayed states; 0.570098 ≤ 0.664411 — **the advantage does NOT reverse at 3.3× the main dose (it GROWS)**; arm re-bound bit-exact (D=null, exec=100000, slow −2.889e-5/step == design6); capture path validated: snapshot |Wc| 6.3936@20k / 2.7082@100k == the design6 receipted checkpoint norms bit-exactly |
| R4 determinism crown (round-8 form) | PASS | two full executions byte-identical at ALL FOUR metric layers (carried sha ==, round-6 sha ==, round-7 sha ==, **round-8 sha == 34ec241a…**, composite sha ==) AND run4 **29/29** + run5 **92/92** + design5-pairs **63/63** + design6 **101/101** + run6 **105/105** + run6-carried **92/92** + design7 **2/2** + run7-carried **92/92** + run7-round6 **105/105** + run7-round7 **87/87** + design8-disclosed **3/3** — **ZERO mismatches**; **SHA-LEVEL chain bound: this run's carried/round-6/round-7 shas == run7.json's R4 row shas (ff60c211… / 7a20e613… / 30657dbe…)** — probe==run==twin==r4==r5==r6==r7==r8, the chain now EIGHT rounds deep |
| R5 mesh conservation (carried) | PASS | drift ≤1e-6 rel, variance non-increasing |
| R6v4 impact-sensitive no-repair (carried) | PASS | corr/jump/sha-invariant/recheck as registered |

## The round-7-priced questions, answered

1. **Does the plasticity advantage compound on a second world switch, or saturate?** It
   **SATURATES** — the registered FAIL branch, priced in advance in registration-v8 P-MECH, is the
   one that fired. On a second switch (fresh World2 at the derived seedB = 1657638767 from its own
   t=0, entered from the END state of the registered first switch, no weight reset): the decayed
   3e-4 arm's second-switch ratio measures 1.1268925734915027 (first10 5.879e-4 → last10 6.625e-4)
   and the control's 1.1799750768608399 (bit-exact == the design8 I-C disclosed value). Both arms'
   windows END HIGHER than they started (neither re-adapts below its first-10 loss on the second
   switch — the fresh world's transient is not re-learned away within 400 steps), but the decayed
   arm stays relatively better: **rho20_2 = 0.955014 < 1.0 (the advantage PERSISTS) but ≥ rho20_1 =
   0.931166 (it does not GROW)**. The registered gate required rho20_2 < rho20_1 AND ratio2(3e-4) <
   1.0; both failed; the honest finding of record is that **the cure's plasticity benefit is a
   one-time re-balancing, not a compounding asset**. Sealed FAIL verbatim; no threshold surgery.
2. **What ORDERS the advantage across doses?** The |Wc|-room hypothesis HELD on its own leg, and
   at the ceiling of its gate: **Spearman rank correlation between the trivial-world switch ratio
   at the shared 20k depth and the end-of-decay |Wc| across the seven-dose grid = 1.0** (perfect
   rank ordering, gate ≥ 0.75). The full dose table: ratios 0.71353 (wd0) / 0.70172 (1e-4) /
   0.69327 (1.5e-4) / 0.68415 (2e-4) / 0.67441 (2.5e-4) / 0.66441 (3e-4) / **0.57010 (1e-3)**
   against wc_norm@20k 17.808 / 13.406 / 12.104 / 11.130 / 10.374 / 9.770 / 6.394 — smaller
   end-of-decay |Wc| ⇒ faster re-adaptation, monotonically, with the strongest contraction (1e-3)
   the best re-adapter on the grid. The mechanism leg-1 is a measured law; leg-2 says its benefit
   does not compound.
3. **Does the window law extend to the unexplored low-pace region, and is the lr-0.2 dip a
   minimum?** Yes and yes: g(0.1, W = round(30/0.1) = 300, tau from the carried K4 law) = 0.27634
   < 0.5, and 0.27634 > g(0.2) = 0.25370 — the receipted dip is a LOCAL MINIMUM of the pace grid
   (the curve falls 0.3041 → 0.2537 into 0.2 and rises 0.2537 → 0.2763 out of it on the low side,
   then 0.3506 → 0.3492 → 0.4033 → 0.4341 → 0.4271 on the high side). The declared re-scoring leg
   pins the non-monotonicity as a registered law: deviation from monotone interpolation =
   0.073635 ≥ 0.05.
4. **Is wd 2e-4 the new main dose?** It is re-registered as the **plasticity-optimal cured-dose
   CANDIDATE for round 9's dose-selection registration** — cure engaged (rate < 0, re-bound
   bit-exact), lifetime 2.83× the undecayed D (inside the round-6 registered 2–10× band, verbatim
   constant 60348), guards UNRELAXED at 2e-4 with the round-6 gate constants only — **while wd 3e-4
   REMAINS the longevity main dose**: the registered disclosure stands (the two-phase law PERSISTS
   at 2e-4, runaway 0.070140 at D = 85387; 3e-4 is the only receipted dose whose two-phase is
   eliminated within the 5e5 window). This is exactly the registered decision rule — no new
   thresholds.
5. **Does over-decay eventually pay — or turn toxic?** Neither failure branch fired: learning
   engages from BOTH over-decayed states (0.5701@20k, 0.5086@100k, both < 1.0) and the advantage
   does not reverse (0.5701 ≤ 0.6644). Over-decay is not toxic at 1e-3 — and on this readout the
   plasticity dose-response is monotone through the whole tested grid, 3.3× past the main dose.

## M8 / M11 resolution pointer

The wave-61 instruments (commit `4ed0527`) resolve here: the M8 archive-coverage field for rounds
4–7 is `receipts/coverage-v1.json` (cited per COV1's rule); the registered successor
`receipts/coverage-v2.json` (rounds 4–8, receipts-level cells) and the sealed M11 tag resolution
are `registration-coverage-v2.json` + `resolution-m8-m11.json` — see those sealed documents for
the per-round coverage actuals and the four round-8 items' tag resolutions (MECH FAIL / GWIN8
PASS / REDOSE PASS / OVERDECAY PASS — all four resolved definitively).

## Honest notes of record

- **MECH is the round's honest FAIL**: 11 of its 13 registered checks passed (including all three
  run7 bit-exact bindings, the bit-exact probe2 stage-1 on both paths, and the bit-exact control
  second-switch leg); the two compounding gates failed exactly as the saturation branch predicted
  they would if the advantage were one-time. The FAIL branch was priced BEFORE the run; the
  verdict is the branch's registered interpretation, verbatim.
- The dose probes (1.5e-4 / 2e-4 / 2.5e-4 / 1e-3) and the second-switch probes are NEW
  measurements; the three receipted dose ratios reproduced run7 BIT-EXACTLY inside the same
  execution that measured the new four.
- Runner-level additions only: trivialSwitchProbe2 (stage-1 arithmetic identity to the carried
  probe, proven BIT-EXACT in design8 I-C and re-proven in-run on both paths), read-only
  captureAt extensions (design8 I-A identity class; every carried/round-6/round-7 metric
  re-bound bit-exact, which would have caught any perturbation), and a Spearman helper (average
  ranks on ties). core/ byte-untouched; no gate constant changed anywhere.
- One execution was killed by the lane itself during startup smoke (timeout after coreRun5 #1
  staged) and was RESUMED from disk staging by the final run; the resumed execution's shas are
  bound to its fresh twin by R4 — the resume-first law exercised end-to-end this round.
- Round-9 agenda priced by this receipt: the dose-selection registration (2e-4 candidate vs 3e-4
  main dose, per the REDOSE decision of record); the re-balancing mechanism behind saturation
  (what does the SECOND switch pay that the first did not — the Wt/Wc composition after one
  re-adaptation); and whether the lr-0.2 dip's local-minimum shape survives the 0.05 dip-law gate
  at neighboring W scalings.

*Every number above is read from `receipts/run8.json` (chain tip c37d617c…), not re-measured.*
