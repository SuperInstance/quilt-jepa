# quilt-jepa · wave-49 verdict — the latent grid, honestly scored

**Run:** seed `2133245488` (moth-seal receipt `quilt-jepa-wave49-seed`, mode FALLBACK — comet-qrng-v1's
cert payload came back incomplete (`output`-only shape, no `entropy_report`/`random.hex`), fail-closed to
labeled graph-v1+whitening; raw attempt archived in `receipts/comet-raw-attempt.json`).
**Chain:** 7 rows, tip `09e84771c690…`, verify exit 0, tamper negative control fails closed, registration
seal `5d1e422001b0…` @ mtime `1790574965122` (sealed pre-run).
**Score: 3/6 claims PASS.** No numeric prior probabilities were registered, so no Brier scores — direction
claims only, honestly scored PASS/FAIL.

| Claim | Verdict | Measured |
|---|---|---|
| P1 learning: last10/first10 < 0.25 | **FAIL** | ratio **0.948** (0.00903 → 0.00856) |
| P2 EMA stationarity: drift/norm < 0.01 | **PASS** | **0.000107** (24× under the bar) |
| P3 anomaly surprise > 3× baseline | **FAIL** | ratio **1.098** |
| P4 determinism: byte-identical runs | **PASS** | metrics sha equal across 2 runs; re-run after seal repair reproduced tip **exactly** |
| P5 diffusion conservation + variance contraction | **PASS** | total drift **1.24e-8** rel (≤1e-6), variance non-increasing over 100 steps |
| P6 zero self-repair: jump >1.5× AND no healing | **FAIL** | jump **0.979** (no_heal=true but the jump condition failed) |

## What the three FAILs actually mean (the finding)

**The world was too easy, and an easy world makes a boring model.** All three failures share one root cause,
which the chamber exposed precisely because the predictions were registered before the run:

1. **P1** — the initial loss (0.0090) was already near the floor. The wave field is so smooth that a random
   linear encoder almost solves it; the 400-step budget had nothing to eat. The learning claim was
   mis-calibrated against a nearly-learned baseline, not against a hard world.
2. **P3** — surprise is a MEAN over 256 cells; a 2×2 intruder perturbs 4 cells (1.6% of the grid), so even a
   violent local anomaly dilutes to noise (1.098×). The detector law needs concentration (max-cell or
   region-of-interest energy), not global means.
3. **P6** — E-Q10's injector law did NOT transfer naively: sign-flipping 413 of 4,096 encoder weights moved
   loss by −2% (0.979×), because a flat-loss regime makes most weight directions irrelevant. "No silent
   wrong state" needs an impact-sensitive probe (corrupt along gradient-sensitive directions, or probe with
   a fixed evaluation batch). The no-heal half (frozen min ≥ corrupted − 1e-9) held — nothing healed —
   but a no-heal result without a jump is vacuous.

This is the wave's real yield: **three design laws for growing intelligence in cell meshes, paid for by
honest FAIL** — (a) surprise needs a hard world (register difficulty, not just training length);
(b) anomaly detection needs a concentration statistic, not a global mean; (c) fault-injection claims need
impact-sensitive corruption. Each is falsifiable and ready to be registered as wave-49-b's P1–P3.

## What stands (the PASSes)

- **P2** — the WGSL EMA law (tau=0.999) is exactly stationary in JS at the registered tolerance: the target
  encoder barely moves (drift 1.07e-4 of its norm) while training continues. The browser-shader law and the
  Node law agree.
- **P4** — the determinism crown: identical seed ⇒ byte-identical metrics, and when the seal scheme was
  repaired post-run, re-running regenerated the identical receipt tip. Regeneration IS restoration.
- **P5** — the Perona-Malik mesh conserves total energy to 1.2e-8 relative and contracts variance strictly —
  the mesh is a *physics-legal* surprise substrate: it can move and focus surprise but never mint or destroy it.

## Honest limits

- Browser/WebGPU demo is DESIGN/DEMO only — never executed headless here; the Node core is the verified
  substrate (exact-twin doctrine: verified twin first, float artifact labeled).
- The seed is fallback-labeled (not comet-certified); certification path re-opens when the comet payload
  shape question is resolved with the census maintainers.
- P6's registration used a jump-then-freeze design that conflates world-state variation with healing; the
  verdict above scores it as registered (FAIL), and the redesign is future work, not a re-registration.
