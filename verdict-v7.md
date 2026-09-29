# verdict-v7 — quilt-jepa round-7 (wave 57-e, keeper)

**Provenance:** registration-v7 sealed pre-run (`2ef8f393…`, mtime 1790644800000, commit `5d1235e`
pushed before any execution). Design probe `receipts/design7.json` receipted pre-seal with 7
fail-closed pipeline identities, ALL TRUE — including the 3-leg capture/reconstruction identity
(I1) that unavoidably computed one PLAST-class value (`0.6644108562180416` from the 20k-decayed
snapshot), DISCLOSED in the registration and bound bit-exact in the run. Infra receipt: the
sandbox silently reaps long detached processes (kill, not OOM — 4GB cgroup, 3.4GB free); the four
full executions were staged to disk on completion and resumed across relaunches. No claim
arithmetic, gate, or execution count was touched — both twin executions ran to completion and the
R4 shas bind them. Receipt of record: `receipts/run7.json` (chain tip `e10a2221…`).

## Scorecard: 18/18 PASS

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
| RLONG longevity law (carried) | PASS | main dose D=null exec=5e5 (censor floor 16.5706×), wd1e-4 D=48091 with two-phase persisting (ratio 14937.4), guards unrelaxed (g 0.3508 / r1 0.1708 / drift 2.61e-3) — all bit-exact vs design6/run6 |
| R3D depth/window law (carried) | PASS | anchored 3.5407@400 / 2.2614@1200 / 3.4082@2000 / 3.1927@2200, multiplier exactly 1 at the anchor — bit-exact vs design6/run6 |
| GWIN g-window law (carried) | PASS | g 0.3041@0.15(W200) / 0.4341@0.5(W60), anchor bit-exact |
| **RLONG7 dose-response** | **PASS** | 7-dose rate curve **strictly monotone**: +1.938e-5 (wd0) → +5.304e-6 (1e-4) → **+2.982e-7 (1.5e-4)** → **−3.779e-6 (2e-4)** → −7.164e-6 (2.5e-4) → −1.003e-5 (3e-4) → −2.889e-5 (1e-3); the registered bracket HELD: **the cure zero-crossing wd\* is pinned inside (1.5e-4, 2e-4)**, exactly where the receipted curve's interpolation put it |
| **PLAST plasticity cost** | **PASS** | engage at every registered warm state: 0.6644@20k / 0.5958@100k / **0.5864@500k** (decayed), 0.7135@20k (control), 0.7017@20k (wd1e-4); **rho20 = 0.9312 < 2.0 — and < 1.0: the longevity cure is PLASTICITY-POSITIVE on this readout** (the decayed model adapts FASTER to the switched world than the undecayed control at the same depth); probe==run bit-exact on the disclosed value; the 500k edge probe (|Wc| = 0.7387, 16× below init) still learns — **extreme-depth decay does NOT kill adaptation** |
| **R3DxR3L composition** | **PASS** | at every depth {400, 1200, 2000, 2200}: sd_sum(1.2) == sd_sum(0.9), z_carried(1.2) == z_carried(0.9), z_anchored(1.2) == z_anchored(0.9) — ALL bit-exact; multiplier@400 exactly 1 at BOTH amps; **anchored@1.2 == 3.4082@2000 / 3.1927@2200 ≥ 3.0 — the anchored 3.0 restoration SURVIVES at the plateau: the two laws compose** |
| **GWIN7 full grid** | **PASS** | g < 0.5 across the core grid: 0.3041@0.15 / **0.2537@0.2** / **0.3506@0.25** / 0.3492@0.3 / **0.4033@0.4** / 0.4341@0.5 — anchors bit-exact; **the lr 0.6 edge also holds (0.4271 < 0.5): no domain boundary needed** (the grid is non-monotone in lr — dips at 0.2, rises toward 0.5) |
| R4 determinism crown (round-7 form) | PASS | two full executions byte-identical (carried sha ==, round-6 sha ==, **round-7 sha ==**, composite sha ==) AND run4 **29/29** + run5 **92/92** + design5-pairs **63/63** + design6 **101/101** + run6 **105/105** + run6-carried **92/92** + design7 **2/2** — **ZERO mismatches**: probe==run==twin==r4==r5==r6==r7, the longest bit-exact chain this repo has produced |
| R5 mesh conservation (carried) | PASS | drift ≤1e-6 rel, variance non-increasing |
| R6v4 impact-sensitive no-repair (carried) | PASS | corr/jump/sha-invariant/recheck as registered |

## The round-6-priced questions, answered

1. **Where does the cure engage?** The slow-phase |Wc| diffusion rate crosses zero between
   wd = 1.5e-4 (+2.982e-7, still growing) and wd = 2e-4 (−3.779e-6, contracting): **wd\* ≈ 1.7e-4
   sits inside the registered bracket (1.5e-4, 2e-4)**. The dose-response is steep and monotone
   across the full seven-dose grid — the registered risk (sublinear steepening flipping the sign
   before 1.5e-4) did not materialize, and the bracket was decided before the run.
2. **What does the decay arm pay?** Nothing measurable — and by this readout it is paid back:
   rho20 = 0.9312 means the decayed model at 20k re-adapts to a switched world ~7% FASTER than
   the undecayed control at the same depth, and the advantage persists to the 500k edge probe
   (0.5864 with |Wc| 16× below init). The longevity law's cost curve, measured for the first
   time, is **plasticity-positive at every registered point**. The round-6 worry ("plasticity
   gates UNRELAXED" was only verified at the 400-step operating point) is now closed at depth.
3. **Do the anchored statistic and the clamp plateau compose?** Yes, bit-exactly, at every
   registered depth: the plateau extends to depth (the shallow-only finding of round 5 was a
   measurement gap, not a depth property), and because `observe()` is pure the baseline is
   amplitude-free, so the anchored multiplier is amp-independent and the composed statistic
   inherits the plateau exactly — the anchored 3.0-gate restoration holds AT the plateau.
4. **Does the window law hold everywhere tested?** Yes — including the lr 0.6 extrapolation edge
   (0.4271 < 0.5). The GWIN law needs no domain boundary on the tested grid; the grid's
   non-monotonicity in lr (dip at 0.2) is receipted for round 8's pace-law refinement.

## Honest notes of record

- The detached-process kill (silent SIGKILL ~2min in, zero stderr) was receipted and worked
  around with disk staging + resume — an infrastructure change only; both twin executions still
  ran to completion and every determinism sha binds them.
- The design probe unavoidably computed one PLAST-class value (identity I1's determinism check);
  it was disclosed in the sealed registration BEFORE the run, the naive <0.5 init-gate was
  NOT registered (it would have been theater), and the run reproduced the disclosed value
  bit-exactly.
- One lane bug was caught by the resume path itself: the wd0 control arm initially launched
  without its 20k weight capture (the PLAST control probe depends on it); fixed and re-run from
  the staged carried executions — the staged r1/r2 were unaffected and their shas bind.
- Round-8 agenda (priced by this receipt): the plasticity ADVANTAGE mechanism (why does decay
  speed re-adaptation? — null-space room, or the Wt/Wc composition re-balancing faster at smaller
  |Wc|); the GWIN grid's lr-non-monotonicity; RLONG at 2e-4 (the dose-response's steepest
  lifetime-per-decay point) as a candidate re-registration of the main dose; and the 1e-3 arm's
  long-horizon plasticity (does over-decay eventually pay?).

*Keeper-authored verdict — every number above is read from `receipts/run7.json`
(chain tip e10a2221…), not re-measured.*
