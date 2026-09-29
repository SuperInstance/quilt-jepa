// archive_coverage.mjs — wave-61 (this lane): the M8 archive-coverage field +
// the M11 round-8 eligibility tags, as ONE deterministic instrument.
//
// Laws cited (fleet-seeds/lode/mines.jsonl):
//   M8  — "archive, not population": round verdicts must carry archive-coverage
//         (count of distinct depth-x-dose-x-pace cells with sealed results);
//         once this field EXISTS, a registered round verdict lacking it is the
//         FAIL event. This instrument is that field, registered BEFORE round-8.
//   M11 — "measurability is the RSI-eligibility criterion": the round-8 agenda
//         items are tagged SEALED-MEASURABLE vs UNSEALED by a rule registered
//         here, pre-resolution, so the M11 prediction is judgeable at round-8.
//
// TAG RULE (registered pre-round-8, M11): an agenda item is SEALED-MEASURABLE
// iff a numeric pre-registered PASS/FAIL threshold for it can be written using
// ONLY instruments that already exist in this repo (rounds 4-7 registration
// and readout machinery) plus a stated numeric claim; otherwise UNSEALED.
//
// RESOLUTION PROCEDURE (M11, receipted pre-round-8): at round-8 verdict time,
// (1) count tagged SEALED-MEASURABLE items that resolve to a definitive
// PASS/FAIL in verdict-v8.md — the prediction requires >= 3; (2) compare the
// defer rate of sealed-measurable items against UNSEALED items. If the UNSEALED
// set is EMPTY, the rate comparison is ILL-POSED (receipted here in advance):
// the binding test is leg (1) alone, and the comparison clause is recorded as
// not-applicable, NOT as an automatic refutation. The mine is REFUTED only if
// sealed items defer at a rate >= the unsealed rate measured over a NON-EMPTY
// unsealed set.
//
// Fail-closed: any missing registration/verdict file for rounds 4..7 exits 2.
// Stdlib Node only; no wall-clock in output (determinism discipline).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ROUNDS = [4, 5, 6, 7];

const fail = (m) => { console.error('COVERAGE-FAIL:', m); process.exit(2); };
const read = (f) => { if (!existsSync(f)) fail(`missing ${f}`); return readFileSync(f, 'utf8'); };

const rounds = [];
for (const r of ROUNDS) {
  const reg = JSON.parse(read(join(ROOT, `registration-v${r}.json`))).registration;
  const verd = read(join(ROOT, `verdict-v${r}.md`));
  const claims = (reg.claims || []).map(c => c.id);
  if (claims.length === 0) fail(`registration-v${r}.json has no claims array`);
  // parameter cells named in the registration text (coarse v1 metric — the
  // receipts-level cell extraction is left to the round-8 lane; this v1 field
  // is the M8 minimum: it exists, it is deterministic, it is receipted)
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

// ---------- M11 tags (round-8 agenda, priced at round-7 verdict; tagged NOW) ----------
const tags = [
  {
    item: 'plasticity-ADVANTAGE mechanism (why does decay speed re-adaptation: null-space room vs Wt/Wc re-balancing at smaller |Wc|)',
    tag: 'SEALED-MEASURABLE',
    rationale: 'numeric claim writable with existing machinery: re-adaptation advantage at 20k (rho20 readout, round-7 receipts) vs end-of-decay |Wc| across the dose grid — correlation threshold registerable with no new instrument',
  },
  {
    item: 'GWIN grid lr-non-monotonicity (dip at lr 0.2, receipted for round-8 pace-law refinement)',
    tag: 'SEALED-MEASURABLE',
    rationale: 'numeric claim writable: g(lr) values on the existing grid with a stated fit/divergence threshold (e.g. deviation from monotone interpolation >= X with X pre-registered) using the round-6/7 GWIN readout',
  },
  {
    item: 'RLONG at wd 2e-4 (steepest lifetime-per-decay point) as candidate re-registration of the main dose',
    tag: 'SEALED-MEASURABLE',
    rationale: 'numeric claim writable: lifetime-per-decay at 2e-4 vs the registered bracket endpoints using the existing RLONG/dose machinery',
  },
  {
    item: "1e-3 arm's long-horizon plasticity (does over-decay eventually pay?)",
    tag: 'SEALED-MEASURABLE',
    rationale: 'numeric claim writable: rho20-style re-adaptation readout for the 1e-3 arm vs undecayed control using the existing PLAST control machinery (round-7 already captured the wd0 control weights)',
  },
];
const tagCounts = tags.reduce((a, t) => { a[t.tag] = (a[t.tag] || 0) + 1; return a; }, {});

const out = {
  instrument: 'archive_coverage.mjs v1',
  laws: { M8: 'coverage field must exist before round-8; missing field in a registered round verdict = M8 FAIL event', M11: 'tags registered pre-resolution; resolution procedure receipted in this file header' },
  rounds,
  coverage: { per_round: rounds.map(r => ({ round: r.round, claims_sealed: r.claims_sealed, cells_named_v1: r.cells_named_v1 })), cumulative_claims_sealed: cumulative },
  m11_round8_tags: tags,
  tag_counts: tagCounts,
  m11_resolution_note: 'UNSEALED set is EMPTY (all four items tag SEALED-MEASURABLE under the registered rule — the round-7 agenda lives entirely inside existing numeric machinery). Per the pre-registered procedure: leg (1) binds (>= 3 of 4 resolve definitively), the rate-comparison clause is recorded not-applicable, not an auto-refutation. If the round-8 lane re-registers an item qualitatively (no numeric threshold), that item is RETAGGED UNSEALED in verdict-v8 and both legs bind.',
  receipt: 'receipts/coverage-v1.json',
};
mkdirSync(join(ROOT, 'receipts'), { recursive: true });
writeFileSync(join(ROOT, 'receipts', 'coverage-v1.json'), JSON.stringify(out, null, 1) + '\n');
console.log('M8 coverage field:', JSON.stringify(out.coverage));
console.log('M11 tags:', JSON.stringify(tagCounts), '(round-8 agenda, pre-resolution)');
console.log('written receipts/coverage-v1.json');
