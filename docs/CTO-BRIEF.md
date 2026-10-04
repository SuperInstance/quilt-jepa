# quilt-jepa — CTO Brief

## One-paragraph value statement

quilt-jepa is the fleet's longest-running falsifiable AI experiment: a tiny
world model embedded in a physics-legal cell mesh, run for eleven sealed
rounds in which every prediction was registered before every measurement,
every receipt is a hash chain, and honest failures are preserved as
findings. It proved three things organizations usually cannot buy: that a
research lane can be fully deterministic (byte-identical receipts across
eleven rounds — the R4 crown), that failures can be converted into design
laws ("easy world makes a boring model" → three registered fixes), and
that an entire round can be scored by audit alone from receipts with zero
re-execution. The substrate is small; the method it demonstrates is the
asset.

## What it does & for whom

- **AI research reviewers / methodologists:** a working example of
  pre-registration, sealed claims with mechanical verdict rules, honest
  FAIL preservation, and cross-round bit-exact re-binding.
- **Agents building in cell meshes:** the verified Node core (world + JEPA
  + Perona-Malik mesh) is a deterministic substrate for embodied-latent
  probes, with measured conservation (1.24e-8) and stationarity (1.07e-4).
- **The fleet:** the registry's most-honest PARTIAL rows live here
  (round-8's compounding REFUTED on its own pre-priced branch); the M8
  archive-coverage instrument (rounds 4–9, cumulative 98 sealed claims)
  and the stranger-resolution calibration packets were pioneered here.

## Maturity assessment

**Working research prototype, eleven rounds deep, process-hardened.**
Evidence: verify.mjs exits 0 today (chain + seal, re-verified this wave);
`run.mjs` reproduces the wave-49 receipt byte-identically (tip
`09e84771c690…`, 3/6 — verified live this wave); round-11's receipt
(24/31 claims) was independently re-derived bit-exact at audit; the R4
determinism crown is intact at eleven rounds. Not productized: no CI, no
test directory, no LICENSE (receipted in LEGIBILITY.md), demo design-only.

## Risks

| Risk | Status / mitigation |
|---|---|
| mtime-bound registration seals refuse after copy/checkout | Observed fleet-wide (same lesson as qcells). Mitigation: disclosed re-seal tool; fail-closed refusal, never false-green. |
| No CI / automated tests (LEGIBILITY.md) | Verification is `verify.mjs` + round runners; documented as the test suite. Adding CI would close the L-gap cheaply. |
| Runner accretion (run10 = 3,208 lines) | By design (carried history + bit-exact re-bindings); the build_*.py exact-match derivation keeps diffs auditable. |
| Monotone-plateau law dead at switch 5 (rho20_5 = 0.9254 < rho20_1) | Receipted honestly (SAT11 FAIL); dose-selection scoped to wd 3e-4 main / 2e-4 candidate-only until the runner-state battery resolves ordering. |
| Security | Clean: no secrets, no network in the tree; the one historical external call (comet-qrng-v1) failed closed and is archived as provenance. |

## Cost profile

- Compute: laptop-class CPU; the wave-49 runner takes seconds; the
  heaviest round (10) is still CPU-minutes. Round 11's total compute was
  ONE fresh deterministic double execution; its audit executed nothing.
- Services: none. $0 external spend disclosed across all rounds; the only
  attempted external dependency (certified QRNG seed) failed closed and
  fell back to a labeled local seed.
- Maintenance: low; the seals and chains watch the artifacts.

## Strategic options

- **Maintain + harvest-learnings (recommended):** the method (sealed
  pre-registration, receipt-of-record-first audits, honest FAIL registry)
  is already doctrine; the repo is its reference implementation. The
  round-12 agenda is priced and ready for any lane to pick up.
- **Invest:** only if an org initiative wants deterministic world-model
  substrates or anomaly-detection research on mesh surfaces; the priced
  but open items (runner-state observables, islands-law boundaries) are
  the entry points.
- **Retire:** not indicated — eleven sealed rounds of negative and
  positive results are a citation asset, and the determinism crown makes
  the repo permanently re-verifiable.

## Integration surface

- **Upstream:** the fleet's moth-seal seed service (historical), stone
  chain law (self-contained here via `JEPA-GENESIS-1` genesis), E-Q10's
  injector law from `qthe` (the P6 fault-injection lineage).
- **Downstream:** the registry/lessons ledgers in `fleet-seeds` (JEPA-R8/
  R9/R10 entries); the decomposition atlas (18-part inventory with
  file:line evidence); wave-66's substrate-family corpus.
- **Siblings:** `qthe` (the substrate family; shared honest-FAIL and
  pre-registration patterns), `quilt-qcells` (tamper-localization
  sibling), `jev-quilt` (judge doctrine).
- **Journal:** SuperInstance/superinstance-lab → worklog.md, grep
  'quilt-jepa' (wave-49 build ~659; instruments ~745; round-8 ~760–798;
  round-9 ~951–974; round-10 ~1049–1064; wave-66 ~1212–1222).
