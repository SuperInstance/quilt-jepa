# quilt-jepa · round-3 verdict — the optimizer actually learns now

**Run:** same certified-seed receipt as rounds 1-2 (`receipts/certified-seed.json`, FALLBACK-labeled —
the comet cert payload question remains open upstream; determinism claims are same-seed-twice so
labeling does not affect them). Seed u32 derivation identical to rounds 1-2.
**Registration:** `registration-v3.json`, sealed pre-run — `self_sha256_masked 19aae14d2db32f…`,
mtime `1790619995624`; re-verified fail-closed inside the run at startup. Addendum 1
(`registration-v3-addendum1.json`) sealed pre-supplementary-run — `63ba6f9fac7ab3…`,
mtime `1790620175966`; verified at startup.
**Chain:** tip `436d13b57e58f15b…`, receipts `run3.json` + `run3b.json`.
**Score: 5/8 as-run + R6a PASS — and the two failures are the round-4 research agenda.**

| Claim | Verdict | Measured |
|---|---|---|
| G learning-sanity gate (L1 law) | **PASS** | ratio **0.3477** < 0.5 at 100 steps (rounds 1-2 could never pass this gate — the starved core measured 0.998-1.17) |
| L2 difficulty meter ordering (L2 law) | **PASS** | hard floor 4.285e-4 > trivial 2.697e-4; relative: 0.0462 > 0.0325 (run seed; design-time seed 12345 agreed) |
| R1 hard world, real learning | **PASS** | ratio **0.1781** at 400 steps (round 2: 0.998 — nothing) |
| R2 EMA stationarity under a WORKING optimizer | **FAIL** | drift/norm **1.06e-1** (gate < 0.01) |
| R3 concentration statistic | **FAIL** | conc ratio **1.919** (< 3.0); anomaly 0.137 vs baseline 0.0714 |
| R4 determinism crown | **PASS** | two full executions byte-identical; PLUS the addendum rebuild cross-checked **7/7 bit-identical** against run3.json |
| R5 mesh conservation | **PASS** | drift 3.71e-9 rel, variance non-increasing |
| R6 impact-sensitive no-repair (as-run flag) | **FAIL (flag conflated — see below)** | corr mean **0.696** ✓ (L3 precondition, gate 0.3), jump **4.068** ✓ (gate 1.5), recheck delta 0 ✓; state-sha flag FALSE as implemented |
| R6a corrected frozen-state invariant (addendum 1) | **PASS** | sha at corruption time == sha after 50 idle ticks (`edad9a2e28a7…` both), recheck delta 0 |

## The repair that mattered was one layer deeper than the registered law (D4)

Round 2 receipted D1: gradients divided by N=1024 starve the optimizer; the L1 law prescribed
per-latent normalization or lr ∝ N. Applying the scale fix alone (jepa3-v1) still could not move
the trivial-world gate (ratio ≥ 0.86 at 100 steps, all probed lrs). A finite-difference gradient
check (eps=1e-5, 4 entries, receipted pre-seal) found the second defect: **jepa.js's Wc update was
transposed** — forward computes zCtx = Wc·f but the backward applied the gradient of zCtx = Wcᵀ·f
(`Wc[j][k] -= bp[k]·f[j]` where the chain rule requires `bp[j]·f[k]`). The check matched the
chain-rule convention to ≤ 7.5e-9 on every probed entry; the implemented form erred up to 5.7e-5,
sign flips included. So round 2's optimizer was doubly broken: right direction at 1/1024 of the
right magnitude is still starving; wrong direction at any magnitude is not descent. core/jepa3.js
carries both repairs; core/jepa.js is untouched history. Registered lr = 0.3 (design-probe-selected
from the stable band 0.1..0.5, all probes receipted in design3.json / design3_floor.json).

## The two FAILs are findings, not noise (both registered as such, neither retuned post hoc)

- **R2 — tau=0.999 stationarity breaks at a working learning rate.** With Wc actually moving
  (lr 0.3), the EMA target trails by 10.6% of its norm over 200 steps — the fixed-point law that
  held on a starving diet (round 2: 1.08e-4) does not survive real learning. Round-4 design law
  (to be registered before any round-4 run): the EMA rate must scale with the learning pace —
  candidates: (1-tau) ∝ lr·(per-latent scale), or per-layer tau; the registered round-2 threshold
  stands as the target property.
- **R3 — concentrated surprise is real but under the registered bar.** The learned model halves
  baseline concentrated surprise versus the starved model (0.0714 vs ~0.25) and the intruder
  spikes 1.92x above it — real signal, honestly short of the 3.0 threshold. Round-4 candidates
  (to be registered before any run): percentile-normalized surprise statistic (the top-4-of-256
  baseline tracks the ball's own surprise, capping the ratio), longer training, anomaly-strength
  ladder.

## R6: an as-run flag conflation, corrected under seal discipline (receipted, not hidden)

The state-sha flag as implemented in BOTH run2 and run3 compared the PRE-corruption state to the
post-idle state — trivially false because the deliberate corruption is inside the compared delta.
Honest correction to verdict-v2's narrative: its "frozen-state invariant half of R6 held" sentence
mischaracterized run2's receipt (run2.json records state_sha_unchanged=false; only the recheck-delta
half actually held). The corrected invariant was REGISTERED in addendum 1 BEFORE the supplementary
run, which rebuilt the trajectory deterministically (cross-check 7/7 bit-identical vs run3.json),
then proved the registered predicate: the post-corruption state is bit-inert under 50 idle ticks
and nothing repairs without a gradient signal (R6a PASS). Substantively, round 3 completes the
round-2 story: on a LEARNED model the corruption now lands (jump 4.068 vs round 2's 0.989) and the
L3 learning precondition is finally satisfiable (corr 0.696 — a learned prediction structure exists).

## What stands

- **The L1 gate opens**: the trivial-world sanity gate that round 1 invented and rounds 1-2 failed
  is now passed (0.3477), with 15x headroom to the closed-form floor (L2 meter adopted as the
  difficulty gate; entry loss retired per the round-2 law).
- **Determinism is a cross-run property now**: two full executions byte-identical (R4) plus a
  sealed supplementary run rebuilding the R6 trajectory bit-for-bit from the seed (7/7).
- **The mesh is still physics-legal**: 3.71e-9 relative conservation, strict variance contraction.

## Honest limits

- The browser/WebGPU demo remains DESIGN/DEMO only; the Node core is the verified substrate, and
  round 3's repairs have not been ported to the WGSL kernel — the WGSL fused kernel and the JS
  core are now known to DIVERGE in optimizer semantics (the WGSL port inherited no D4 fix because
  it has no Wc training path yet; any future port must re-derive, not copy).
- R2/R3 as-scored are final for registration-v3; the round-4 laws above are candidates until they
  are registered.
- The seed remains fallback-labeled (comet cert payload question open with census maintainers).
- Design-time probes (P1/P2/P3, lr sweep, floor measurement) receipted in design3.json and
  design3_floor.json gate nothing; the sealed claims were executed only post-seal.
