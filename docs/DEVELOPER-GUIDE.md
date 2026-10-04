# quilt-jepa — Developer Guide

## Code layout

| Path | What it is |
|---|---|
| `core/world.js` | The deterministic world: `GRID = 16`, `xorshift32(seed)` PRNG, `World` class (wave phases/frequency from the seed, bouncing ball with reflect-at-boundary), `observe()` renders luminance = wave + 2×2 ball bump (+0.6, clamped). |
| `core/jepa.js` | `Jepa`: per-cell `Wc/Wp/Wt` (Float32Array `CELLS*4*4`), `features()` → [luminance, right-diff, down-diff, l−0.5], `encode`/`encodeTarget`/`predict`, MSE `loss`, `trainStep` (hand-derived gradients, per-element clip to [−1,1], lr 0.02, EMA tau=0.999 target update), `corruptWc(fraction, seed)` (deterministic sign flips via xorshift32). |
| `core/mesh.js` | `Mesh`: stride-4 buffers [luminance, angle, gradient magnitude, energy], `kappaSq = 0.04`, `lambda = 0.2`; `step()` is one Perona-Malik pass on channel 3 (conductance `exp(−Δgrad²/κ²)` per neighbor, pairwise exchange); `totals()` (total/mean/variance), `surprise(sampleIdx)`. |
| `run.mjs` | The wave-49 runner: `Chain` (genesis `JEPA-GENESIS-1`, rows `{i,id,type,payload,prev,sha}`), double `coreRun` for P4, writes `receipts/run.json`. |
| `run2…run11.mjs`, `run3b.mjs` | Later-round runners; each header pins its registered constants and cross-round bit-exact re-bindings (run10.mjs is the 3,208-line depth-ladder round). |
| `build_run10.py` (+ `_stage2/3/4.py`) | The runner-derivation tooling: exact-match surgical edits from the previous runner; every replacement asserts exactly ONE match, zero/multi aborts with no output file. |
| `registration.json`, `registration-v2…v11.json` (+ addenda) | Pre-run claims with verdict rules; the seal discipline (masked self-sha + mtime binding) described in each file. |
| `verdict.md`, `verdict-v2…v11.md` | Round scorings; honest FAILs verbatim; round-11 adds the resume-receipt provenance and priced round-12 agenda. |
| `verify.mjs` | Read-only verifier for `receipts/run.json`: chain walk from genesis + registration seal check. Exit 0 only if everything re-hashes. |
| `tools/seal-registration.mjs`, `tools/seal-file.mjs` | The pre-run seal tools (masked self-sha; mtime forced back via utimes so the recorded mtime binds the sealed bytes). |
| `receipts/` | `run.json` (wave-49) through `run11.json`; `design3–design10.json` (pre-run design probes); `coverage-v1/v2/v3.json` (M8 archive-coverage registry); `certified-seed.json`, `comet-raw-attempt.json` (seed provenance). |
| `calibration/` | Stranger-resolution packets (`rung3-packet.md` + verdicts): can a zero-context agent resolve a sealed claim from artifacts alone, under a binding isolation contract. |
| `probe*.mjs`, `diag2.mjs`, `verify2.mjs` | Per-question probes from various rounds (gradient probes, floor probes, design probes). |
| `demo/index.html` | WebGPU/WGSL visualization — DESIGN/DEMO ONLY, never executed headless (exact-twin doctrine). |
| `LEGIBILITY.md` | The read-only census pass: no CI, no test suite, no LICENSE — stated with evidence. |
| `docs/` | Wave-69 documentation layer (this package). |

## Core concepts

Named as the code names them:

1. **xorshift32 determinism.** The only randomness source anywhere is
   `xorshift32(seed)` (world.js): `s ^= s<<13; s ^= s>>>17; s ^= s<<5`.
   Zero-seed maps to `0x9e3779b9`. Every stochastic-looking thing (weights,
   corruption, ball spawn) draws from it, so "same seed" means same
   everything.
2. **Per-cell latents (LAT=4, CELLS=256).** The mesh IS the latent space:
   features are 4 local scalars per cell; `Wc` encodes, `Wp` predicts,
   `Wt` is the EMA target (tau=0.999, stop-gradient by construction — the
   target is computed from `Wt`, never backpropped into).
3. **The latent-only loss (the JEPA law).** `loss = mean((zPred − zTgt)²)`
   over all cell latents. No reconstruction term exists; the registration
   states it as law.
4. **Perona-Malik conservation (P5's law).** Energy exchange is pairwise
   symmetric (`c·(e_neighbor − e_cell)` summed over 4 neighbors with
   conductance ≤ 1), so total energy is conserved and variance is a strict
   contraction. lambda=0.2 ≤ 0.25 is the explicit stability bound.
5. **The Chain (stone law).** Rows `{i, id, type, payload, prev, sha}` with
   `sha = sha256(prev : JSON.stringify({i,id,type,payload}) : id)` from
   genesis `JEPA-GENESIS-1`. The tip pins row order AND content; the
   verifier walks it fail-closed.
6. **Sealed registration.** Claims carry id, text, verdict_rule. The seal
   binds the file to itself (sha256 with the self-sha field masked to 64
   zeros) and to time (mtime forced back via utimes, checked ±2000 ms).
   Runners re-verify the seal at startup and refuse if it moved.

## How to extend

### Derive the next round's runner (the build_run10 pattern)

1. Copy the previous round's runner to `build_run11_stageN.py`-style
   scripts (or follow the existing four-stage split: header/constants,
   metrics, claims, scoring).
2. Every edit is an exact-match replacement: `rep(old, new, label)` where
   `n = out.count(old)` MUST equal 1 — zero or multi matches abort with no
   output file. This makes runner derivation auditable (the diff IS the
   registration delta).
3. Pin every carried metric: a new runner must re-bind previous rounds'
   shas bit-exactly (the run10 header shows the full sha list) and carry
   prior verdict booleans verbatim (`carried_verdicts`).
4. Register before running: write `registration-vN.json` (claims +
   verdict_rules + probes_receipted_pre_seal), seal it with
   `tools/seal-registration.mjs`, commit and push BEFORE execution (the
   round-11 lineage shows the seal re-verified fail-closed at startup).

### Add a probe

Probes (`probe*.mjs`) are single-question scripts: import `core/`, run the
registered configuration, print one number, optionally seal a design
receipt (`receipts/designN.json`). Keep them separate from runners — a
probe is allowed to fail informatively; a runner's verdicts are law.

### Touch the core (rare and load-bearing)

`core/` is byte-untouched across rounds 4–11 by design; any change breaks
the R4 crown (bit-exact cross-round re-binding) and forces a new lineage.
If you must: fork the file (`core/jepa3.js`, `core/jepa4.js`,
`core/world2.js` show the historical pattern — new files, old ones kept),
re-register everything the change touches, and re-run the determinism
crown from scratch.

### Extend the demo honestly

`demo/index.html` mirrors the Node core's WGSL laws (the emaUpdateKernel
tau=0.999 law in JS is cited in jepa.js). The exact-twin doctrine says:
the verified twin (Node) comes first, and the browser artifact is labeled
DESIGN/DEMO until it too carries receipts. Do not remove the label.

## Testing

There is no test directory (LEGIBILITY.md receipts this). The verification
surface is:

```bash
node verify.mjs                 # read-only: chain + seal (wave-49 receipt)
node run.mjs && node verify.mjs # full wave-49 experiment, deterministic
# later rounds: node runN.mjs (each re-verifies its registration seal at
# startup and refuses fail-closed on a moved seal)
```

Green means: verify exits 0 with `OK chain 7 rows, tip 09e84771c690…,
claims 3/6, registration seal verified`, and a re-run of run.mjs produces
byte-identical receipts (P4's own law). For rounds 4–11 the equivalent
green is each runner's own seal-check plus its carried R4 row re-binding
bit-exactly.

## Conventions

- **Registration before execution, always.** Claims and verdict rules are
  written and sealed before any measurement; probes that informed a design
  are receipted as such (`probes_receipted_pre_seal`).
- **Verdicts are scored as registered.** No threshold surgery; if the
  registered rule was stale (round-11's THIRTY-SEVEN/FORTY label note), the
  receipt discloses it verbatim instead of fixing it silently.
- **Numbers come from receipts.** Verdicts read numbers from runN.json and
  say so; "every number above is read from receipts/run11.json … not
  re-measured".
- **Spend and compute are disclosed** per round ($0 external; exactly ONE
  fresh double execution in round 11).
- **No wall-clock in chain payloads** where determinism claims depend on
  byte-identity; the receipts that must carry timestamps disclose their
  normalization (two_reader precedent) — jepa's own chains avoid them.

## Gotchas for editors

- Editing `core/` breaks eleven rounds of bit-exact re-binding. Fork the
  file instead (historical pattern: `jepa3.js`, `world2.js`).
- The runners are long because they carry history (run10 = 3,208 lines).
  Do not "refactor" a runner between registration and execution.
- `verify.mjs` checks only `receipts/run.json` — later rounds embed their
  own seal re-verification at startup; do not assume verify covers all.
- The seal's mtime binding breaks under mtimes-normalizing filesystems
  (this workspace normalizes mtimes; wave-66 receipted the same for
  qcells). Re-seal knowingly and disclose, or verify elsewhere.
- `LEGIBILITY.md` is a census artifact, not a task list; if you add CI or
  a LICENSE, update it rather than deleting it.
- `receipts/designN.json` files are pre-run design probes — never edit one
  to match a later result; that is the exact fraud the chain exists to
  catch.
