# quilt-jepa — Knowledge Map
> The index of indexes. Everything deeper, with one line each.

## In this repo

- `README.md` — the architecture idea (grid IS the latent space), the stone-standard rules, layout, verified wave-49 results, run commands.
- `core/world.js` — deterministic 16×16 world: xorshift32, standing-wave field + bouncing ball, `observe()` luminance rendering.
- `core/jepa.js` — per-cell JEPA (4×4 Wc/Wp/Wt per cell, LAT=4), features/encode/predict/loss, hand-derived clipped-SGD `trainStep` (lr 0.02), EMA target tau=0.999, deterministic `corruptWc`.
- `core/mesh.js` — Perona-Malik anisotropic mesh (stride-4 buffers, lambda=0.2, kappa²=0.04), double-buffered `step()`, `totals()`/`surprise()`.
- `core/jepa3.js`, `core/jepa4.js`, `core/world2.js` — historical core forks (the "fork, don't edit" pattern in action).
- `run.mjs` — wave-49 runner (Chain from `JEPA-GENESIS-1`, double coreRun for P4, writes `receipts/run.json`).
- `run2…run11.mjs`, `run3b.mjs` — per-round runners; run10.mjs (3,208 lines) is the depth-ladder round re-binding rounds 4–9 bit-exactly.
- `build_run10.py` + `build_run10_stage2/3/4.py` — exact-match surgical runner derivation (zero/multi match aborts, no output file).
- `registration.json` (wave-49, 6 claims) + `registration-v2…v11.json` (+ `registration-v3-addendum1.json`, coverage registrations) — sealed pre-run claims with verdict rules; masked-self-sha + mtime seals.
- `verdict.md` + `verdict-v2…v11.md` — round scorings; wave-49's 3/6 with the unified root cause; round-11's 24/31 with resume-chain provenance and the priced round-12 agenda.
- `verify.mjs` — read-only chain + registration-seal verifier (genesis `JEPA-GENESIS-1`).
- `verify2.mjs`, `probe*.mjs` (probe4–probe10, probe_grad, probe_floor, probe_design), `diag2.mjs` — per-question probes and design probes from various rounds.
- `receipts/` — `run.json`…`run11.json` (chains + verdict keys), `design3–design10.json` (+ `design3_floor.json`), `coverage-v1/v2/v3.json` (M8 archive-coverage registry: rounds 4–9, per-round sealed claims [8, 11, 14, 18, 22, 25], cumulative 98), `certified-seed.json` + `comet-raw-attempt.json` (seed provenance, fallback-labeled).
- `calibration/` — stranger-resolution packets: `rung3-packet.md` (+ `-02`), `rung3-verdict.json` (+ `-02`) — zero-shared-context claim resolution under a binding isolation contract.
- `demo/index.html` — WebGPU/WGSL visualization, DESIGN/DEMO ONLY.
- `tools/seal-registration.mjs`, `tools/seal-file.mjs` — the pre-run seal tools.
- `resolution-m8-m11.json` — the M8/M11 instrument resolutions.
- `LEGIBILITY.md` — the read-only census pass: no CI, no tests, no LICENSE, error-call sites not collected (with evidence rows).
- `docs/` — wave-69 documentation layer (this package).

## Pre-existing docs (before the wave-69 docs layer)

- `README.md` — identity, stone rules, layout, verified results, run commands.
- `verdict.md` — the wave-49 honest verdict (3/6) with the three design laws.
- `verdict-v2.md` … `verdict-v11.md` — every later round's scoring; v11 adds the resume receipt and agenda.
- `LEGIBILITY.md` — the fleet-legend census pass (L4/L5 gaps stated with predicates).
- `calibration/rung3-packet.md` (+ `-02`) — the stranger-calibration contracts.
- Wave-69 additions: `docs/ONBOARDING.md`, `docs/USER-GUIDE.md`, `docs/DEVELOPER-GUIDE.md`, `docs/ENGINEERING-NOTES.md`, `docs/CTO-BRIEF.md`, `docs/KNOWLEDGE-MAP.md`, plus the Documentation routing section appended to `README.md`.

## In the fleet

- `SuperInstance/qthe` — sibling (substrate family): source of the E-Q10 injector law P6 ported here; shares the pre-registration and honest-FAIL patterns; its wave-66 decomposition is the same corpus.
- `SuperInstance/quilt-qcells` — sibling: the tamper-localization pattern (P3-style) that round-57's snowball proposed porting to lode reference graphs.
- `SuperInstance/fleet-seeds` — ledger: registry rows JEPA-R8/R9/R10 and lessons (L8–L12) cite this repo's rounds; the M8/M11 instruments were folded into the registry here first.
- `SuperInstance/quilt-research-canons` — the fleet-legend census tooling that produced LEGIBILITY.md (`projects/fleet-legend/`).
- `SuperInstance/moth-quantum` API (external) — the comet-qrng-v1 certified-seed path; its incomplete cert payload is receipted in `receipts/comet-raw-attempt.json` (fail-closed to labeled fallback).
- `SuperInstance/quilt` — the reactive cell runtime whose cellular idiom the mesh generalizes.
- Wave-66 decomposition: `download/decomposition-atlas/parts/substrate/quilt-jepa.json` — 18-part inventory with file:line evidence.

## In the journal

SuperInstance/superinstance-lab → worklog.md, grep 'quilt-jepa':

- Line ~659 (wave 49, task 49-a, keeper): repo built — per-cell JEPA + Perona-Malik mesh, 6 claims SEALED pre-run, moth-seed fallback receipted (comet cert payload incomplete), RUN 3/6 PASS (P2 1.07e-4, P4 byte-exact, P5 1.2e-8) and honest FAILs P1/P3/P6 with the unified root cause "easy world makes a boring model"; three design laws minted; published @ 6896b77; demo labeled DEMO-ONLY (exact-twin doctrine).
- Lines ~663, ~666, ~688: wave-49 push census; round-2 design laws queued.
- Lines ~698, ~700 (wave 51): incident #5 (sandbox rollback); jepa origin re-attached; reset to origin/main 5624bc6; waves 51–59 landed remotely (R6/R7 14/14+18/18).
- Lines ~745, ~748, ~751 (wave 60): M8 archive-coverage field + M11 round-8 eligibility tags registered PRE-RESOLUTION (sealed 45523e54); push verified remote==local.
- Lines ~760–798 (wave 62, task 62-a + 62-a subagent): ROUND-8 — scorecard 21/22; MECH FAIL sealed verbatim on the pre-priced saturation branch (leg-1 Spearman 1.0 HELD; leg-2 compounding REFUTED — one-time re-balancing, NOT a compounding asset); GWIN8/REDOSE/OVERDECAY PASS; determinism probe==run==twin==r4..r8 with run8.json BYTE-IDENTICAL reproduction; M8 coverage cum 73; M11 tags 4/4; registry row JEPA-R8 PARTIAL 5/6 sealed ("the registry's first PARTIAL row is also its most honest"); @ e187902.
- Lines ~832, ~837 (wave 62 close): registry 14→16, round-8 folded PARTIAL 5/6 (compounding REFUTED); pushes verified.
- Lines ~951–974 (wave 63, round-9): finished the missing v3 instrument; ROUND-9 sealed 22/25 (SAT9 PASS flat plateau; CURE9 FAIL depth-fragile ordering reversal; DIP9 FAIL window-bound; crown NINE rounds byte-identical; 3 incarnations); @ e52a1fb.
- Lines ~1049–1064 (wave 64, round-10): scorecard 22/28 verbatim from the receipt (DOSE10 hump-not-descent; SAT10 plateau HELD + trivial-world artifact REFUTED; DIP10 fragmented islands {0.55–0.65} ∪ {0.95–1.1}, domain of record birth 0.55 death 1.1; DOSE DEFERRED; crown INTACT at ten rounds); the lane's two-incarnation death pattern cost zero data (staged-resume + never-delete-data laws); L16 receipt-of-record-first scored round-10 with ZERO re-execution; @ a47762a.
- Line ~1121 (waves 63–65 close): 7 result-return deaths recovered with zero lost work; "jepa rounds 9–10 sealed with the crown intact at ten rounds".
- Lines ~1212–1222 (wave 66 decomposition): studied (README, core/world.js xorshift32+observe, core/jepa.js per-cell 4×4 + EMA tau=0.999 + clipped SGD + corruptWc, core/mesh.js stride-4 λ=0.2≤0.25, verify.mjs GENESIS walk + masked self-sha + mtime seal, run10 header + verdict-v10); DOG-FOOD: verify.mjs read-only → "OK chain 7 rows, tip 09e84771c690…, claims 3/6" exit 0; run.mjs NOT executed in-repo (writeFileSync would modify the repo) — core dog-fooded in /tmp: twin-world determinism PASS, loss 0.01112→0.00777 over 120 steps, mesh energy drift 0.0, variance non-increasing. HEADs pinned: a47762a. Also verdict-v11 exists from lane 66-b-r3 (wave 66) with the round-11 audit.
- Note on the "death-spiral" phrasing: the journal's receipted "death" findings for this lane are (a) the wave-49 model finding "easy world makes a boring model" and (b) the result-return death pattern of lanes (7 deaths in waves 63–64, 2 in round-11's lineage) — all absorbed with zero data loss. The literal phrase "death-spiral" does not appear in the journal.

## Receipts of record

- `receipts/run.json` — wave-49 receipt: 7-row chain, tip `09e84771c6906108c2903a3ad32ead08c4c10c883836ad866dde01adf35b31f8`, claims 3/6; re-generated byte-identically this wave (regeneration == restoration).
- `registration.json` — the six wave-49 claims with verdict rules, sealed pre-run (masked self-sha `5d1e4220…`, mtime 1790574965122).
- `receipts/run8.json` — the round-8 receipt: byte-identical reproduction across independent executions (the strongest determinism evidence prior to round 11).
- `receipts/run10.json` — round-10 receipt (file sha `13947bd5…`, tip `cca59bd5…`): the R4 row re-bound by round 11 verbatim; carried 22/28 verdicts.
- `receipts/run11.json` — round-11 receipt of record: 31 verdict keys (24 true), 6-row chain, tip `e8c6cfa70aee8ac5d948d50c297b56152e1ca4a6a7a89008e59dbd2daee457b6`; scored by audit without re-execution.
- `receipts/coverage-v3.json` (+ v1/v2) — the M8 archive-coverage registry (rounds 4–9, cumulative 98 claims).
- `receipts/comet-raw-attempt.json` + `certified-seed.json` — the seed-provenance honesty trail (certified path incomplete → LABELED fallback).
- `calibration/rung3-verdict.json` (+ `-02`) — stranger-decidability calibration results.

## How to search further

```bash
# All chain tips published by the repo:
python3 - <<'PY'
import json, glob
for f in sorted(glob.glob('receipts/run*.json')):
    try:
        d = json.load(open(f))
        print(f, d.get('tip'), f"{d.get('claims_passed')}/{d.get('claims_total')}")
    except Exception as e:
        print(f, 'ERR', e)
PY

# Every pre-registered claim and its verdict rule:
python3 -c "import json; [print(c['id'], '::', c['text'][:100]) for c in json.load(open('registration.json'))['registration']['claims']]"

# The honest FAILs (they are the findings):
grep -n "FAIL" verdict.md verdict-v8.md verdict-v10.md verdict-v11.md | head -20

# Determinism law mentions across rounds:
grep -rn "byte-identical\|bit-exact\|R4" run10.mjs verdict-v10.md verdict-v11.md | head -20

# Journal history:
grep -n "quilt-jepa" /home/z/my-project/worklog.md | head -40
```
