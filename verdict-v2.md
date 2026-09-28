# quilt-jepa · round-2 verdict — the failure was one layer deeper

**Run:** same certified-seed receipt as round 1 (`receipts/certified-seed.json`, FALLBACK-labeled —
the comet cert payload question is still open upstream; determinism claims are same-seed-twice so
labeling does not affect them). Seed u32 derivation identical to round 1.
**Registration:** `registration-v2.json` (NEW file; v1 untouched), sealed pre-run —
`self_sha256_masked bc244e7d2f0cc11d…`, mtime `1790608465680`.
**Chain:** 7 rows, tip `985f32278e75…`, verify exit 0, tamper negative controls: single-byte tamper
and 1e-7-relative float tamper both localized fail-closed at the tampered row.
**Score: 3/6 claims PASS.**

| Claim | Verdict | Measured |
|---|---|---|
| R1 hard world, real learning | **FAIL** | entry loss **0.00940** (gate: > 0.05); ratio **0.998** |
| R2 EMA stationarity on world2 | **PASS** | drift/norm **1.08e-4** |
| R3 concentration statistic | **FAIL** | conc ratio **1.276** (global contrast: 1.093) |
| R4 determinism crown | **PASS** | two runs byte-identical; re-run under repaired seal reproduced tip **exactly** |
| R5 mesh conservation | **PASS** | drift **1.97e-8** rel, variance non-increasing |
| R6 impact-sensitive no-repair | **FAIL** | jump **0.989**; state invariant itself held |

## Process incident receipted (seal-tool v1 bug)

The first round-2 execution ran against an **unsealed** registration: `tools/seal-file.mjs` v1
normalized only `[0-9a-f]{64}` mask values, so the fresh `"TO_BE_SEALED"` placeholder silently
no-oped BOTH substitutions while the tool still printed "sealed". The run was declared VOID, the
tool fixed (any placeholder normalized), the registration re-sealed, and the receipt regenerated
— byte-identical tip, now legitimately post-seal. Regeneration IS restoration, but only after the
discipline violation is receipted, not hidden.

## The three FAILs localize one deeper root cause (post-verdict diagnostics, `diag2.mjs`)

The round-1 design laws (hard world / concentration / impact-sensitive corruption) were correct
diagnoses of the WRONG LAYER. The failure is beneath all three, at the **optimization layer**:

1. **D1 — entry loss is world-independent.** world2 vs the easy world differ by **2.9%** in entry
   loss (0.00960 vs 0.00933); with `Wp:=Wc` it is 0.00981 — the entry loss measures the random
   `Wp·Wc·f vs Wt·f` init mismatch, not world hardness. Worse, the learning ratio 0.998 shows the
   model learned **nothing** in 400 steps on either world: `trainStep` divides gradients by
   `N = 1024` (256 cells × 4 latents) *before* clipping, so the effective per-weight step is
   ~1/500 of the intended scale — 400 steps move weights ~3% of their init range. **The round-1
   P1 FAIL was never about world hardness; the optimizer was starving on both worlds.**
2. **D2 — surprise has zero temporal SNR when nothing is learned.** Anomaly-tick concentrated
   surprise (0.245–0.266) sits INSIDE the baseline range (max baseline tick 0.279); excluding
   occluder ticks moves the ratio only 1.115 → 1.118. A detector statistic — mean or concentrated —
   cannot separate signal from noise when the "signal" is the same random-init noise as the
   baseline. Round-1's dilution story was a symptom; the disease is the starved model.
3. **D3 — no corruption is impact-sensitive against a noise loss field.** On the top-26
   impact-ranked cells: sign-flip jump **0.932**, **zeroing jump 0.95**, jitter ±0.3 jump **1.03**.
   Even DELETING the encoders of the highest-loss cells leaves total loss unchanged, because
   `corr(pred, tgt) = −0.26 ≈ 0`: predictions are uncorrelated noise around targets whose scale
   matches the init mismatch, so |pred − tgt|² ≈ |0 − tgt|². The frozen-state invariant half of R6
   (state sha unchanged after 50 live ticks, probe recheck within 1e-9) held — nothing mutates
   without a gradient signal — but a no-repair invariant over a model that never moves is thin
   comfort, receipted as such.

## What stands

- **R2** — the WGSL EMA law (tau=0.999) is stationary on the hard world too: the target encoder's
  drift is 1.08e-4 of its norm through 200 further steps of a starving diet.
- **R4** — the determinism crown survives the seal-discipline incident itself: the post-repair
  re-run reproduced the tip `985f32278e75…` byte-for-byte. Regeneration IS restoration.
- **R5** — the Perona-Malik mesh is still a physics-legal surprise substrate on world2 energy:
  1.97e-8 relative conservation, strict variance contraction.

## Design laws for round 3 (falsifiable, to be registered before any run)

- **L1 (optimizer-first gate):** no world/detector/corruption claim may be registered on this core
  until a learning-sanity gate passes: a trivially-predictable world must show loss dropping ≥ 2x
  within 100 steps with the repaired optimizer (gradient scale: per-latent normalization or
  lr ∝ N, not raw 1/N). The gate is registered BEFORE the real claims, as a precondition.
- **L2 (difficulty measured by a world probe, not JEPA entry loss):** register a linear
  next-observation prediction baseline as the world-difficulty meter; the JEPA entry loss is
  receipted as world-independent and retired as a difficulty gate.
- **L3 (corruption claims gated on learning):** impact-sensitive corruption claims are meaningful
  only once `corr(pred, tgt)` on impact cells is materially positive (a learned prediction
  structure); register the correlation as a precondition measurement, not a post-hoc diagnostic.

## Honest limits

- The browser/WebGPU demo remains DESIGN/DEMO only (exact-twin doctrine: the Node core is the
  verified substrate, and round 2 shows the Node core itself needs the L1 repair before any
  browser port claims learning).
- Diagnostics ran POST-verdict on the SAME deterministic seed; they gate nothing retroactively —
  the 3/6 score of record is final for this registration.
- The seed remains fallback-labeled (comet cert payload question open with census maintainers).
