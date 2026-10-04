# quilt-jepa — the latent grid: a tiny JEPA world model living inside an anisotropic cell mesh

Wave-49 experiment from the quilt fleet. The architecture idea: the text-rendering cell grid IS the latent
space — each cell holds its own 4-dim latent, a tiny per-cell world model predicts its latent future, and a
Perona-Malik anisotropic mesh diffuses prediction-surprise across the grid (energy flows along edges, pools
in flat regions, and never minted nor destroyed — conservation receipts included).

Everything here obeys the stone standard: predictions registered and sealed **before** runs, receipts are
stone chains (verify CLI, fail-closed), honest FAIL is a valid verdict, and the seed is minted by the
fleet's moth-seal service (labeled fallback when the certified path fails).

## Layout

- `registration.json` — 6 pre-registered claims, sealed (masked self-sha + mtime binding)
- `core/world.js` — deterministic 16×16 world (wave field + bouncing ball), xorshift32-seeded
- `core/jepa.js` — per-cell JEPA: 4×4 context encoder + predictor, EMA target (tau=0.999), clipped SGD
- `core/mesh.js` — double-buffered anisotropic diffusion mesh (lambda=0.2 ≤ stability bound)
- `run.mjs` — the experiment; emits `receipts/run.json` (7-row stone chain)
- `verify.mjs` — chain + seal verifier (exit 0 only if everything re-hashes)
- `tools/seal-registration.mjs` — pre-run seal tool
- `verdict.md` — 3/6 PASS, with the full honest analysis (three design laws paid for by FAIL)
- `demo/index.html` — browser WebGPU/WGSL visualization (DESIGN/DEMO ONLY, never executed headless)

## Verified results (wave 49)

EMA stationarity 1.07e-4 · determinism byte-exact across runs · mesh energy conserved to 1.2e-8 rel with
strict variance contraction · learning/anomaly/fault-injection claims honestly FAILED with root-cause
analysis (easy world, diluted mean-surprise, flat-loss fault injection).

## Run it

```bash
node run.mjs && node verify.mjs
```

Determinism: same seed ⇒ byte-identical receipts (crown-tested). See `verdict.md` before citing numbers.

## Documentation

Wave-69 docs layer (added; nothing above was changed). Route by audience:

- Zero-shot agent entry point: [docs/ONBOARDING.md](docs/ONBOARDING.md)
- End users of the core / runners / receipts: [docs/USER-GUIDE.md](docs/USER-GUIDE.md)
- Developers extending the code: [docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md)
- Engineers operating / reviewing the system: [docs/ENGINEERING-NOTES.md](docs/ENGINEERING-NOTES.md)
- Executives deciding investment: [docs/CTO-BRIEF.md](docs/CTO-BRIEF.md)
- Index of all deeper knowledge: [docs/KNOWLEDGE-MAP.md](docs/KNOWLEDGE-MAP.md)
