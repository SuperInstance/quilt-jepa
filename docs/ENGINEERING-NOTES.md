# quilt-jepa — Engineering Notes

## Architecture

Three deterministic layers and a receipt plane:

```
   seed (xorshift32; wave-49 seed 2133245488, fallback-labeled provenance)
     |
     v
 core/world.js      16x16 luminance grid: standing wave (phase1/phase2,
     |  observe()    waveFreq 0.35-0.55, drifting) + bouncing ball 2x2 bump
     v
 core/jepa.js       per-cell JEPA: features [luminance, right-diff,
     |              down-diff, l-0.5] -> Wc (4x4) -> zCtx -> Wp -> zPred
     |              target = Wt (EMA of Wc, tau=0.999) on obs(t+1)
     |  trainStep   clipped SGD on Wc,Wp against frozen Wt; loss = MSE
     v              in latent space ONLY (no pixel reconstruction)
 core/mesh.js       Perona-Malik anisotropic diffusion, stride-4 buffers,
     |  step()      lambda=0.2, kappa^2=0.04; energy channel diffuses with
     v              conductance exp(-(dGrad)^2/kappa^2) per neighbor
     |              => energy flows along edges, pools in flat regions,
     |                 conserved (pairwise symmetric exchange), variance-
     v                 contracting
 receipts/          stone chains from JEPA-GENESIS-1; runN.json per round;
                    verify.mjs walks chain + registration seal (fail-closed)
```

Data flow per experiment: seed → world observations at t, t+1 → encode /
predict / target → loss → SGD step → per-cell surprise (|zPred − zTgt|²)
loaded into mesh channel 3 → diffusion steps → `totals()`/`surprise()`
sampled at registered tick sets → chain rows appended → receipt written →
verdict scored against the pre-sealed registration.

## Invariants

1. **Determinism (P4's law).** Same seed ⇒ byte-identical receipts. The
   only PRNG is xorshift32; no Math.random in the core; Float32 IEEE-754
   arithmetic makes Node runs reproducible. Proven at wave 49 (re-run after
   seal repair reproduced the tip exactly) and preserved at eleven rounds
   (the R4 crown: round-4 metrics re-bind bit-exactly in every later run;
   round 11 executed the core twice, `450a8560…` both execs).
2. **Mesh conservation + contraction (P5's law).** Total energy conserved
   within 1e-6 relative (measured 1.24e-8) and variance strictly
   non-increasing over consecutive diffusion steps, lambda ≤ 0.25.
3. **EMA stationarity (P2's law).** Target-encoder L2 drift over the final
   200 steps < 1% of its norm (measured 1.07e-4 — 24× under the bar).
4. **Sealed registration precedes measurement.** Every round's claims +
   verdict rules exist sealed before the run; runners re-verify the seal
   at startup fail-closed; the round-11 receipt records
   `seal_verified_at_startup`.
5. **Latent-only learning.** No pixel reconstruction anywhere; the loss is
   defined in latent space by registration law.
6. **Verdicts immutable as scored.** Honest FAILs stay (wave-49's 3/6;
   round-8's MECH FAIL on its pre-priced saturation branch; round-11's
   SAT11 DEGRADATION FAIL). Corrections are disclosed verbatim
   (THIRTY-SEVEN/FORTY label note), never silently applied.

## Failure modes & blast radius

- **Seal refuses (registration moved):** runners exit before any compute.
  Blast radius: zero; remedy is a disclosed re-seal.
- **Chain tamper:** verify/audit names the first violated row; the tip
  makes the whole row sequence tamper-evident; published tips
  (`09e84771c690…` wave-49; `cca59bd5…` run10; `e8c6cfa7…` run11) are the
  out-of-band anchors.
- **"Easy world" degeneracy (the wave-49 finding):** a smooth world makes
  initial loss already near floor, so learning/anomaly/fault claims lose
  meaning (ratios 0.948 / 1.098 / 0.979). Contained by the three design
  laws it minted — register difficulty, use concentration statistics,
  impact-sensitive corruption — which later rounds adopted.
- **Float-vs-fixed / JS-vs-WGSL drift:** contained by the exact-twin
  doctrine — the verified Node twin is the substrate of record; the
  WebGPU demo is labeled DESIGN/DEMO and never executed headless.
- **Lane deaths (process):** seven result-return deaths across waves 63–64
  and two in round-11's lineage (66-b, 66-b-r2) — all absorbed by
  staged-resume discipline with zero data loss; round 11 finished as a
  pure audit (no re-execution) because the prior incarnation's receipt was
  structurally complete on disk.
- **No CI/tests (LEGIBILITY.md):** nothing re-verifies on push; blast
  radius is silent drift if a lane skips running verify — mitigated
  culturally by receipts-as-citations and by every verdict quoting its
  chain tip.

## Performance & cost envelope

- The wave-49 runner (two full core runs + 100 diffusion steps + chain
  writing) completes in seconds on a laptop; verified live this wave in a
  scratch copy (exit 0, byte-identical tip).
- Round 10's receipt is 46,056-byte-class JSON with 29-row chains and a
  3,208-line runner; rounds remain CPU-seconds-to-minutes lanes.
- Compute spend disclosed per round: round 11 = exactly ONE fresh
  deterministic double execution (SAT11 confirm) + 20k-prefix
  reproductions; CARRIER11/DIP11 were zero-compute re-scorings; the
  66-b-r3 audit executed nothing. $0 external throughout.
- The demo renders the same grid on WebGPU (design-only; no perf numbers
  claimed).

## Operations

- **Runbook:** `node verify.mjs` (read-only) → `node run.mjs` per round
  runner (each re-verifies its own seal) → read the verdict against the
  registration.
- **Publishing:** registration committed and pushed BEFORE execution
  (round-11 lineage: `b69cf7f` sealed + pushed pre-run; runner staged
  pre-run at `d652941`); receipts and verdicts follow; remote==local
  verified per fleet law.
- **Credentials model:** none in-repo. The only credential-shaped event in
  history was the moth-seal comet-qrng-v1 attempt (cert payload incomplete
  → fail-closed to LABELED fallback; raw attempt archived). Nothing in the
  tree needs keys today.
- **Anchors:** publish each round's chain tip; the audit-time re-derivation
  from genesis is the standing challenge procedure.

## Design decisions & why

1. **Cells as the latent space.** One 4-dim latent per cell with private
   4×4 matrices makes the world model local, auditable, and mappable onto
   the mesh's diffusion physics — the architecture claim itself. Tradeoff:
   256 tiny linear models learn almost nothing hard; that became the
   finding, not a bug.
2. **Perona-Malik for surprise.** Conductance-gated diffusion concentrates
   energy at edges and pools it in flat regions while conserving the total
   — a physics-legal surprise substrate. Tradeoff: a mean-over-cells
   statistic dilutes point anomalies (P3's 1.098× FAIL); the concentration
   statistic is the registered fix.
3. **Pre-registration with verdict rules, not vibes.** Each claim carries
   its PASS/FAIL rule; scoring is mechanical. Tradeoff: predictions can be
   wrong (G4-style, P-B1-style, SAT11) — which is the point; the registry's
   honest FAILs are its most cited artifacts.
4. **Runners derived by exact-match surgical edits** (build_run10*.py).
   Every replacement asserts exactly one match; the diff between rounds is
   reviewable text. Tradeoff: runners accrete (3,208 lines); gain: zero
   silent drift, and the carried shas make cross-round re-binding
   checkable.
5. **Receipt-of-record-first (rounds 10–11).** Score rounds from existing
   receipts when the receipt is structurally complete; re-execute nothing.
   Tradeoff: trust moves to hash chains; gain: backend result-return
   deaths (two in the round-11 lineage) cost zero data, and the audit is
   reproducible by anyone from artifacts alone.
6. **Fallback-labeled seeds.** When the certified QRNG path failed
   (comet cert payload incomplete), the seed was fail-closed to a LABELED
   fallback rather than passed off as certified, and the determinism claim
   was scoped so it never depended on seed certification (same seed twice).
