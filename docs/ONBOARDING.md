# quilt-jepa — Agent Onboarding
> Zero-shot entry point. Clone → competent in ~10 minutes.

## Identity (2 sentences)

quilt-jepa is a tiny JEPA (joint-embedding predictive architecture) world
model living inside an anisotropic cell mesh: the 16×16 text-rendering-style
cell grid IS the latent space, each cell holds its own 4-dim latent plus a
tiny per-cell 4×4 encoder/predictor pair, and a Perona-Malik anisotropic
diffusion mesh spreads prediction-surprise across the grid under a
conservation law (energy moves and pools but is never minted or destroyed).
It is the fleet's longest-running pre-registered experiment lane — eleven
sealed rounds (waves 49–66) in which every prediction was registered before
every run, receipts are stone hash chains, and honest FAIL is a valid,
preserved verdict.

## Why it exists (the fleet problem it solves)

Wave 49 asked the fleet's "grow intelligence in inceptual novel places"
directive with a falsifiable architecture: can per-cell world models plus
surprise diffusion produce measurable learning, anomaly detection, and
fault sensitivity? The wave-49 round answered 3/6 — and the three FAILs
shared one root cause ("easy world makes a boring model"), paying for three
design laws (hard-world difficulty registration, concentration statistics
for surprise, impact-sensitive fault injection). Every later round priced
the next question under sealed registrations: learning rates, weight decay,
dose ordering, carrier batteries, depth ladders. The lane also became the
fleet's determinism testbed: the R4 crown (byte-identical cross-round
re-binding) is intact at eleven rounds, and round 11 proved a
receipt-of-record-first audit can score a round with ZERO re-execution.

## Verify it works (exact commands)

```bash
git clone https://github.com/SuperInstance/quilt-jepa.git && cd quilt-jepa

# 1. Read-only verification of the wave-49 receipt (chain + registration
#    seal; writes nothing):
node verify.mjs
# -> OK chain 7 rows, tip 09e84771c690…, claims 3/6, registration seal verified

# 2. Full wave-49 experiment (deterministic; rewrites receipts/run.json in
#    YOUR CLONE with byte-identical content — run in a scratch copy if you
#    must keep file mtimes pristine):
node run.mjs && node verify.mjs
# -> claims: 3/6 {"P1_learning":false,"P2_ema_stationarity":true,
#    "P3_anomaly_surprise":false,"P4_determinism":true,
#    "P5_diffusion_conservation":true,"P6_zero_self_repair":false}
#    OK chain 7 rows, tip 09e84771c690… (verified live, wave 69 —
#    regeneration == restoration, the P4 crown in action)

# 3. No dependencies beyond Node >= 18 (node:crypto, node:fs, node:path).
#    No network, no credentials. The later rounds (run4..run11) are
#    self-contained runners with their own sealed registrations; each
#    takes minutes and writes only into receipts/.
```

The moth-seal certified-seed path (`comet-qrng-v1`) needed external API
access at wave 49; it failed-closed to a LABELED fallback (see
`receipts/comet-raw-attempt.json` + `certified-seed.json`) — no credential
is needed or used by anything in the tree today.

## Reading order (paths, not vibes)

1. `README.md` — the architecture idea and the stone-standard rules.
2. `core/world.js` — the deterministic 16×16 world (xorshift32, wave +
   bouncing ball). 59 lines; read it to see "no Math.random" is literal.
3. `core/jepa.js` — the per-cell JEPA: Wc/Wp/Wt (4×4 per cell, 256 cells),
   hand-derived clipped-SGD `trainStep`, EMA target tau=0.999,
   `corruptWc` fault injection.
4. `core/mesh.js` — the stride-4 Perona-Malik mesh: lambda=0.2, kappa²=0.04,
   double-buffered, `totals()`/`surprise()` for the conservation claims.
5. `registration.json` + `verdict.md` — the wave-49 six claims (registered
   pre-run with verdict rules) and the honest 3/6 scoring with the unified
   root-cause analysis.
6. `verdict-v11.md` — the latest round (wave 66): provenance, resume chain,
   the R4 crown, and the priced round-12 agenda.
7. `build_run10.py` — how round runners are derived (exact-match surgical
   edits from the previous round's runner; zero/multi match aborts).
8. `docs/KNOWLEDGE-MAP.md` — the index of everything deeper.

## The things that will bite you (gotchas)

- **`run.mjs` and later round runners write into `receipts/`.** They are
  deterministic (byte-identical output), but a dog-food lane that must not
  touch the working tree should copy the repo to scratch first (the wave-66
  decomposition lane did exactly that). `verify.mjs` is the read-only twin.
- **The registration seal is mtime-bound** (±2000 ms) plus a masked
  self-sha. Copying can move mtimes and make seal checks refuse — that is
  the discipline working; `tools/seal-registration.mjs` is the re-seal tool
  and a re-seal is a disclosed event (the round-11 seal's one pre-run
  correction is disclosed at the seal itself).
- **Honest FAILs are load-bearing.** verdict.md scores 3/6 and verdict-v11
  carries SAT11 as "the round's one honest FAIL" on a branch priced BEFORE
  the confirm run. Never "fix" a verdict to green; the fleet's law is that
  a falsified prediction stays beside its registration.
- **The demo is DESIGN/DEMO ONLY.** `demo/index.html` (WebGPU/WGSL) was
  never executed headless; the Node core is the verified substrate
  (exact-twin doctrine: verified twin first, float artifact labeled).
- **`LEGIBILITY.md` findings stand:** no CI configuration, no automated
  test directory, no LICENSE file. Nothing is checked automatically on
  push; verification means running `verify.mjs`/the runners yourself.
- **Round runners are single-round artifacts** (run.mjs, run2…run11.mjs
  plus probe/design scripts): they share `core/` byte-untouched across
  rounds but each carries its own registration and constants. Read the
  header of the specific runner you run; run10.mjs alone is 3,208 lines
  because it re-binds rounds 4–9 bit-exactly before adding round-10 legs.
- **Phrase beware:** the journal never uses the phrase "death-spiral"; the
  two receipted "death" findings are (a) the wave-49 root cause "easy world
  makes a boring model" (a model-plateau finding) and (b) the lanes'
  result-return death pattern (process, absorbed by staged-resume; zero
  data lost across seven such deaths in waves 63–64).

## Where deeper knowledge lives

- Knowledge map: [docs/KNOWLEDGE-MAP.md](./KNOWLEDGE-MAP.md)
- Fleet journal: SuperInstance/superinstance-lab → worklog.md (grep
  'quilt-jepa': wave-49 build at line ~659; M8/M11 instruments ~745;
  round-8 at ~760–798; round-9 at ~951–974; round-10 at ~1049–1064;
  wave-66 decomposition at ~1212–1222)
- `receipts/` — run.json (wave-49, 7 rows) through run11.json (31 verdict
  keys, 6-row chain, tip `e8c6cfa7…`), design3–design10, coverage
  v1–v3 (the M8 archive-coverage registry: rounds 4–9, cumulative 98
  claims), certified-seed + comet-raw-attempt (seed provenance)
- `registration*.json` (v2–v11) — every round's pre-run claims; the seal
  discipline is the point
- `verdict*.md` (v2–v11) — every round's scoring with honest FAILs kept
- `calibration/` — the stranger-resolution packets (can a zero-context
  agent decide a sealed claim from artifacts alone?)
- `LEGIBILITY.md` — the read-only census pass (what this repo does not
  have: CI, tests dir, LICENSE)

## Current frontier (what is open right now)

The round-12 agenda, priced by verdict-v11 (quote-faithful):
1. The carrier battery, round 2 — runner-state observables (pace-state,
   window-phase, guard-headroom) extracted from the existing five-depth
   ladder runs, S2 dose-gap sign series registered BEFORE any new dose
   compute; rule of record stays "detects AND localizes".
2. The fifth-switch degradation is honestly left unpriced (receipted
   gate-nothing): the monotone-plateau law is dead at switch 5
   (rho20_5 = 0.9254 < rho20_1) while the level advantage persists.
3. The islands law's two unmapped legs (island-L lower edge s < 0.55; gap
   interior 0.675–0.925) — only if a downstream consumer needs the domain.
4. Dose-selection remains OPEN: wd 3e-4 longevity main, wd 2e-4
   candidate-only; the ordering mechanism must first survive the
   runner-state battery.
5. M8 coverage: registry remains v3 (rounds 4–9, cumulative 98); a v4
   upgrade must itself be registered to fold round-11's row.
