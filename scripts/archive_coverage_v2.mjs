// archive_coverage_v2.mjs — wave 62 (lane 62-a): the REGISTERED v2 UPGRADE of the wave-61
// archive-coverage instrument. Additive by construction: scripts/archive_coverage.mjs (v1) and
// its receipt (receipts/coverage-v1.json) are byte-untouched history — per the v1 registration's
// own rule ("the round-8 lane may upgrade the metric by registering the upgrade, never by
// editing this one"), the upgrade is a NEW instrument registered in registration-coverage-v2.json.
//
// What v2 adds over v1 (everything v1 computes is computed IDENTICALLY over rounds 4..8):
//   (1) ROUNDS = [4..8] — round 8 joins the M8 archive-coverage field (registration-v8 claims
//       array + verdict-v8.md headline, both now exist);
//   (2) cells_v2 — the receipts-level depth-x-dose-x-pace cell extraction ceded to the round-8
//       lane by the v1 registration: distinct (axis, dose|pace|depth, readout) cells with a
//       SEALED numeric result, extracted mechanically from the receipts of record
//       (run4/design5/design6/run6/design7/run7/design8/run8), each fail-closed (missing path or
//       non-finite value exits 2);
//   (3) m11_resolution_inputs — the four round-8 agenda items' run8 verdicts, read from
//       receipts/run8.json, as the inputs to the M11 tag resolution procedure receipted in the
//       v1 instrument header (leg 1 >= 3 of 4 definitive; leg 2 only over a NON-EMPTY unsealed
//       set).
//
// Fail-closed: any missing registration/verdict file for rounds 4..8, any missing receipt path,
// or any non-finite cell value exits 2. Stdlib Node only; no wall-clock in output (determinism
// discipline); re-runs byte-identical on the same tree.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ROUNDS = [4, 5, 6, 7, 8];

const fail = (m) => { console.error('COVERAGE-FAIL:', m); process.exit(2); };
const read = (f) => { if (!existsSync(f)) fail(`missing ${f}`); return readFileSync(f, 'utf8'); };
const finite = (v, what) => { if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${what} is not a finite number`); return v; };
const J = (rel) => JSON.parse(read(join(ROOT, rel)));

// ---------- (1) the v1 fields, recomputed over rounds 4..8 (identical logic, extended range) ----
const rounds = [];
for (const r of ROUNDS) {
  const reg = J(`registration-v${r}.json`).registration;
  const verd = read(join(ROOT, `verdict-v${r}.md`));
  const claims = (reg.claims || []).map(c => c.id);
  if (claims.length === 0) fail(`registration-v${r}.json has no claims array`);
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

// ---------- (2) cells_v2 — the receipts-level extraction (each cell fail-closed) ----------------
const run4 = J('receipts/run4.json');
const design5 = J('receipts/design5.json');
const design6 = J('receipts/design6.json');
const run6 = J('receipts/run6.json');
const design7 = J('receipts/design7.json');
const run7 = J('receipts/run7.json');
const design8 = J('receipts/design8.json');
const run8 = J('receipts/run8.json');
const r7 = run7.metrics_round7, r8 = run8.metrics_round8, d6a = design6.partA_longevity, d6b = design6.partB_depth_window, d6c = design6.partC_gwindow;
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

const cellsDistinct = new Set(cells.map((c) => `${c.axis}|${c.dose}|${c.depth}|${c.readout}`));
if (cellsDistinct.size !== cells.length) fail('duplicate cell keys in the extraction');
const byAxis = cells.reduce((a, c) => { a[c.axis] = (a[c.axis] || 0) + 1; return a; }, {});

// ---------- (3) M11 resolution inputs (the four round-8 items' run8 verdicts) --------------------
const v8 = run8.verdicts;
const m11ResolutionInputs = [
  { item: 'plasticity-ADVANTAGE mechanism', claim: 'MECH_plasticity_advantage_mechanism', verdict: v8.MECH_plasticity_advantage_mechanism === true ? 'PASS' : v8.MECH_plasticity_advantage_mechanism === false ? 'FAIL' : 'DEFER', definitive: typeof v8.MECH_plasticity_advantage_mechanism === 'boolean' },
  { item: 'GWIN grid lr-non-monotonicity', claim: 'GWIN8_low_pace_dip', verdict: v8.GWIN8_low_pace_dip === true ? 'PASS' : v8.GWIN8_low_pace_dip === false ? 'FAIL' : 'DEFER', definitive: typeof v8.GWIN8_low_pace_dip === 'boolean' },
  { item: 'RLONG at wd 2e-4 as candidate re-registration of the main dose', claim: 'REDOSE_main_dose_reregistration', verdict: v8.REDOSE_main_dose_reregistration === true ? 'PASS' : v8.REDOSE_main_dose_reregistration === false ? 'FAIL' : 'DEFER', definitive: typeof v8.REDOSE_main_dose_reregistration === 'boolean' },
  { item: "1e-3 arm's long-horizon plasticity", claim: 'OVERDECAY_over_decay_plasticity', verdict: v8.OVERDECAY_over_decay_plasticity === true ? 'PASS' : v8.OVERDECAY_over_decay_plasticity === false ? 'FAIL' : 'DEFER', definitive: typeof v8.OVERDECAY_over_decay_plasticity === 'boolean' },
];

const out = {
  instrument: 'archive_coverage.mjs v2 (registered upgrade of v1 — see registration-coverage-v2.json; v1 instrument + receipt byte-untouched)',
  laws: { M8: 'coverage field must exist for every registered round verdict; missing field = M8 FAIL event', M11: 'tags registered pre-resolution (v1); resolution procedure receipted in the v1 instrument header' },
  rounds,
  coverage: {
    per_round: rounds.map(r => ({ round: r.round, claims_sealed: r.claims_sealed, verdict_headline: r.verdict_headline, cells_named_v1: r.cells_named_v1 })),
    cumulative_claims_sealed: cumulative,
  },
  cells_v2: { total: cells.length, by_axis: byAxis, definition: 'distinct (axis, dose, depth, readout) cells with a sealed finite numeric result, extracted from receipts/run4.json, design5.json, design6.json, run6.json, design7.json, run7.json, design8.json, run8.json — fail-closed', cells },
  m11_round8_resolution_inputs: m11ResolutionInputs,
  determinism_note: 'stdlib Node, no wall-clock in output, fail-closed on missing rounds/receipt paths (exit 2); re-runs byte-identical on the same tree',
  receipt: 'receipts/coverage-v2.json',
  predecessor: 'receipts/coverage-v1.json (rounds 4-7, v1 metric — cited by verdict-v8.md per COV1)',
};
mkdirSync(join(ROOT, 'receipts'), { recursive: true });
writeFileSync(join(ROOT, 'receipts', 'coverage-v2.json'), JSON.stringify(out, null, 1) + '\n');
console.log('M8 coverage field (v2, rounds 4-8):', JSON.stringify(out.coverage));
console.log('cells_v2 receipts-level:', JSON.stringify(out.cells_v2.total), JSON.stringify(out.cells_v2.by_axis));
console.log('M11 resolution inputs:', JSON.stringify(m11ResolutionInputs.map(x => ({ claim: x.claim, verdict: x.verdict }))));
console.log('written receipts/coverage-v2.json');
