# verdict-v10 — quilt-jepa round-10 (wave 64, lane 64-b-r3)

**Provenance:** registration-v10 sealed pre-run (`4802bc85…`, mtime 1791100000000, commit `aee0335`
pushed before any execution; seal re-verified fail-closed at the run's startup — recorded in the
receipt's `seal_verified_at_startup`). Design probe `receipts/design10.json` receipted PRE-SEAL
with 6 fail-closed pipeline identities, ALL TRUE (I-E10 Jepa4-wd0; I-A10a cure-arm
capture-extension over the ladder — D 85387/rate/wc400/20000/75000 bit-exact vs
run7/run8/run9, snapshot norms == own ckpts at all five depths; I-A10b main-arm capture-extension
— D null/exec 5e5/design6 norms bit-exact at all seven depths; I-B10 fourth-switch stage-path —
control stage-1/2/3 + end shas/norms bit-exact vs run7/run8/run9/design9, both cascades
bit-identical cross-execution; I-C10 the twelve receipted DIP anchors; I-D10 GWIN anchor). The
I-A10a/I-A10b identities unavoidably computed the cure arm's interior |Wc| (30k/40k/50k:
`10.284571782125024` / `9.687502951781555` / `9.25800362624802`), the main arm's interior |Wc|
(`8.803594735118917` / `8.107602218267036` / `7.5690166212299825`, design6 re-binds), the control
D-cascade fourth-switch ratio (`0.976422859819224`) and the control E-cascade stages
(`0.7339388216462988` / `1.1899577897104565` / `0.7320487218963793` / `0.9776795481211076`) —
DISCLOSED in the registration and bound bit-exact in the run. NO other round-10 claim value was
measured anywhere pre-seal: no decayed fourth-switch leg, no rho20_4 / rho20_4^E, no interior
ladder switch ratio, no DIP10 scan point.

**Resume receipt (64-b → 64-b-r → 64-b-r2 → 64-b-r3), the honest chain:** 64-b sealed and pushed
the registration, then died before executing. The two incarnations that followed (64-b-r,
64-b-r2) each completed the round's execution work and each died on a backend result-return
deadline BEFORE returning it — the run itself is DONE. This lane (64-b-r3) is a mechanical
finish: audit, score, seal — nothing re-executed. On-disk audit findings, disclosed verbatim:

- **The defect receipt** `receipts/.run10-defect-misnamed-run9.json`: a structurally incomplete
  receipt assembly — a run-receipt-**v9**-schema skeleton (no `round10_constants`, no
  `metrics_round10`) carrying the round-10 verdict block. Internally chain-consistent to its own
  tip `04fca264…`; its R4 row lacks the round-10 twin shas and the run9 cross-check columns that
  the receipt of record has. It is the misnamed-run9 assembly artifact of a prior incarnation,
  preserved renamed (dot-file) as the receipted defect — never the receipt of record.
- **The staging receipt** `receipts/.run10-staging.json`: present at session open (its coreRun5 #1
  stage carries g_ratio `0.34923244770336087`, the carried pin), then **consumed by the runner's
  own registered cleanup** at receipt-of-record write time (`run10.mjs`:
  `fs.rmSync(STAGING)` — "receipt of record written — staging consumed"). Its content is
  disclosed in the R4 layer it fed: the staged twin executions are bound bit-exact into the
  receipt of record. It therefore cannot be committed — consumed-by-design, disclosed here
  rather than reconstructed.

Receipt of record: `receipts/run10.json` (file sha256 `13947bd5…`; chain tip `cca59bd5…`,
**independently re-derived from GENESIS at audit time** — every row's hash recomputed, tip
matches; verdict fields internally consistent: 28 verdict keys, 22 true, `claims_passed` 22/28).
The final assembly completed at audit open (mtime 02:03:01): the leftover process from 64-b-r2
finished writing the receipt of record as this lane began. Determinism: two FULL round-10
executions byte-identical — `sha_round10_run1 == sha_round10_run2 == 8a3daa00…` (the R4 row).
**No re-execution was performed by 64-b-r3** — the receipt was structurally complete and
chain-verified, so the deterministic work was taken as receipted.

## Scorecard: 22/28 — DOSE10, SAT10, DIP10 are honest FAILs on pre-priced branches; all 25 carried claims re-bind bit-exact

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
| RLONG longevity law (carried) | PASS | main dose D=null exec=5e5 (censor floor 16.5706×), wd1e-4 D=48091, guards unrelaxed — bit-exact vs design6/run6/run7/run8/run9 |
| R3D depth/window law (carried) | PASS | anchored 3.5407@400 / 2.2614@1200 / 3.4082@2000 / 3.1927@2200, multiplier exactly 1 at the anchor |
| GWIN g-window law (carried) | PASS | g 0.3041@0.15(W200) / 0.4341@0.5(W60), anchor bit-exact |
| RLONG7 dose-response (carried) | PASS | 7-dose rate curve strictly monotone; bracket wd* in (1.5e-4, 2e-4) re-bound bit-exact |
| PLAST plasticity cost (carried) | PASS | 0.6644@20k / 0.5958@100k / 0.5864@500k (decayed), 0.7135@20k (control), rho20 = 0.9312 — bit-exact vs run7/run9 |
| R3DxR3L composition (carried) | PASS | plateau extends to ALL depth sites bit-exact; anchored 3.0 restoration survives |
| GWIN7 full grid (carried) | PASS | 0.3041@0.15 / 0.2537@0.2 / 0.3506@0.25 / 0.3492@0.3 / 0.4033@0.4 / 0.4341@0.5 / 0.4271@0.6 |
| MECH plasticity-advantage mechanism (carried) | **FAIL** (honest round-8 carry, re-scored under the UNCHANGED rule) | leg 1 (ordering) HELD at 20k — Spearman 1.0; leg 2 (compounding) still on its pre-priced SATURATION branch; round 10 deepens the refutation — see DOSE10 |
| GWIN8 low-pace extension + dip law (carried) | PASS | g(0.1, W300) = 0.27634 < 0.5; dip is a LOCAL MINIMUM (0.27634 > g(0.2) = 0.25370); dip magnitude 0.073635 ≥ 0.05 — anchors bit-exact |
| REDOSE main-dose re-registration (carried) | PASS | rate(2e-4) = −3.778708210171146e-6 re-bound bit-exact < 0; D = 85387 ≥ 60348; guards UNRELAXED — bit-exact vs run8/run9 |
| OVERDECAY over-decay plasticity (carried) | PASS | 0.570098@20k / 0.508588@100k, both < 1.0; 0.570098 ≤ 0.664411 — no reversal; arm bit-exact vs design6 |
| CURE9 cured-dose re-registration (carried) | **FAIL** (honest round-9 carry, re-scored under the UNCHANGED rule) | the 75k ordering-reversal stands as receipted: ratio(2e-4, 75000) = 0.5507446127932 < ratio(3e-4, 75000) = 0.5980059011717661 despite the larger |Wc| 8.691686529662682 vs 6.443616949719879 — re-bound bit-exact by run10 |
| SAT9 saturation successor (carried) | PASS (re-binds) | rho20_3 = 0.9553466155442152 ∈ [rho20_2 = 0.955013877487518, 1), inc3 = 0.0003327380566972016; third-switch 0.7025685901201354 / 0.7354070016984524 bit-exact |
| DIP9 dip-law shape (carried) | **FAIL** (honest round-9 carry, re-scored under the UNCHANGED rule) | window-fragile as receipted: dipmag 0.5x = −0.010440 / 1x = 0.0736349882819407 / 2x = −0.019046 — rows re-bound bit-exact by run10 |
| **DOSE10 dose decision via \|Wc\|-room ordering across the depth ladder** | **FAIL** (16/17 checks) | all re-bind/engage/mechanism legs PASS — the 20k/75k ratios re-bind run8/run9 bit-exactly on BOTH arms, the |Wc| ladders re-bind bit-exactly (wc_capture_validated), the cured dose ENGAGES at every finite depth on both arms, the endpoints re-bind the declared Δ anchors exactly, the single-crossing leg HOLDS (exactly one sign crossing, d\* = 75000 ∈ (20000, 75000]) — but the pre-registered ordering-curve law fails its STRICTLY-DECREASING leg: Δ RISES before it crosses (0.01974 → 0.03072 → 0.03197 → 0.02817 → −0.04726). The fired priced branch: the reversal is NOT a lawful monotone depth phenomenon — see below |
| **SAT10 fourth-switch plateau** | **FAIL** (20/21 checks) | everything holds EXCEPT the non-expanding-increment leg: inc4 = **0.016733193739495222** > inc3 = 0.0003327380566972016 (**50.3× expansion**) — the priced EXPANDING-STEPS branch (convex wash-out precursor). The plateau itself HELD: rho20_4 = **0.9720798092837104** ∈ [rho20_3 = 0.9553466155442152, 1); no washout, no compounding resumption; the different-probe-world E-cascade SURVIVES: rho20_4^E = **0.9815072297359018** < 1.0; all composition legs hold (end-4 |Wc| decayed 9.364991121950265 < control 17.760185404934926; E-cascade 9.38646432529357 < 17.76983578233187); every stage binding bit-exact (stage-3 re-binds run9: 0.7025685901201354 / 0.7354070016984524; stage-4 control == the design10 disclosure 0.976422859819224) |
| **DIP10 dip W-domain boundaries** | **FAIL** (12/17 checks) | the registered anchors re-bind bit-exact (1x anchors, dipmag_1x, 0.5x/2x rows) and the DEATH legs hold (localMin(1.75) FALSE, localMin(1.1) TRUE, high flips 1 ≤ 1, gate_high: dipmag(1.75) = −0.012827542275320875 < 0.05) — but all three BIRTH bracket predictions fail and the low ladder flips TWICE (low_flips = 2 > 1): the W-domain is FRAGMENTED, not an interval. gate_low fails: dipmag(0.55) = **0.0745141957413129** ≥ 0.05. Domain of record (receipted as findings, gate-nothing): birth_scale_low 0.55, death_scale_high 1.1, low_flips 2, high_flips 1 |
| R4 determinism crown (round-10 form) | PASS | two full executions byte-identical at ALL SIX metric layers (round-10 sha `8a3daa00…` on both twins) AND run4 **29/29** + run5 **92/92** + design5-pairs + design6 + run6 + run7 + run8 + run9 re-binds at every layer + design8/design9/design10-disclosed — **ZERO mismatches**; SHA-LEVEL chain bound to run9.json's R4 row (ff60c211… / 7a20e613… / 30657dbe… / 34ec241a… / c972511d…); **probe==run==twin==r4==r5==r6==r7==r8==r9, the chain now TEN rounds deep** |
| R5 mesh conservation (carried) | PASS | drift 9.468e-9 ≤ 1e-6 rel, variance non-increasing |
| R6v4 impact-sensitive no-repair (carried) | PASS | corr 0.6343 > 0.3, jump 2.755 > 1.5, sha-invariant, recheck delta 0 |

## The round-9-priced questions, answered

**The DOSE10 ladder, verbatim from the receipt:**

| depth | ratio(2e-4) | ratio(3e-4) | Δ(d) | \|Wc\|(2e-4) | \|Wc\|(3e-4) |
|---|---|---|---|---|---|
| 20000 | 0.6841500024733943 | 0.6644108562180416 | +0.01973914625535267 | 11.130270846539293 | 9.769638164817229 |
| 30000 | 0.6770690708450811 | 0.6463475830590938 | +0.030721487785987267 | 10.284571782125024 | 8.803594735118917 |
| 40000 | 0.6721661790413602 | 0.6401973684680589 | +0.031968810573301365 | 9.687502951781555 | 8.107602218267036 |
| 50000 | 0.6496072946519339 | 0.6214399319610716 | +0.028167362690862285 | 9.25800362624802 | 7.5690166212299825 |
| 75000 | 0.5507446127932 | 0.5980059011717661 | −0.047261288378566135 | 8.691686529662682 | 6.443616949719879 |

1. **Is the round-9 ordering reversal a lawful DEPTH phenomenon, and does wd 2e-4 confirm as the
   plasticity dose?** **THE DOSE DECISION IS DEFERRED — the fired priced branch is "the curve is
   not strictly decreasing".** The registered law required Δ(d) strictly decreasing with exactly
   one sign crossing; the crossing leg HELD (sign_crossings = 1, d\* = 75000, bracketed — from
   75000 to the deepest shared-finite state the milder cure is the faster re-adapter), the engage
   leg HELD (ratio < 1 at every depth on both arms), and every re-bind leg held bit-exactly
   (20k/75k == run8/run9 on both arms; both |Wc| ladders; D 85387; rate). What failed is
   monotonicity: Δ is a HUMP, not a descent — it RISES from 20k to a peak of +0.031968810573301365
   at 40k, then falls through +0.028167362690862285 to the −0.047261288378566135 crossing. Per the
   registered FAIL branch: the reversal is NOT a lawful monotone depth phenomenon, the ordering
   mechanism is re-priced as multi-factor, the decision is DEFERRED, and wd 2e-4 is neither
   confirmed nor demoted. **The dose decision of record: wd 3e-4 REMAINS the longevity main dose
   (unchanged); wd 2e-4 stays CANDIDATE-ONLY; dose-selection remains OPEN.** The mechanism
   gate-nothing finding sharpens the re-pricing: pooled Spearman(|Wc|, ratio) = 0.9151515151515152
   (the round-8 20k law's 1.0 does not survive pooling), and the |Wc| gap GROWS monotonically with
   depth — 1.3606326817220644 → 1.4809770470061068 → 1.5799007335145188 → 1.6889870050180367 →
   2.248069579942803 — while the ordering INVERTS: |Wc|-room cannot be the ordering carrier at
   depth (the round-8 mechanism is depth-refuted, exactly as the registration priced).
2. **Does the fourth-switch plateau hold, and does it survive a DIFFERENT probe world?** The
   plateau held and the different probe world SURVIVED — the claim failed on its increment leg
   alone. D-cascade fourth switch (fresh World2(seedD = 808219675) from the END state of the
   registered third switch, no weight reset): ratio4(3e-4) = **0.9491609473533265** (first10
   6.337e-4 → last10 6.015e-4), ratio4(wd0) = **0.976422859819224** (bit-exact == the design10
   disclosure). The FLAT-PLATEAU level held: **rho20_4 = 0.9720798092837104 ∈ [rho20_3 =
   0.9553466155442152, 1)** — no washout (rho20_4 < 1), no compounding resumption (rho20_4 ≥
   rho20_3). The E-cascade (stage-1 window on a fresh World2(seedE = 3972732037) — the round-9
   trivial-world caveat's priced answer): **rho20_4^E = 0.9815072297359018 < 1.0** — the advantage
   PERSISTS in the all-hard-world probe; the plateau is NOT a trivial-world artifact. Composition
   persists end-to-end (D-cascade: 9.4674 → 9.3807 → 9.3650 decayed vs 17.6931 → 17.6794 →
   17.7602 control; E-cascade end-4: 9.3865 vs 17.7698). What fired is the priced EXPANDING-STEPS
   branch: **inc4 = 0.016733193739495222 > inc3 = 0.0003327380566972016** (50.3×) while rho20_4 <
   1 — the increment that had collapsed 71× at switch 3 EXPANDED at switch 4: a convex wash-out
   precursor, receipted as the round's honest SAT10 FAIL leg.
3. **Where is the lr-0.2 dip's local-minimum shape born and dead on the W axis?** **The domain is
   FRAGMENTED — the registered birth/death bracket predictions failed on the low flank, and the
   domain-of-record is receipted as findings, gate-nothing beyond the registered inequalities.**
   The thirteen-scale scan (THIRTY-NINE new g-points, W_s = round(s·30/lr), K4 tau law, wd 0,
   trivial world) reads: localMin TRUE at 0.55 (g(0.2, W83) = 0.5209338182506718, dipmag
   0.0745141957413129), 0.6 (0.48365894905901974, 0.08252721897074611), 0.65
   (0.48215232181036466, 0.017476543348933504); FALSE at 0.7–0.9 (dipmags −0.06761549872735062 /
   −0.10293249952745753 / −0.07802727467129472 / −0.03980353856524588 / 0.01389285512451327);
   TRUE again at 0.95 (0.2933150148776231, 0.047982296778600886); TRUE at 1.1 (0.22485492553758168,
   0.05087814923663625); FALSE at 1.25–1.75 (−0.02881568074341781 / −0.007328381676541901 /
   −0.012827542275320875). Against the registered predictions: localMin(0.95) TRUE ✓ held; the
   left inequality was predicted to hold at 0.9 — it FAILS there; predicted to fail at 0.55 — it
   HOLDS there; the right inequality was predicted to hold at EVERY low scale — it fails at
   0.7/0.75/0.8. The low ladder flips twice ({0.55–0.65} ∪ {0.95–1.1} are the local-min islands),
   violating the ≤1-flip INTERVAL leg; gate_low fails (dipmag(0.55) = 0.0745 ≥ 0.05 — the 0.05
   gate's domain extends below the low extreme). The DEATH side is clean: localMin(1.75) FALSE ✓,
   localMin(1.1) TRUE ✓, one high flip, gate_high ✓. Domain of record: birth_scale_low 0.55,
   death_scale_high 1.1, low_flips 2, high_flips 1 — 1x is an ISOLATED SURVIVOR on a fragmented
   axis, not the interior of a lawful window.

## Honest notes of record

- **DOSE10, SAT10, DIP10 are the round's three honest FAILs** — each on a branch priced in the
  registration BEFORE the run (not-lawful-monotone → decision deferred, mechanism re-priced as
  multi-factor; expanding-steps → convex wash-out precursor receipted; fragmented-domain →
  boundaries receipted as findings, gate-nothing). No threshold surgery anywhere; every new
  measurement was scored against its registered rule with the decayed legs first measured inside
  run10.
- Every receipted anchor reproduced bit-exactly inside the same executions that measured the new
  quantities: run4 29/29, run5 92/92, design6 AND run6 AND run7 AND run8 AND run9 at all five
  carried metric layers, design8/design9/design10 disclosures (the R4 row: ZERO mismatches, ten
  rounds deep).
- The two prior incarnations' work is fully receipted: the defect receipt (the misnamed-run9
  v9-schema assembly, tip `04fca264…`) and the staging receipt (consumed by the runner's
  registered cleanup at receipt write — its staged twins are bound bit-exact into R4) are both
  disclosed above. 64-b-r3 executed nothing: the receipt of record was structurally complete and
  its chain was re-derived from GENESIS at audit time.
- Runner-level changes this round (all staged pre-seal, committed at `aee0335`): the captureAt
  extensions on both arms ([30000, 40000, 50000] — design10 I-A10a/I-A10b identity class),
  trivialSwitchProbe4 (the carried probe3 + a fourth 400-step window on World2(seedD) + a
  parameterized stage-1 world — design10 I-B10), and the THIRTY-NINE DIP10 gGateFlex points
  (design10 I-C10 anchors). Zero arithmetic change to any carried computation; core/
  byte-untouched; the operating point is unchanged (lr 0.3, tau 0.99998, K4 1.5e-6, amp 0.9).
- Spend: $0 external — the entire round is local deterministic compute; this lane spent only the
  audit.
- Coverage: registration-v10 explicitly leaves registration-coverage.json/v2/v3 as untouched
  history and registers NO v4 instrument — no coverage artifact is required or produced this
  round. The M8 registry stays at rounds 4–9 (claims sealed per round [8, 11, 14, 18, 22, 25],
  cumulative 98); the round-10 row folds only when a v4 upgrade is registered per the
  instrument's own rule ("may upgrade the metric by registering the upgrade, never by editing
  this one").

## Round-11 agenda priced by this receipt

1. **The ordering mechanism, re-priced as multi-factor** — |Wc|-room is depth-refuted (the gap
   GROWS 1.36 → 2.25 with depth while the ordering inverts; pooled Spearman 0.9152). The single
   crossing at d\* = 75000 is real; the hump (Δ peaking at 40k) is the unexplained structure.
   Price the ordering-carrier candidates (beyond |Wc|: pace-state, window-phase, guard-headroom)
   on the existing five-depth ladder BEFORE any new compute; the dose-selection question stays
   OPEN with 2e-4 candidate-only.
2. **The fifth switch under the expanding increment** — inc3 0.000333 → inc4 0.016733 (50.3×)
   with rho20_4 = 0.9721 < 1: price whether inc5 continues expanding toward washout (rho20_5 ≥ 1)
   or the expansion absorbs into the plateau — on BOTH cascades, with the E-cascade's different
   probe world now a receipted control.
3. **The fragmented W-domain** — the local-min islands {0.55–0.65} ∪ {0.95–1.1} leave two
   unmapped gaps (0.675–0.925 interior, and the (1.1, 1.25) death bracket): price a boundary
   refinement scan that treats the domain as islands (the registered interval law is dead on the
   low flank) and re-registers the dip law's domain of record as the receipted fragment set.

*M8 coverage pointer: unchanged — the archive-coverage registry remains at v3 (rounds 4–9,
cumulative 98 claims); registration-v10 registers no upgrade.*

*Every number above is read from `receipts/run10.json` (chain tip cca59bd5…), not re-measured.*
