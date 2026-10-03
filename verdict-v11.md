# verdict-v11 — quilt-jepa round-11 (wave 66, lane 66-b-r3)

**Provenance:** registration-v11 sealed pre-run (`24d9bc3b…`, mtime 1791200000000, commit `b69cf7f`
pushed before any execution; seal re-verified fail-closed at the run's startup — recorded in the
receipt's `seal_verified_at_startup`). The seal's one pre-run correction is disclosed at the seal
itself (commit message of record): the SAT11 anchor-leg count label fixed to FORTY — the
enumeration was unchanged, only the count label. NO design probe this round and none needed
(registration `probes_receipted_pre_seal: "NONE"`): every constant the registration references is
either a receipted run10.json value (re-bound fail-closed at startup) or a pure hash derivation
from the certified seed receipt (seedF = 3820734621 = `parseInt(sha256(selJson +
'|round11-worldF').slice(0,8),16) >>> 0` — no new entropy, no model execution). All stage-5 legs
were FIRST MEASURED inside the round-11 receipt-of-record execution; no stage-5 value existed at
seal time.

**Resume receipt (66-b → 66-b-r2 → 66-b-r3), the honest chain:** 66-b sealed and pushed the
registration, then died on a backend result-return deadline before executing. Its successor
(66-b-r2) resumed per the deadline-survival discipline — staged and committed the runner pre-run
(`d652941`, zero-shot, BEFORE the full run), executed the round's exactly-ONE priced fresh double
execution (the SAT11 confirm run + both arms' 20k-prefix reproductions), and wrote the receipt of
record — then ALSO died on a backend result-return deadline BEFORE committing the receipt or
writing any verdict. This lane (66-b-r3) is a mechanical finish: audit, score, seal — nothing
re-executed. On-disk findings, disclosed verbatim:

- **The receipt of record was already COMPLETE at audit open.** `receipts/run11.json` (46,056
  bytes, mtime 04:38:10) carries the full v10-lineage schema: `round11_constants` ✓,
  `metrics_round11` ✓, 31 verdict keys ✓, the 6-row chain ✓, tip ✓ — the file ends cleanly on the
  tip hex; no mid-write truncation. **No staging artifact and no defect receipt exist this
  round** (nothing `.run11-*` on disk): 66-b-r2's single process finished the final assembly
  before dying. Structural test: receipt complete → the mission's no-rerun branch taken.
- **Hash chain INDEPENDENTLY RE-DERIVED from GENESIS row-by-row** (`sha256(prev :
  JSON.stringify({i,id,type,payload}) : id)`, GENESIS = `JEPA-GENESIS-1`): all 6 rows valid
  (header, CARRIER11, SAT11, DIP11, R4_r11_twin_layer, CARRIED28_by_reference), every `prev` links
  and every row hash recomputes, and the re-derived tip equals the stored tip
  **`e8c6cfa70aee8ac5d948d50c297b56152e1ca4a6a7a89008e59dbd2daee457b6`**.
- **Verdict fields internally consistent:** 31 keys, 24 true, 7 false, all boolean ==
  `claims_passed` 24/31.
- **The carried receipt verified without re-execution:** `receipts/run10.json` file sha256
  `13947bd5…` == the registration's fail-closed binding; its 29-row chain re-derived from GENESIS
  at audit time to tip `cca59bd5…` == registered; the 28 verdict booleans are carried verbatim
  (22/28) — zero carried re-execution, re-scoring, or revision.
- **The receipt's re-scoring independently reproduced at audit time, bit-exact, from
  run10.json's own raw cells** (this is the claims' own registered re-derivation, not new
  compute): the Δ-series, the S1 pooled Spearman per carrier (wc baseline
  **0.9151515151515152** bit-exact), all five carriers' dose-gap series/signs/flip-sites, S3 = 6
  everywhere; the DIP11 TRUE-set, flip edges, gate set and sub-gate survivors re-derived exactly
  from the run10 scan + the run8/run9 1x anchor; every SAT11 derived quantity (rho20_5, inc5,
  rho20_5^E, inc5^E, the washout threshold, the void bound, the geometric continuation)
  re-derives bit-exactly from the receipted stage-5 ratios.

**No re-execution was performed by 66-b-r3** — the receipt was structurally complete and
chain-verified, so the deterministic work was taken as receipted. One disclosure: 66-b-r2's
pre-run commit `d652941` (run11.mjs, 1020 lines) had not reached the remote when this lane
opened; it is included in this lane's push (never-delete-data, nothing rewritten).

## Scorecard: 24/31 — CARRIER11 PASS (multi-factor re-pricing UPHELD + SHARPENED), SAT11 FAIL (priced DEGRADATION branch), DIP11 PASS (islands law confirmed Q1–Q5); all 28 carried claims read verbatim

| Claim | Verdict | Measured |
|---|---|---|
| **CARRIER11 ordering-carrier re-pricing battery** | **PASS** (P1–P5 all hold; P6 receipted) | zero new compute — the whole battery re-derives bit-exact from run10.json: S1 wc baseline **0.9151515151515152** (P1 ✓, the battery's own validity check); the Δ-hump is real with strict interior max at 40k (P2 ✓: +0.01974 → +0.03072 → **+0.03197** → +0.02817 → −0.04726, exactly 1 crossing, d\* = 75000); **the necessary-condition test FAILS for wc/first10/last10** — each dose-gap series is single-signed positive at all five depths (P3 ✓: a single-signed carrier gap cannot carry a crossing ordering at ANY depth, regardless of correlation); the normalized carriers flip OFF-SITE (P4 ✓: first10/wc at 40000→50000, last10/wc at 20000→30000 — neither at the measured crossing edge 50000→75000); winner rule of record applied (P5 ✓): pooled Spearman receipted as a **MASKER** (rho 0.9152 ≥ 0.9 while a crossing is live), rank-inversion count (6 per carrier) the summary companion, **the gap-based order statistic (S2) the only candidate with depth localization**. **P6: the round-10 multi-factor re-pricing is UPHELD and SHARPENED — no receipted single observable carries the ordering through the crossing** |
| **SAT11 fifth-switch plateau** | **FAIL** (priced DEGRADATION branch; infra PASS) | infra legs all green: both arms' 20k prefixes reproduced arithmetic-identically, **FORTY receipted anchors re-bound bit-exact (40/40)**, twin law held (metric shas `450a8560…` == `450a8560…`, byte-identical), E-cascade control leg (rho20_5^E = **0.9231214318126134** < 1.0) and both composition legs (end-5 |Wc| decayed 9.316914905905948 < control 17.795979296040215; E-cascade 9.332620770305324 < 17.80730393706955) hold. Physics: **the ABSORBED PASS branch is missed** — rho20_5 = **0.9253925880026983** < rho20_4 = 0.9720798092837104. **Fired branch: DEGRADATION** — inc5 = **−0.0466872212810121** (negative: the ratio did not merely stop expanding, it FELL — below rho20_3, rho20_2, and even rho20_1 = 0.9311659387409014), contradicting the receipted monotone-plateau law rho20_1 ≤ rho20_2 ≤ rho20_3 ≤ rho20_4. The D-cascade stage-5 ratios: 0.6053785225377458 (decayed) / 0.6541856184998757 (control) |
| **DIP11 islands-of-survival re-registration** | **PASS** (Q1–Q5 all hold) | zero new compute — the islands law of record re-derives exactly from the run10 scan + the receipted 1x anchor (dipmag 0.0736349882819407, g015 0.30409957215062605 > g020 0.25369541417668573 < g025 0.3505612327666269, localMin TRUE, interior to island-H): Q1 ✓ the TRUE-set is EXACTLY {0.55, 0.6, 0.65} ∪ {0.95, 1.0, 1.1}; Q2 ✓ every FALSE scale (0.7–0.9 gap, 1.25–1.75 dead zone) lies strictly outside both islands; Q3 ✓ full-axis flips exactly **3** (0.65→0.7, 0.9→0.95, 1.1→1.25) == the receipted low 2 + high 1; Q4 ✓ the gate set re-derives exactly G = {0.55, 0.6} ∪ {1.0, 1.1} (sub-gate shape-alive/magnitude-dead survivors: 0.65 = 0.017476543348933504, 0.95 = 0.047982296778600886); Q5 ✓ birth/death UNCHANGED **0.55 / 1.1** — a refinement of the receipted domain of record, not a revision (zero receipted values re-measured or revised) |
| G learning-sanity (carried) | PASS | 0.34923 (== run4 pin) |
| L2 difficulty meter (carried) | PASS | hard 4.2848e-4 > trivial 2.6970e-4 |
| R1 hard-world learning (carried) | PASS | 0.16931 (== run4 pin) |
| R2v4 pace-aware EMA (carried) | PASS | drift 2.640e-3 < 0.01 |
| R3v4 percentile-z surprise (carried) | PASS | z-conc 3.5407 > 3.0 |
| R3L ladder saturation (carried) | PASS | amp 1.2 == amp 0.9 bit-exact (lever closed) |
| R2x K4 cross-pace (carried) | PASS | drift 4.429e-3 @0.15 / 1.761e-3 @0.5, same K4 |
| RHOR finite horizon (carried) | PASS | D=30174, slow 1.938e-5 → runaway 7.290e-2 (3761×) |
| RLONG longevity law (carried) | PASS | main dose D=null exec=5e5, wd1e-4 D=48091, guards unrelaxed |
| R3D depth/window law (carried) | PASS | anchored 3.5407@400 / 2.2614@1200 / 3.4082@2000 / 3.1927@2200 |
| GWIN g-window law (carried) | PASS | g 0.3041@0.15(W200) / 0.4341@0.5(W60), anchor bit-exact |
| RLONG7 dose-response (carried) | PASS | 7-dose rate curve strictly monotone; bracket wd\* in (1.5e-4, 2e-4) |
| PLAST plasticity cost (carried) | PASS | 0.6644@20k / 0.5958@100k / 0.5864@500k (decayed), 0.7135@20k (control) |
| R3DxR3L composition (carried) | PASS | plateau extends to ALL depth sites bit-exact |
| GWIN7 full grid (carried) | PASS | 0.3041@0.15 / 0.2537@0.2 / 0.3506@0.25 / 0.3492@0.3 / 0.4033@0.4 / 0.4341@0.5 / 0.4271@0.6 |
| MECH plasticity-advantage mechanism (carried) | **FAIL** (honest round-8 carry, verdict read verbatim) | round-11 deepens the context, not the verdict: the ordering survives (S1 0.9152) but no single carrier carries it — see CARRIER11 |
| GWIN8 low-pace extension + dip law (carried) | PASS | g(0.1, W300) = 0.27634; dip is a LOCAL MINIMUM; dipmag 0.073635 ≥ 0.05 — this is the receipted 1x anchor DIP11 folds into island-H |
| REDOSE main-dose re-registration (carried) | PASS | rate(2e-4) = −3.778708210171146e-6 < 0; D = 85387 ≥ 60348; guards UNRELAXED |
| OVERDECAY over-decay plasticity (carried) | PASS | 0.570098@20k / 0.508588@100k, both < 1.0; no reversal |
| CURE9 cured-dose re-registration (carried) | **FAIL** (honest round-9 carry, verdict read verbatim) | the 75k ordering-reversal stands: 0.5507446127932 < 0.5980059011717661 |
| SAT9 saturation successor (carried) | PASS | rho20_3 = 0.9553466155442152 ∈ [rho20_2, 1); inc3 = 0.0003327380566972016 |
| DIP9 dip-law shape (carried) | **FAIL** (honest round-9 carry, verdict read verbatim) | window-fragile as receipted: −0.010440 / 0.073635 / −0.019046 at 0.5x/1x/2x |
| DOSE10 dose decision via depth ladder (carried) | **FAIL** (honest round-10 carry, verdict read verbatim) | Δ is a hump, not a descent; crossing d\* = 75000; dose DEFERRED |
| SAT10 fourth-switch plateau (carried) | **FAIL** (honest round-10 carry, verdict read verbatim) | inc4 = 0.016733193739495222 > inc3 (50.3×, priced EXPANDING-STEPS); plateau held rho20_4 = 0.9720798092837104 |
| DIP10 dip W-domain boundaries (carried) | **FAIL** (honest round-10 carry, verdict read verbatim) | domain FRAGMENTED: islands {0.55–0.65} ∪ {0.95–1.1}, low_flips 2, gate_low fails |
| R4 determinism crown (round-11 form) | PASS | **PRESERVED, not extended**: the deepest binding remains run10.json's R4 row (`8a3daa00…` twins); this round receipts the NEW round-11 twin layer only — the confirm run's core executed TWICE, metric shas equal (`450a8560…` both), and the run10 R4 row is bound verbatim (`8a3daa00…` == `8a3daa00…`, twins_equal) |
| R5 mesh conservation (carried) | PASS | drift 9.468e-9 ≤ 1e-6 rel |
| R6v4 impact-sensitive no-repair (carried) | PASS | corr 0.6343 > 0.3, jump 2.755 > 1.5, sha-invariant, recheck delta 0 |

## The round-10-priced questions, answered

**1. What carries the ordering through the crossing? — NOTHING SINGLE; the multi-factor
re-pricing is UPHELD and SHARPENED (CARRIER11 PASS).** The battery (three statistics × five
carriers, all from the receipted DOSE10 ladder, zero new compute) reads verbatim from the
receipt:

| carrier | S1 pooled Spearman | dose-gap series (5 depths) | single-signed? | flip site | S3 inversions |
|---|---|---|---|---|---|
| wc | **0.9151515151515152** | 1.3606 → 1.4810 → 1.5799 → 1.6890 → 2.2481 | YES (all +) | none | 6 |
| first10 | 0.6606060606060606 | 3.53e-5 → 4.94e-5 → 6.62e-5 → 8.56e-5 → 1.74e-4 | YES (all +) | none | 6 |
| last10 | 0.9272727272727272 | 3.30e-5 → 4.63e-5 → 5.68e-5 → 6.57e-5 → 8.23e-5 | YES (all +) | none | 6 |
| first10/wc | −0.5636363636363636 | −2.46e-6 → −2.04e-6 → −8.99e-7 → +5.55e-7 → +8.42e-6 | no | 40000→50000 | 6 |
| last10/wc | 0.6242424242424243 | −7.73e-7 → +7.58e-8 → +9.11e-7 → +1.70e-6 → +2.51e-6 | no | 20000→30000 | 6 |

The NECESSARY-CONDITION TEST (the battery's new instrument, registered before re-scoring) does
the work: an ordering that crosses sign at d\* requires a carrier whose dose-gap series is not
single-signed — wc, first10 and last10 are single-signed positive at every depth, so none of them
can generate the measured inversion AT ANY DEPTH, no matter how high the correlation (and the wc
baseline's rho 0.9152 is exactly the MASKER case the registration priced: it scores the pooled
ordering while being blind to the crossing). The two normalized carriers DO flip — but at
40000→50000 and 20000→30000, both OFF-SITE relative to the measured crossing edge 50000→75000;
the registration's priced single-factor-refutation branch (a flip exactly at the measured edge)
did not fire. **Winner rule of record: the gap-based order statistic (S2) — the only candidate
that both detects and localizes the crossing; pooled Spearman is receipted as a MASKER; the
rank-inversion count stays the summary companion. Outcome of record: no receipted single
observable carries the ordering through the crossing.** Consequence (P6, receipted): the round-10
multi-factor re-pricing is UPHELD and SHARPENED — the dose-selection question stays OPEN with wd
3e-4 the longevity main (unchanged) and wd 2e-4 candidate-only, and round 12 prices the
runner-state observables (pace-state, window-phase, guard-headroom — not present in the round-10
receipt) under the S2 necessary-condition test BEFORE any new dose compute.

**2. Does the fifth switch absorb the expansion into the plateau? — NO: the priced DEGRADATION
branch fired (SAT11 FAIL, the round's honest new fail).** The confirm run (the round's exactly-ONE
fresh deterministic double execution) reproduced both arms' 20k prefixes arithmetic-identically —
FORTY receipted anchors re-bound bit-exact (40/40: prefix norms, D-cascade stages 1–4 both arms,
end-1 shas `6cf16e06…`/`b929579e…`, end-2/3/4 |Wc| both arms, stage-4 first10/last10, E-cascade
stages 1–4 + stage-1/4 first10/last10 + end-4 |Wc|) — then measured stage-5 (400 steps,
World2(seedF = 3820734621), no weight reset, both arms at their own dose): rho20_5 =
**0.9253925880026983**, inc5 = **−0.0466872212810121**. Every pre-registered branch was priced
BEFORE the run: ABSORBED (the PASS branch: inc5 ≤ inc4 AND rho20_5 ∈ [rho20_4, 1)) — the first
half held (inc5 ≤ inc4 = 0.016733193739495222), the second failed: rho20_5 is not in [rho20_4, 1),
it is BELOW rho20_4. WASHOUT did not fire (rho20_5 < 1 — the registered void bound 0.9888130030232056
already made inc5 ≤ inc4 ∧ rho20_5 ≥ 1 arithmetically impossible, exactly as registered).
EXPANDING-BUT-ABSORBED did not fire (inc5 is negative). **DEGRADATION fired: rho20_5 < rho20_4 —
the advantage SHRANK at the fifth switch, contradicting the receipted monotone-plateau law.** The
honest shape of the finding: the accumulated plateau did not erode gradually — the ratio fell to
0.9254, below rho20_3 (0.9553466155442152), rho20_2 (0.955013877487518) and even rho20_1
(0.9311659387409014): a single fifth window undid three switches of accumulation. The E-cascade
control leg held (rho20_5^E = 0.9231214318126134 < 1.0; inc5^E = −0.05838579792328835 — the
degradation is cascade-general in SIGN) and both composition legs held (end-5 |Wc| decayed <
control on both cascades: 9.316914905905948 < 17.795979296040215; 9.332620770305324 <
17.80730393706955) — the ADVANTAGE persists in level and in |Wc| even as the ratio plateau
degrades. Infra verdict PASS (anchors + twin); physics verdict FAIL on the fired priced branch.

**3. Is the fragmented W-domain lawful as islands? — YES: the islands-of-survival law of record is
CONFIRMED on all five pre-registered predictions (DIP11 PASS).** The re-registration (zero new
compute) replaces the dead interval law with F = island-L [0.55, 0.65] ∪ island-H [0.95, 1.1] at
the receipted resolution, the gap {0.7–0.9} and dead zone {1.25–1.75} as parts of the law, the
registered window 1x INTERIOR to island-H, and the magnitude-gated survivor set G = {0.55, 0.6} ∪
{1.0, 1.1}. Q1–Q5 all hold exactly (see scorecard row). Consequence of record: DIP9's
window-fragility and DIP10's fragmentation FOLD into the islands law as its two legs — the dip
law's third honest fail is resolved into the receipted domain shape, not left as a dangling
refutation. Unmapped-at-resolution (receipted, gate-nothing): island-L's lower edge (s < 0.55) and
the gap interior (0.675–0.925).

## Honest notes of record

- **SAT11 is the round's one honest FAIL** — on a branch priced in the registration BEFORE the
  confirm run (DEGRADATION: "the advantage shrinks, contradicting the receipted monotone-plateau
  law"). No threshold surgery anywhere: the ABSORBED pass branch was scored exactly as registered,
  the washout threshold of record (1 − rho20_4 = 0.027920190716289595, only
  1.6685512132922835× inc4) was re-derived bit-exact, and the registered structurally-void branch
  (rho20_4 + inc4 = 0.9888130030232056 < 1) was respected by the arithmetic exactly as priced.
- **The THIRTY-SEVEN/FORTY label note, disclosed:** registration-v11's SAT11 claim text says
  FORTY anchors (the pre-run-corrected count label, commit `b69cf7f`); its verdict_rule sentence
  retains the stale THIRTY-SEVEN label. The receipt discloses this verbatim
  (`anchor_label_note` + `registered_count_text: 40` / `verdict_rule_stale_label: 37`); the
  enumeration itself is unchanged and complete at FORTY legs, all 40 bound bit-exact — the infra
  gate is satisfied a fortiori (40/40 ⊇ 37/37). Label-only; no physics affected.
- **Every carried claim is a read, not a re-run:** the run10.json chain re-derived from GENESIS
  at startup (fail-closed, tip `cca59bd5…`), the 28 verdict booleans copied verbatim into
  `carried_verdicts` (22/28), zero carried re-execution — the L16 receipt-of-record-first
  discipline, second consecutive round.
- **The R4 crown:** TEN rounds deep, PRESERVED not extended — the round-11 layer adds its own
  twin proof (core executed TWICE, `450a8560…` both execs) and binds run10's R4 row (`8a3daa00…`)
  verbatim; zero cross-check mismatches.
- **Resume/assembly disclosure:** the lineage 66-b → 66-b-r2 → 66-b-r3 carries two backend
  result-return deaths, both receipted here. 66-b-r2's work landed intact: the pre-run runner
  commit `d652941` (unpushed at lane open, included in this lane's push) and the completed receipt
  of record (04:38:10). 66-b-r3 executed NOTHING: no physics, no re-derivation of measured
  quantities — the audit's only compute was the registered re-derivations from existing receipts
  plus this document.
- **Spend:** $0 external. Round-11 total compute: exactly ONE fresh deterministic double
  execution (the SAT11 confirm run) + prefix reproductions, executed by 66-b-r2; CARRIER11 and
  DIP11 are zero-compute re-scorings; this lane spent only the audit.
- **Coverage:** registration-v11 registers no coverage upgrade — the archive-coverage registry
  remains v3 (rounds 4–9, claims sealed per round [8, 11, 14, 18, 22, 25], cumulative 98); the
  round-11 row folds only when a v4 upgrade is registered per the instrument's own rule.

## Round-12 agenda priced by this receipt

1. **The carrier battery, round 2 — runner-state observables under the necessary-condition test**
   (registered CARRIER11 P6 consequence, conditional only on the upheld re-pricing, which held):
   pace-state, window-phase and guard-headroom are NOT present in the round-10 receipt — price
   their extraction from the existing five-depth ladder runs (capture extensions at the receipted
   depths, the design10 I-A10 identity class) and register the S2 dose-gap sign series for each
   BEFORE any new dose compute; the winning rule of record stays "detects AND localizes"; a
   candidate that flips exactly at the 50000→75000 edge re-opens single-factor ordering.
2. **The fifth-switch degradation, honestly left unpriced:** the registration priced round-12
   stage-6 only under EXPANDING-BUT-ABSORBED, which did not fire. The DEGRADATION finding is
   receipted gate-nothing: the monotone-plateau law is dead at switch 5 (rho20_5 = 0.9254 <
   rho20_1), while the level advantage (ratio5 decayed 0.6054 vs control 0.6542; end-5 |Wc| 9.32
   vs 17.80) persists. A cascade decay-law measurement (stages 6–7) may be priced IF a downstream
   consumer needs the cascade story — it gates nothing now.
3. **The islands law's two unmapped legs** (registered DIP11 consequence, gate-nothing): a
   boundary refinement scan for island-L's lower edge (s < 0.55) and the gap interior
   (0.675–0.925) ONLY if a downstream consumer needs the domain.
4. **Dose-selection remains OPEN** (unchanged): wd 3e-4 the longevity main, wd 2e-4 candidate-only
   — the ordering mechanism must first survive the runner-state battery above.

*M8 coverage pointer: unchanged — the archive-coverage registry remains at v3 (rounds 4–9,
cumulative 98 claims); registration-v11 registers no upgrade.*

*Every number above is read from `receipts/run11.json` (chain tip e8c6cfa7…) and its carried
`receipts/run10.json` (file sha 13947bd5…, tip cca59bd5…), not re-measured.*
