# quilt-jepa — User Guide

## What you get

A tiny, fully deterministic "world model in a cell mesh" research stack:

- **A world:** a 16×16 luminance grid carrying a standing wave field and a
  bouncing ball, seeded by xorshift32 — same seed, same universe, forever.
- **A per-cell JEPA:** every one of the 256 cells owns a 4-dim latent and
  three 4×4 matrices (context encoder Wc, predictor Wp, EMA target Wt,
  tau=0.999). Training is a hand-derived, gradient-clipped SGD step in
  latent space only — no pixel reconstruction (the JEPA law).
- **A physics-legal surprise substrate:** a stride-4 Perona-Malik
  anisotropic diffusion mesh (lambda=0.2 ≤ the 0.25 stability bound) that
  moves prediction-surprise energy along edges and pools it in flat
  regions, conserving total energy (measured drift 1.24e-8 relative) and
  strictly contracting variance.
- **A receipt discipline:** every round's claims are registered and sealed
  BEFORE runs; receipts are hash chains from `JEPA-GENESIS-1`; a verifier
  fails closed; honest FAILs are preserved verbatim across eleven rounds.
- **Eleven rounds of priced findings:** from "easy world makes a boring
  model" (wave 49) through weight-decay dose ordering, carrier batteries,
  and a bit-exact determinism crown preserved at every round.

## Install

Node.js >= 18. Nothing else — the core uses only `node:crypto`, `node:fs`,
`node:path`:

```bash
git clone https://github.com/SuperInstance/quilt-jepa.git
cd quilt-jepa
node verify.mjs
# -> OK chain 7 rows, tip 09e84771c690…, claims 3/6, registration seal verified
```

That single line already verifies: every receipt row re-hashes to its pin,
parent links hold back to genesis, and the registration's masked-self-sha +
mtime seal is intact.

## First success in 5 minutes

Run the wave-49 experiment and watch the claims score:

```bash
node run.mjs && node verify.mjs
```

Expected output (deterministic — you will get exactly this):

```
claims: 3/6 {"P1_learning":false,"P2_ema_stationarity":true,"P3_anomaly_surprise":false,"P4_determinism":true,"P5_diffusion_conservation":true,"P6_zero_self_repair":false}
OK chain 7 rows, tip 09e84771c690…, claims 3/6, registration seal verified
```

Three FAILs in the output is the correct, receipted result — the round's
finding was that the world was too easy for the learning/anomaly claims to
be meaningful (see `verdict.md` for the root-cause analysis). The three
PASSes are the load-bearing physics: EMA stationarity, byte-exact
determinism, and mesh conservation.

## Everyday usage

### Verify any historical receipt

`verify.mjs` reads `receipts/run.json` specifically. For later rounds, the
same chain law (sha256 over `prev : JSON.stringify({i,id,type,payload}) :
id`, genesis `JEPA-GENESIS-1`) can be walked over any receipt:

```js
// walk receipts/run9.json (or run10/run11) with the same law
import fs from 'node:fs'; import crypto from 'node:crypto';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const doc = JSON.parse(fs.readFileSync('receipts/run9.json', 'utf8'));
let prev = 'JEPA-GENESIS-1';
for (const row of doc.chain) {
  const body = JSON.stringify({ i: row.i, id: row.id, type: row.type, payload: row.payload });
  if (row.prev !== prev) throw new Error('link break at ' + row.i);
  if (sha(`${row.prev}:${body}:${row.id}`) !== row.sha) throw new Error('hash mismatch at ' + row.i);
  prev = row.sha;
}
console.log('tip', prev === doc.tip ? 'MATCHES' : 'BROKEN', doc.tip?.slice(0, 12));
```

### Read a round properly (registration before verdict)

Every round N has three artifacts: `registration-vN.json` (claims + verdict
rules, sealed pre-run), `receipts/runN.json` (the measured receipt chain),
`verdict-vN.md` (the scoring, honest FAILs verbatim). Read them in that
order — the verdict is only meaningful against the registration it scores.

### The depth-ladder / dose series (rounds 8–11)

Rounds 8–11 price weight-decay doses and "carrier" observables across a
five-depth ladder. The round-11 verdict's headline numbers (read from
`receipts/run11.json`, not re-measured): 24/31 claims PASS; the SAT11
degradation FAIL kills the monotone-plateau law at switch 5 (rho20_5 =
0.9254 < rho20_1) while the level advantage persists (end-5 |Wc| 9.32 vs
control 17.80); dose-selection stays wd 3e-4 main, wd 2e-4 candidate-only.

### Run the demo (browser, design-only)

`demo/index.html` is a WebGPU/WGSL visualization of the same architecture.
It is labeled DESIGN/DEMO ONLY and was never executed headless — the Node
core is the verified twin. Serve it statically if you want to look at it;
do not cite numbers from it.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `FAIL registration self-sha mismatch (file mutated after seal)` | registration.json changed after its seal | This is the seal refusing to lie. Restore the sealed bytes or perform a disclosed re-seal (`tools/seal-registration.mjs`) |
| `FAIL registration mtime binding` | The file's mtime moved beyond ±2000 ms of the recorded seal (copy, checkout, workspace normalization) | Re-seal via the tool (disclosed), or verify in an environment that preserves mtimes |
| `FAIL link break at row i` / `FAIL hash mismatch at row i` | The receipt chain was tampered or truncated | The verifier names the first violated row; compare against the published tip for that round |
| `FAIL tip mismatch` | Chain valid but the stored tip was edited | Same — a named, fail-closed refusal |
| `node run.mjs` rewrote my receipts/run.json | By design: the runner emits the receipt. Content is byte-identical (determinism crown) | Run in a scratch copy if you need pristine file metadata |
| Different output than documented | You are not on the registered runner/constants, or node version differs (Float32 arithmetic is IEEE-754 deterministic; the runners pin their constants) | Check the runner header's constants block; the wave-49 core is pinned by `run.json`'s shas |
| Looking for CI/tests | None exist (receipted in LEGIBILITY.md) | Verification = `verify.mjs` + the round runners; treat that as the test suite |

## FAQ

**Q: What does "the grid IS the latent space" actually mean?**
Concretely: 256 cells, each with its own 4-dim latent and its own 4×4
matrices. There is no shared encoder and no pixel decoder; observation
features are 4 local numbers per cell (luminance, right-diff, down-diff,
deviation-from-0.5) mapped through that cell's Wc. Prediction, target, and
loss all live per-cell in latent space.

**Q: Why did wave 49 score only 3/6 — is the architecture broken?**
No — the three FAILs were the finding. The world was too smooth (initial
loss already near floor), surprise was measured as a mean over 256 cells
(a 4-cell intruder dilutes to noise), and fault injection flipped weights
in directions a flat-loss model does not care about. The registered
predictions exposed all three precisely because they were sealed before
the run; the three design laws they paid for are quoted in verdict.md.

**Q: What is the "R4 crown"?**
The cross-round determinism guarantee: the round-4 operating point
(lr 0.3, tau 0.99998, K4 = 1.5e-6, amp = 0.9, same seed) must re-bind
bit-exactly in every later round. It is preserved — not merely re-run —
at eleven rounds; round 11 added its own twin proof (core executed twice,
`450a8560…` both execs) and binds run10's R4 row verbatim with zero
cross-check mismatches.

**Q: Can I train something useful with core/jepa.js?**
It is a research substrate, not a framework: 256 tiny linear models are a
probe for embodied-latent questions, not an ML library. What it is
genuinely good at is being verified — determinism, conservation, and
fault behavior are all measurable to the bit, which is the point.

**Q: Where do the numbers in verdicts come from?**
From the receipts (`receipts/runN.json` chains), every row re-hashing from
`JEPA-GENESIS-1`. Round-11's audit is the extreme case: it scored the
round with ZERO re-execution by re-deriving every claimed quantity
bit-exactly from run10.json's own raw cells — the receipt-of-record-first
discipline.

**Q: Are the FAILs embarrassing?**
They are the product. A claim that dies "dies cheap and honest, with the
receipt kept beside the body" (the fleet law this repo operationalizes).
Round 8's compounding claim was REFUTED by its own pre-priced branch and
sealed verbatim — that is why the registry's first PARTIAL row is called
its most honest.
