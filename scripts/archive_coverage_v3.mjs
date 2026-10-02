// archive_coverage_v3.mjs — wave 63 (lane 63-b-r): the REGISTERED v3 UPGRADE of the wave-62
// archive-coverage instrument. Additive by construction: scripts/archive_coverage.mjs (v1) +
// receipts/coverage-v1.json and scripts/archive_coverage_v2.mjs + receipts/coverage-v2.json are
// byte-untouched history — per the v1/v2 registrations' own rule ("may upgrade the metric by
// REGISTERING the upgrade, never by editing this one"), this upgrade is a NEW instrument
// registered in registration-coverage-v3.json (sealed pre-instrument, self_sha256_masked
// 2c58e798…, mtime 1791000000000).
//
// What v3 adds over v2 (everything v2 computes is computed IDENTICALLY over rounds 4..8):
//   (1) ROUNDS = [4..9] — round 9 joins the M8 archive-coverage field (registration-v9 claims +
//       verdict-v9.md headline, both existing at seal time). Claims-reader generalization: the
//       reader accepts BOTH the v2-style claims ARRAY (rounds 4-8, output unchanged) and
//       registration-v9.json's claims OBJECT keyed 0..24 — keys iterated in NUMERIC order either
//       way (a JSON array IS an object keyed 0..n-1; the numeric sort makes an object-keyed form
//       read identically, so rounds 4-8 are byte-unaffected);
//   (2) cells_v3 — the v2 receipts-level extraction reproduced IDENTICALLY over rounds 4..8 (same
//       40 cells from run4/design5/design6/run6/design7/run7/design8/run8) PLUS the round-9
//       receipts-level cells (from receipts/run9.json): the 75000-depth switch ratios on BOTH
//       cured-dose arms (CURE9 NEW), the saturation-curve level + increment at the third switch
//       (SAT9), the end-of-life |Wc| composition pair (the round-9 mechanism leg), and the six
//       window-scaled pace points (DIP9 — depths tagged with their scaling so they stay
//       duplicate-free against the 1x row). A mechanical cross-check against
//       receipts/coverage-v2.json enforces COV3's superset rule (every v2 cell key present with a
//       byte-identical value) — fail-closed;
//   (3) round9_resolution_inputs — the three round-9 agenda claims' verdicts read mechanically
//       from receipts/run9.json (CURE9/SAT9/DIP9), the M11-style definitive-resolution inputs:
//       leg 1 (>= 3 of 3 SEALED-MEASURABLE items resolve definitively); leg 2 binds only over a
//       NON-EMPTY unsealed set — the round-9 set is fully sealed, so leg 2 is not-applicable.
//
// Fail-closed: any missing registration/verdict file for rounds 4..9, any missing receipt path
// (including receipts/coverage-v2.json for the cross-check), any non-finite cell value, or any
// duplicate cell key exits 2. Stdlib Node only; no wall-clock in output (determinism discipline);
// re-runs byte-identical on the same tree.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ROUNDS = [4, 5, 6, 7, 8, 9];

const fail = (m) => { console.error('COVERAGE-FAIL:', m); process.exit(2); };
const read = (f) => { if (!existsSync(f)) fail(`missing ${f}`); return readFileSync(f, 'utf8'); };
const finite = (v, what) => { if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${what} is not a finite number`); return v; };
const J = (rel) => JSON.parse(read(join(ROOT, rel)));

// ---------- (1) the coverage fields, recomputed over rounds 4..9 (v2 logic, extended range) -----
// Registered claims-reader generalization: v2's array reader generalized to accept a claims
// OBJECT keyed 0..n (numeric order) as well — rounds 4-8 (claims arrays) read byte-unchanged.
const claimsOf = (reg, file) => {
  const c = reg.claims;
  if (c == null) fail(`${file} has no claims field`);
  const keys = Object.keys(c).sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    if (Number.isFinite(na)) return -1;
    if (Number.isFinite(nb)) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  if (keys.length === 0) fail(`${file} has an empty claims field`);
  return keys.map((k) => (c[k] && typeof c[k] === 'object' && typeof c[k].id === 'string') ? c[k].id : k);
};

const rounds = [];
for (const r of ROUNDS) {
  const reg = J(`registration-v${r}.json`).registration;
  const verd = read(join(ROOT, `verdict-v${r}.md`));
  const claims = claimsOf(reg, `registration-v${r}.json`);
  const taskText = `${reg.task || ''} ${reg.carries_unchanged || ''}`;
  const lrs = [...taskText.matchAll(/lr\s*=\s*([0-9.]+)/g)].map(m => m[1]);
  const wds = [...taskText.matchAll(/(?:wd|dose)\s*[=:]\s*([0-9.e-]+)/g)].map(m => m[1]);
  const depths = [...taskText.matchAll(/depth[s]?\s*[=:~>]*\s*([0-9]+(?:\s*(?:to|→|->|,)\s*[0-9]+)?)/gi)].map(m => m[1]);
  const headline = verd.match(/Score[^\d]*?(\d+)\s*\/\s*(\d+)(?:\s*PASS)?/) || verd.match(/(\d+)\s*\/\s*(\d+)\s*PASS/);
  rounds.push({
    round: r,
    claims_sealed: claims.length,
    claim_ids: claims,
    lr_tokens: [...new Set(lrs)],
    dose_tokens: [...new Set(wds)],
    depth_tokens: [...new Set(depths)],
    verdict_headline: headline ? `${headline[1]}/${headline[2]}` : null,
    cells_named_v1: new Set([...lrs.map(x => 'lr:' + x), ...wds.map(x => 'wd:' + x), ...depths.map(x => 'depth:' + x)]).size,
  });
}
const cumulative = rounds.reduce((a, r) => a + r.claims_sealed, 0);

// ---------- (2) cells_v3 — the v2 receipts-level extraction reproduced identically (rounds 4-8) +
//             the round-9 receipts-level cells (each cell fail-closed) ---------------------------
const run4 = J('receipts/run4.json');
const design5 = J('receipts/design5.json');
const design6 = J('receipts/design6.json');
const run6 = J('receipts/run6.json');
const design7 = J('receipts/design7.json');
const run7 = J('receipts/run7.json');
const design8 = J('receipts/design8.json');
const run8 = J('receipts/run8.json');
const run9 = J('receipts/run9.json');
const r7 = run7.metrics_round7, r8 = run8.metrics_round8, r9m = run9.metrics_round9, d6a = design6.partA_longevity, d6b = design6.partB_depth_window, d6c = design6.partC_gwindow;
const run7Plateau = run7.chain.find((r) => r.type === 'R3DxR3L_composition').payload.per_depth;

const cells = [];
const cell = (axis, dose, depth, readout, value, receipt) => {
  finite(value, `cell ${axis}/${dose}/${depth}/${readout}`);
  cells.push({ axis, dose, depth, readout, value, receipt });
};
// pace cells (wd=0 g-gate, W(lr) = round(30/lr))
cell('pace', 'wd0', 'W300', 'g_ratio', r8.r8_g_01, 'run8.metrics_round8');
cell('pace', 'wd0', 'W200', 'g_ratio', d6c.lr0_15_w200.g_ratio, 'design6.partC_gwindow');
cell('pace', 'wd0', 'W150', 'g_ratio', r7.gwin7_g_02, 'run7.metrics_round7');
cell('pace', 'wd0', 'W120', 'g_ratio', r7.gwin7_g_025, 'run7.metrics_round7');
cell('pace', 'wd0', 'W100', 'g_ratio', run4.metrics.g_ratio, 'run4.metrics (anchor)');
cell('pace', 'wd0', 'W75', 'g_ratio', r7.gwin7_g_04, 'run7.metrics_round7');
cell('pace', 'wd0', 'W60', 'g_ratio', d6c.lr0_5_w60.g_ratio, 'design6.partC_gwindow');
cell('pace', 'wd0', 'W50', 'g_ratio', r7.gwin7_g_06, 'run7.metrics_round7 (edge, gate-nothing)');
// dose cells (lr=0.3, slow-phase |Wc| inflation rate)
cell('dose', 'wd0', '20000', 'slow_rate', d6a.arms['wd0_anchor'].slow_inflation_rate, 'design6.partA');
cell('dose', 'wd1e-4', '20000', 'slow_rate', d6a.arms['wd1e-4'].slow_inflation_rate, 'design6.partA');
cell('dose', 'wd1.5e-4', '20000', 'slow_rate', r7.r7_rate_wd1_5e4, 'run7.metrics_round7');
cell('dose', 'wd2e-4', '20000', 'slow_rate', r7.r7_rate_wd2e4, 'run7.metrics_round7');
cell('dose', 'wd2.5e-4', '20000', 'slow_rate', r7.r7_rate_wd2_5e4, 'run7.metrics_round7');
cell('dose', 'wd3e-4', '20000', 'slow_rate', d6a.arms['wd3e-4_main'].slow_inflation_rate, 'design6.partA');
cell('dose', 'wd3e-4', '100000', 'slow_rate', d6a.arms['wd3e-4_main'].slow_inflation_rate_100k, 'design6.partA');
cell('dose', 'wd1e-3', '20000', 'slow_rate', d6a.arms['wd0.001'].slow_inflation_rate, 'design6.partA');
// depth-x-amp cells (lr=0.3, anchored z)
for (const dep of ['400', '1200', '2000', '2200']) {
  cell('depth', 'amp0.9', dep, 'z_anchored', d6b.candS[dep].z_ratio_corrected, 'design6.partB');
  cell('depth', 'amp1.2', dep, 'z_anchored', run7Plateau[dep].anchored12, 'run7.chain R3DxR3L');
}
// plasticity cells (lr=0.3, trivial-world switch readout from warm states)
cell('plasticity', 'wd0', '20000', 'switch_ratio', r8.r8_dose_ratio_0, 'run8.metrics_round8');
cell('plasticity', 'wd1e-4', '20000', 'switch_ratio', r8.r8_dose_ratio_1e4, 'run8.metrics_round8');
cell('plasticity', 'wd1.5e-4', '20000', 'switch_ratio', r8.r8_dose_ratio_1_5e4, 'run8.metrics_round8');
cell('plasticity', 'wd2e-4', '20000', 'switch_ratio', r8.r8_dose_ratio_2e4, 'run8.metrics_round8');
cell('plasticity', 'wd2.5e-4', '20000', 'switch_ratio', r8.r8_dose_ratio_2_5e4, 'run8.metrics_round8');
cell('plasticity', 'wd3e-4', '20000', 'switch_ratio', r8.r8_dose_ratio_3e4, 'run8.metrics_round8 (== design7 disclosed pin)');
cell('plasticity', 'wd1e-3', '20000', 'switch_ratio', r8.r8_ratio_1e3_20k, 'run8.metrics_round8');
cell('plasticity', 'wd3e-4', '100000', 'switch_ratio', r7.plast_ratio_100k, 'run7.metrics_round7');
cell('plasticity', 'wd3e-4', '500000', 'switch_ratio', r7.plast_ratio_500k, 'run7.metrics_round7 (edge)');
cell('plasticity', 'wd1e-3', '100000', 'switch_ratio', r8.r8_ratio_1e3_100k, 'run8.metrics_round8');
// guard cells (lr=0.3, r1 400-step learning readout per dose — plasticity UNRELAXED)
cell('guard', 'wd0', '400', 'r1_ratio', d6a.guards_wd0.r1_world2_400.r1_ratio, 'design6.partA');
cell('guard', 'wd1e-4', '400', 'r1_ratio', d6a.guards_wd1e4.r1_world2_400.r1_ratio, 'design6.partA');
cell('guard', 'wd1.5e-4', '400', 'r1_ratio', r7.r7_r1_wd1_5e4, 'run7.metrics_round7');
cell('guard', 'wd2e-4', '400', 'r1_ratio', r8.r8_r1_wd2e4, 'run8.metrics_round8');
cell('guard', 'wd2.5e-4', '400', 'r1_ratio', r8.r8_r1_wd2_5e4, 'run8.metrics_round8');
cell('guard', 'wd3e-4', '400', 'r1_ratio', d6a.guards_wd3e4.r1_world2_400.r1_ratio, 'design6.partA');

// ----- round-9 receipts-level cells (run9.metrics_round9) --------------------------------------
// plasticity 75000-depth switch ratios on BOTH cured-dose arms (the CURE9 NEW measurements — the
// ordering-reversal branch: ratio(2e-4,75k) < ratio(3e-4,75k))
cell('plasticity', 'wd2e-4', '75000', 'switch_ratio', r9m.r9_ratio_2e4_75000, 'run9.metrics_round9 (CURE9 NEW)');
cell('plasticity', 'wd3e-4', '75000', 'switch_ratio', r9m.r9_ratio_3e4_75000, 'run9.metrics_round9 (CURE9 NEW)');
// saturation-curve level + increment at the third switch (SAT9: rho20_3 ∈ [rho20_2, 1), inc3 ≤ inc2)
cell('saturation', 'wd3e-4', '20000', 'rho20_3', r9m.r9_rho20_3, 'run9.metrics_round9 (SAT9, third switch)');
cell('saturation', 'wd3e-4', '20000', 'inc3', r9m.r9_inc3, 'run9.metrics_round9 (SAT9, third switch)');
// end-of-life |Wc| composition pair at 75k (the round-9 mechanism leg: wc75(2e-4) > wc75(3e-4))
cell('mechanism', 'wd2e-4', '75000', 'wc75', r9m.r9_wc75_2e4, 'run9.metrics_round9 (round-9 mechanism leg)');
cell('mechanism', 'wd3e-4', '75000', 'wc75', r9m.r9_wc75_3e4, 'run9.metrics_round9 (round-9 mechanism leg)');
// six window-scaled pace points (DIP9: the {0.15, 0.2, 0.25} mini-grid at 0.5x/2x W scalings of
// the registered W(lr) = round(30/lr); depths TAGGED with the scaling to stay duplicate-free
// against the 1x row — W100/W75/W300 exist above as 1x cells)
cell('pace', 'wd0', 'W100@0.5x', 'g_ratio', r9m.r9_g_015_w100, 'run9.metrics_round9 (DIP9 0.5x)');
cell('pace', 'wd0', 'W75@0.5x', 'g_ratio', r9m.r9_g_02_w75, 'run9.metrics_round9 (DIP9 0.5x)');
cell('pace', 'wd0', 'W60@0.5x', 'g_ratio', r9m.r9_g_025_w60, 'run9.metrics_round9 (DIP9 0.5x)');
cell('pace', 'wd0', 'W400@2x', 'g_ratio', r9m.r9_g_015_w400, 'run9.metrics_round9 (DIP9 2x)');
cell('pace', 'wd0', 'W300@2x', 'g_ratio', r9m.r9_g_02_w300, 'run9.metrics_round9 (DIP9 2x)');
cell('pace', 'wd0', 'W240@2x', 'g_ratio', r9m.r9_g_025_w240, 'run9.metrics_round9 (DIP9 2x)');

const cellsDistinct = new Set(cells.map((c) => `${c.axis}|${c.dose}|${c.depth}|${c.readout}`));
if (cellsDistinct.size !== cells.length) fail('duplicate cell keys in the extraction');
const byAxis = cells.reduce((a, c) => { a[c.axis] = (a[c.axis] || 0) + 1; return a; }, {});

// ---------- (2b) v2-superset cross-check — COV3's byte-identity requirement, mechanical ----------
const cov2 = J('receipts/coverage-v2.json');
if (!cov2.cells_v2 || !Array.isArray(cov2.cells_v2.cells)) fail('receipts/coverage-v2.json has no cells_v2.cells array');
const v2cells = cov2.cells_v2.cells;
const keyOf = (c) => `${c.axis}|${c.dose}|${c.depth}|${c.readout}`;
const v3head = cells.slice(0, v2cells.length);
const v3headMap = new Map(v3head.map((c) => [keyOf(c), c.value]));
const v2Mismatches = [];
for (const c of v2cells) {
  const k = keyOf(c);
  if (!v3headMap.has(k)) v2Mismatches.push({ key: k, problem: 'v2 cell key missing from the v3 extraction' });
  else if (v3headMap.get(k) !== c.value) v2Mismatches.push({ key: k, problem: 'value not byte-identical', v2: c.value, v3: v3headMap.get(k) });
}
if (v3head.length !== v2cells.length) fail(`the v2-part reproduction produced ${v3head.length} cells but receipts/coverage-v2.json has ${v2cells.length}`);
if (v2Mismatches.length) fail('v2-superset cross-check FAILED: ' + JSON.stringify(v2Mismatches));

// ---------- (3) round-9 resolution inputs (the three round-9 agenda claims' run9 verdicts) -------
const v9 = run9.verdicts;
const r9Reg = J('registration-v9.json').registration;
const r9RegIds = new Set(claimsOf(r9Reg, 'registration-v9.json'));
const r9Input = (item, claimId, verdictKey) => {
  if (!r9RegIds.has(claimId)) fail(`registration-v9.json does not seal the round-9 agenda claim ${claimId}`);
  const v = v9[verdictKey];
  return { item, claim: verdictKey, verdict: v === true ? 'PASS' : v === false ? 'FAIL' : 'DEFER', definitive: typeof v === 'boolean' };
};
const round9ResolutionInputs = [
  r9Input('cured-dose re-registration (wd 2e-4) — the dose decision', 'CURE9', 'CURE9_cured_dose_reregistration'),
  r9Input('saturation successor (third switch, no weight reset)', 'SAT9', 'SAT9_saturation_successor'),
  r9Input('dip-law shape under W scaling', 'DIP9', 'DIP9_dip_law_window_scaling'),
];

const out = {
  instrument: 'archive_coverage_v3.mjs (registered upgrade of v2 — see registration-coverage-v3.json; v1 + v2 instruments and receipts byte-untouched)',
  laws: { M8: 'coverage field must exist for every registered round verdict; missing field = M8 FAIL event', M11: 'tags registered pre-resolution (v1); resolution procedure receipted in the v1 instrument header', R9RES: 'the three round-9 agenda items resolve DEFINITIVELY from receipts/run9.json (leg 1: >= 3 of 3 SEALED-MEASURABLE; leg 2 not-applicable — the round-9 set is fully sealed, no unsealed bound set)' },
  rounds,
  coverage: {
    per_round: rounds.map(r => ({ round: r.round, claims_sealed: r.claims_sealed, verdict_headline: r.verdict_headline, cells_named_v1: r.cells_named_v1 })),
    cumulative_claims_sealed: cumulative,
  },
  cells_v3: {
    total: cells.length,
    by_axis: byAxis,
    definition: 'distinct (axis, dose, depth, readout) cells with a sealed finite numeric result — the 40 v2 cells reproduced identically over rounds 4-8 (receipts/run4.json, design5.json, design6.json, run6.json, design7.json, run7.json, design8.json, run8.json) PLUS the 12 round-9 receipts-level cells from receipts/run9.json (75000-depth switch ratios both arms = CURE9 NEW; saturation rho20_3 + inc3 = SAT9; mechanism wc75 pair; six window-scaled pace points = DIP9, depth-tagged 0.5x/2x against the 1x row) — fail-closed',
    v2_superset_check: { v2_cells: v2cells.length, byte_identical: true, round9_cells: cells.length - v2cells.length },
    cells,
  },
  round9_resolution_inputs: round9ResolutionInputs,
  round9_resolution_leg2: 'not-applicable per the v1 procedure — the round-9 agenda set is fully sealed (all three items SEALED-MEASURABLE in registration-v9.json), so leg 2 (defer-rate over an UNSEALED set) has an empty bound set',
  determinism_note: 'stdlib Node, no wall-clock in output, fail-closed on missing rounds/receipt paths (incl. coverage-v2.json for the cross-check), non-finite cells, duplicate keys (exit 2); re-runs byte-identical on the same tree',
  receipt: 'receipts/coverage-v3.json',
  registration: 'registration-coverage-v3.json (sealed pre-instrument, self_sha256_masked 2c58e798…, mtime 1791000000000)',
  predecessor: 'receipts/coverage-v2.json (rounds 4-8, v2 metric — cited by verdict-v8.md per COV2)',
};
mkdirSync(join(ROOT, 'receipts'), { recursive: true });
writeFileSync(join(ROOT, 'receipts', 'coverage-v3.json'), JSON.stringify(out, null, 1) + '\n');
console.log('M8 coverage field (v3, rounds 4-9):', JSON.stringify(out.coverage));
console.log('cells_v3 receipts-level:', JSON.stringify(out.cells_v3.total), JSON.stringify(out.cells_v3.by_axis));
console.log('v2-superset cross-check:', v2cells.length + '/' + v2cells.length, 'byte-identical +' + (cells.length - v2cells.length), 'round-9 cells');
console.log('round-9 resolution inputs:', JSON.stringify(round9ResolutionInputs.map(x => ({ claim: x.claim, verdict: x.verdict, definitive: x.definitive }))));
console.log('written receipts/coverage-v3.json');
