# quilt-jepa · round-5 verdict — the round-4 laws hold everywhere they were tested, and the operating point has a receipted finite lifetime

**Run:** same certified-seed receipt as rounds 1-4 (`receipts/certified-seed.json`, FALLBACK-labeled —
the comet cert payload question remains open upstream). Seed u32 2133245488, identical derivation.
**Registration:** `registration-v5.json`, sealed pre-run — `self_sha256_masked d5b27af15311…`,
mtime `1790625527953`; re-verified fail-closed inside the run at startup.
**Design probe:** `receipts/design5.json` (probe5.mjs v2, pre-seal, gates nothing). PROVENANCE
receipted: this lane died mid-flight once — v1 of the probe completed (its receipt found the
divergence), the v2 rewrite crashed on a use-before-assignment print BEFORE writing any receipt,
v2 was fixed (computation now precedes use) and re-run with a fail-closed 13/13 pipeline identity
vs run4.json enforced before the v2 receipt was written.
**Chain:** tip `b450d8462cdac3ae…`, receipt `run5.json`.
**Score: 11/11 — every pre-registered prediction hit, and the determinism chain is now
probe == run == run-twin == prior-round-run, all bit-exact (29/29 vs run4.json, 63/63 vs design5.json).**

**Scope law:** the round-4 operating point is UNCHANGED (lr 0.3, tau 0.99998, K4 1.5e-6, amp 0.9).
Round 5 validates and characterizes — it registers no new operating point and retunes nothing.

| Claim | Verdict | Measured |
|---|---|---|
| G learning-sanity (carried) | **PASS** | 0.34923 — bit-exact vs run4 |
| L2 difficulty meter (gate meter, carried) | **PASS** | 4.2848e-4 > 2.6970e-4 — bit-exact vs run4 |
| R1 hard-world learning (carried) | **PASS** | 0.16931 — bit-exact vs run4 |
| R2v4 pace-aware EMA (carried) | **PASS** | drift 2.640e-3 < 0.01 — bit-exact vs run4 |
| R3v4 percentile-normalized surprise (carried) | **PASS** | z-conc 3.5407 > 3.0 — bit-exact vs run4 |
| **R3L anomaly-strength ladder** | **PASS** | z(0)=1.0343 (null anchor, no signal), monotone to anchor, **z(1.2) == z(0.9) bit-exact** (clamp plateau), z(0.75)=3.502 > 3.0 |
| **R2x K4 cross-pace** | **PASS** | drift **4.429e-3** (lr 0.15, tau 0.99996) and **1.761e-3** (lr 0.5, tau 0.999988) — both < 0.01 under the SAME K4; guards at 0.5: g 0.2286, r1 0.1457, var 1.0017 |
| **RHOR finite-horizon divergence** | **PASS** | **D = 30174** (bit-exact vs probe), slow phase **1.938e-5**/step < 1e-4, runaway **7.290e-2**/step, ratio **3761** > 100; depth-2000 laws: drift 3.887e-3 < 0.01, var 1.0218 ≥ 0.5 |
| R4 determinism crown | **PASS** | twins byte-identical (`ff60c2113b48c9a9…`) + 29/29 carried == run4 + 63/63 new == design5 |
| R5 mesh conservation (carried) | **PASS** | 9.468e-9 rel, variance non-increasing — bit-exact vs run4 |
| R6v4 impact-sensitive no-repair (carried) | **PASS** | corr 0.6343, jump 2.7549, invariant ✓, recheck 0 — bit-exact vs run4 |

## R3L — the amplitude ladder is a closed lever (the v3-queued hypothesis is refuted, honestly)

The round-3 verdict queued "anomaly-strength ladder" as the lever to widen R3v4's thin 1.18x margin.
Round 5 tested it and the lever does not exist: the z-ratio rises monotonically with amplitude
(1.034 → 1.068 → 1.232 → 1.687 → 2.531 → 3.167 → 3.502 → **3.541**) and then **saturates bit-exactly**
(amp 1.2 produces byte-identical injected frames to amp 0.9 after the world's min(1, ·) clamp — the
wave + ball footprint already fills the injected block toward 1.0). The registered anchor 0.9 sits AT
the ceiling: ~3.54 is the max z-concentration this statistic can measure on this world. Margin
widening must come from the statistic or the window, not amplitude. The null anchor (amp 0) measures
1.0343 — the statistic correctly reports no-signal without injection. All receipted in the chain row.

## R2x — the K4 law transfers across pace (registration-v4's caveat answered), and one honest gate-failure of record

With the SAME K4 = 1.5e-6 re-derived at second pace points: lr 0.15 (tau 0.99996) drift **4.429e-3**,
lr 0.5 (tau 0.999988) drift **1.761e-3** — stationarity holds at both; all learning guards hold at
lr 0.5 (g 0.2286, r1 0.1457, var 1.0017). The registration-v4 transfer caveat ("K4 calibrated at a
single pace") is answered for these two points. **Finding of record (predicted, gates nothing):**
at lr 0.15 the L1 G gate FAILS (g **0.5693** > 0.5) — the G gate's fixed 100-step window is
pace-locked (half pace = half the effective steps). Priced round-6 candidate law: G window ∝ 1/pace
(e.g. 100·0.3/lr steps). Also receipted: z-conc at lr 0.15 is **3.8797** — the highest measured
anywhere (slower pace → wider surprise margin), currently unreachable because of the G lock.

## RHOR — the operating point has a finite lifetime: two-phase divergence, fully receipted

The world2 trajectory at the registered point runs to **D = 30174** steps (first non-finite loss;
executed to D+2000 per the registered stop rule) with a two-phase shape the checkpoints resolve:

- **Phase 1 (slow null-space diffusion):** |Wc| inflates 12.179 → 15.440 (5k) → 16.243 (10k) →
  17.808 (20k) at **1.938e-5/step** while the loss sits AT the closed-form floor (loss-500 at 20k =
  4.676e-4 vs floor 4.285e-4). The Wp∘Wc composition stays optimal while the individual factors
  drift — un-regularized SGD churn diffuses through the network's null directions.
- **Phase 2 (runaway):** |Wc| 5.35e13 by step 30000, blowup rate **7.290e-2/step** — **3761x** the
  slow phase; drift_last200 = 1.0 (Wt fully decorrelated); the loss oscillates Inf↔finite-huge
  (21 finite-again steps) and weight death is NOT complete within the D+2000 window (receipted:
  all_weights_nan_step null as-executed).
- **The round-4 laws hold at 5x depth before divergence** (FIXED depth-2000 window, registered):
  drift **3.887e-3** < 0.01, no-collapse var **1.0218** ≥ 0.5.
- **Finding of record (predicted):** z-conc at depth-2000 = **2.5481 < 3.0** — the R3v4 statistic is
  depth-sensitive and fails its gate at the floor (residual-scale collapse compresses the intruder
  contrast). Priced round-6 lever: window/depth law for the surprise statistic.
- **Contrast arms (all diverge within the 1e5 cap, bit-exact):** tau=0.999 → **D=9653** (a FAST EMA
  shortens life 3.1x — target churn feeds the runaway; the round-4 law's window scaling is also the
  longevity-optimal direction); lr=0.15 → **68434** (slow pace lengthens life 2.3x); lr=0.5 →
  **13052**; **trivial world → 30562 ≈ world2's 30174** — the divergence is OPTIMIZER-borne
  (un-regularized churn), not world-borne. Slow-inflation rates across arms: 1.80e-5 – 2.21e-5/step
  (weak world/pace dependence).

## What stands

- **The round-4 laws are now validated at three paces, nine amplitudes, and depths to 20k+ steps** —
  and the carried scorecard reproduces run4 bit-exactly (29/29 metrics), so rounds 4 and 5 are one
  deterministic computation family (probe == run == twin == prior round: 63/63 + 29/29 + twin shas).
- **Round-6 agenda is now priced by measurement, not speculation:** (1) G-window ∝ 1/pace (the
  R2x pace-lock); (2) depth/window law for the surprise statistic (the RHOR depth-2000 z-fail);
  (3) optional longevity law — weight-decay or norm-regularization on Wc would attack the phase-1
  diffusion directly (the runaway is 3761x the slow phase, so small regularization leverage goes far);
  the amplitude lever is CLOSED (R3L).
- Honest-failure scoreboard this round: 0 claim FAILs; 2 predicted findings of record landed exactly
  as registered (G@0.15 pace-lock; depth-2000 z-gate fail); 1 refuted hypothesis converted into a
  closed lever (R3L). Every failure-shaped result was pre-registered as a finding before the run.

## Honest limits

- The divergence is measured at ONE seed and one world pair (the trivial-world contrast supports the
  optimizer-borne mechanism, but a multi-seed sweep was not registered this round).
- The runaway's post-D dynamics are only receipted to D+2000; weight death (all-NaN absorbing state)
  is predicted but not observed within the window — the stop rule was registered before the run and
  was not extended post hoc.
- The seed remains fallback-labeled (comet cert payload question open with census maintainers).
- The WGSL/browser demo remains DESIGN/DEMO only; no optimizer semantics were ported.
