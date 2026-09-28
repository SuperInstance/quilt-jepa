# verdict-v6 — quilt-jepa round-6 (keeper-finished, lane 56-a/56-a2)

**Provenance (receipted, resume-first law):** the dispatched lane sealed the registration and landed commit
`c5712f1` (pushed, remote==local) with `receipts/design6.json` (pre-seal design probe, 5 fail-closed pipeline
identities), then died on an infra context deadline DURING execution. The runner process completed after the
lane's death and wrote `receipts/run6.json` (stable across keeper re-reads, md5 1ad7b79b…). Keeper verified the
seal binding (`seal_verified_at_startup.masked_sha = a1cf6fa9…` == the sealed registration), absorbed the
receipt, and wrote this verdict from it. An intermediate 13/14 state observed once during the racing twin
execution was overwritten by the completed run; the file of record is the completed one.

## Scorecard: 14/14 PASS — receipt `receipts/run6.json`, chain tip `ee5827a71f3914fb…`

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
| **RLONG longevity law** | **PASS** | wd=3e-4: slow diffusion **−1.003e-5** (NEGATIVE — phase-1 null-space diffusion eliminated within window, as registered); control wd=0 reproduces round-5 pin bit-exactly (D=30174, slow 1.938e-5, runaway 7.290e-2); D_main = None (no runaway reached inside the horizon) |
| **R3D depth/window law** | **PASS** | deficit decomposed (sd-aliasing × novelty-gap); scale-anchored statistic: carried z 3.541@400 / 2.205@2000 / 2.548@2200 → anchored **3.541@400 / 3.408@2000 / 3.193@2200** — the UNCHANGED 3.0 gate restored at both depth-2000-class sites; multiplier at depth 400 exactly **1** (bit-exact assert `r3d_assert_candD400_bitexact`) |
| **GWIN g-window law** | **PASS** | W(lr)=round(30/lr): g = 0.3492@anchor(W=100) / **0.3041@lr0.15(W=200)** / **0.4341@lr0.5(W=60)** — all under the 0.5 gate; the round-5 pace-locked finding (g=0.5693>0.5 @lr0.15) is UNLOCKED by the window law alone |
| R4 determinism | PASS | two FULL executions byte-identical (carried sha ff60c211… ==, round-6 sha 7a20e613… ==, composite sha 2285d690… ==) AND carried vs run4.json **29/29** + run5 vs run5.json **92/92** + probe vs design5.json **63/63** + probe6 vs design6.json **101/101** — all zero mismatches; identity probes losses+weights bit-exact (sha c8c3c06b…) |
| R5 mesh conservation (carried) | PASS | drift ≤1e-6 rel, variance non-increasing |
| R6v4 impact-sensitive no-repair (carried) | PASS | corr/jump/sha-invariant/recheck as registered |

## The three round-5-priced laws, in one sentence each

1. **RLONG — the runaway is a null-space disease and weight decay cures it.** At wd=3e-4 the phase-1
   diffusion rate goes NEGATIVE (−1.003e-5 vs control +1.938e-5): the decay contracts the null-space faster
   than learning diffuses along it, so the 3761× two-phase divergence never engages inside the horizon. The
   3761× leverage estimate from round-5 is confirmed with headroom (the registered ≥2× lifetime gate is
   cleared the only way it can be — no runaway at all).
2. **R3D — the depth deficit was a statistics artifact, not a surprise collapse.** The deficit decomposes
   into sd-aliasing × novelty-gap (receipted factors per depth); the scale-anchored statistic restores the
   shallow gate at depth with a multiplier that is exactly 1 at the anchor depth — the shallow operating
   point is untouched by construction and by bit-exact assert.
3. **GWIN — one law unlocks the pace-locked gate everywhere.** W(lr)=round(30/lr) re-times the learning-sanity
   window to the pace; every pace tested (0.15/0.3/0.5) now sits under the gate with the anchor bit-reproduced.

## Honest notes of record

- The lane death (second of the wave for this repo) cost nothing but latency: registration was sealed and
  pushed before the run started, the runner re-verified the seal fail-closed at startup, and the receipt is
  self-contained. Resume-first law held end-to-end.
- The racing-execution intermediate (13/14) was an artifact of a twin execution that had not finished; the
  completed receipt carries run1==run2 byte-identity — determinism is claimed only where the receipt proves it.
- Round-7 agenda (priced by this receipt): RLONG at 1e-4 dose (registered expectation: two-phase PERSISTS —
  the dose-response curve pins where the cure engages); RLONG plasticity cost curve (what does the decay arm
  pay on G/R1 over long horizons?); R3D anchored statistic vs the R3L saturation ceiling (do they compose?);
  GWIN on the full cross-pace grid.

*Keeper-authored verdict from the lane's sealed receipt — every number above is read from
`receipts/run6.json` (chain tip ee5827a7…), not re-measured.*
