// run2.mjs — quilt-jepa ROUND 2 (wave 49-b, executed in wave 51). The three design laws from
// round-1's honest FAILs, re-registered in registration-v2.json (sealed pre-run) as R1-R6.
// Deterministic core executed twice (R4). Receipts are the product.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GRID, xorshift32 } = require('./core/world2.js');
const { Jepa, CELLS, LAT } = require('./core/jepa.js');
const { Mesh } = require('./core/mesh.js');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RECEIPTS = path.join(HERE, 'receipts');
fs.mkdirSync(RECEIPTS, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const GENESIS = 'JEPA-GENESIS-1';
class Chain {
  constructor() { this.rows = []; this.prev = GENESIS; }
  add(type, payload) {
    const id = `${type}#${this.rows.length}`;
    const body = JSON.stringify({ i: this.rows.length, id, type, payload });
    const h = sha(`${this.prev}:${body}:${id}`);
    this.rows.push({ i: this.rows.length, id, type, payload, prev: this.prev, sha: h });
    this.prev = h;
    return h;
  }
  tip() { return this.prev; }
}
function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }

// per-cell latent surprise: sum of squared latent diffs within the cell
function perCellSurprise(jepa, zPred, zTgt) {
  const out = new Float32Array(CELLS);
  for (let c = 0; c < CELLS; c++) {
    let s = 0;
    for (let k = 0; k < LAT; k++) { const d = zPred[c * LAT + k] - zTgt[c * LAT + k]; s += d * d; }
    out[c] = s;
  }
  return out;
}
function concentrated(perCell, k) { // mean of top-k cells
  const arr = Array.from(perCell).sort((a, b) => b - a);
  return mean(arr.slice(0, k));
}

// ---------- the deterministic core (executed twice for R4) ----------
function coreRun2(seedU32) {
  const out = {};
  const { World2 } = require('./core/world2.js');
  const world = new World2(seedU32);
  const jepa = new Jepa(seedU32);

  // ---- R1: hard world, real learning (400 training steps) ----
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < 400; t++) {
    world.step();
    const obs1 = world.observe();
    losses.push(jepa.trainStep(obs, obs1));
    obs = obs1;
  }
  out.lossFirst10 = mean(losses.slice(0, 10));
  out.lossLast10 = mean(losses.slice(-10));
  out.r1_ratio = out.lossLast10 / out.lossFirst10;
  out.r1_hardGate = out.lossFirst10;

  // ---- R2: EMA stationarity on world2 (separate run, snapshot at 200) ----
  const worldB = new World2(seedU32);
  const jepaB = new Jepa(seedU32);
  let ob = worldB.observe();
  for (let t = 0; t < 200; t++) { worldB.step(); const o1 = worldB.observe(); jepaB.trainStep(ob, o1); ob = o1; }
  const snap200 = Float32Array.from(jepaB.Wt);
  for (let t = 0; t < 200; t++) { worldB.step(); const o1 = worldB.observe(); jepaB.trainStep(ob, o1); ob = o1; }
  let drift200 = 0;
  for (let i = 0; i < snap200.length; i++) { const d = jepaB.Wt[i] - snap200[i]; drift200 += d * d; }
  drift200 = Math.sqrt(drift200);
  out.r2_drift_ratio = drift200 / jepaB.normWt();

  // ---- R3: concentration statistic, corrected timing (intruder BEFORE scoring) ----
  const anomalyTicks = [430, 465, 500];
  const sampleTicks = [];
  for (let t = 401; t <= 530 && sampleTicks.length < 30; t++) {
    if (!anomalyTicks.includes(t) && !anomalyTicks.includes(t + 1)) sampleTicks.push(t);
  }
  const concAt = new Map(); const globAt = new Map();
  let obsPrev = obs;
  for (let t = 401; t <= 530; t++) {
    world.step();
    const obsNew = world.observe();
    if (anomalyTicks.includes(t)) {
      // intruder: +0.9 luminance on a 2x2 patch far from ball, applied BEFORE scoring
      const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + 0.9);
      }
    }
    const zCtx = jepa.encode(obsPrev);
    const zPred = jepa.predict(zCtx);
    const zTgt = jepa.encodeTarget(obsNew);
    const pc = perCellSurprise(jepa, zPred, zTgt);
    concAt.set(t, concentrated(pc, 4));
    let g = 0; for (let i = 0; i < pc.length; i++) g += pc[i];
    globAt.set(t, g / pc.length);
    if (t === 530) out._lastPerCell = pc; // for R5 mesh load
    obsPrev = obsNew;
  }
  out.r3_conc_anomaly = mean(anomalyTicks.map((t) => concAt.get(t)));
  out.r3_conc_baseline = mean(sampleTicks.map((t) => concAt.get(t)));
  out.r3_conc_ratio = out.r3_conc_anomaly / out.r3_conc_baseline;
  out.r3_glob_anomaly = mean(anomalyTicks.map((t) => globAt.get(t)));
  out.r3_glob_baseline = mean(sampleTicks.map((t) => globAt.get(t)));
  out.r3_glob_ratio = out.r3_glob_anomaly / out.r3_glob_baseline; // contrast only, gates nothing
  out.anomalyTicks = anomalyTicks;

  // ---- R6: impact-sensitive corruption on a FIXED probe set (ticks 531-560) ----
  const probePairs = [];
  for (let t = 0; t < 30; t++) {
    world.step();
    const o1 = world.observe();
    probePairs.push([obs, o1]);
    obs = o1;
  }
  const probeLoss = (je) => mean(probePairs.map(([a, b]) => {
    const zc = je.encode(a), zp = je.predict(zc), zt = je.encodeTarget(b);
    return je.loss(zp, zt);
  }));
  // per-cell impact over probe set (mean per-cell latent loss)
  const impact = new Float32Array(CELLS);
  for (const [a, b] of probePairs) {
    const zc = jepa.encode(a), zp = jepa.predict(zc), zt = jepa.encodeTarget(b);
    const pc = perCellSurprise(jepa, zp, zt);
    for (let c = 0; c < CELLS; c++) impact[c] += pc[c];
  }
  for (let c = 0; c < CELLS; c++) impact[c] /= probePairs.length;
  const ranked = Array.from(impact.keys()).sort((x, y) => (impact[y] - impact[x]) || (x - y));
  const top26 = ranked.slice(0, 26);
  out.r6_loss_pre = probeLoss(jepa);
  const stateShaBefore = sha(Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                                            Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                                            Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]));
  // corrupt: sign-flip ALL 16 Wc weights of each top-26 cell (deterministic)
  let flipped = 0;
  for (const c of top26) {
    for (let i = 0; i < LAT * LAT; i++) { jepa.Wc[c * LAT * LAT + i] = -jepa.Wc[c * LAT * LAT + i]; flipped++; }
  }
  out.r6_flipped = flipped;
  out.r6_loss_corrupted = probeLoss(jepa);
  out.r6_jump = out.r6_loss_corrupted / out.r6_loss_pre;
  // frozen-state invariant: 50 live ticks, NO training, then re-eval + state sha
  for (let t = 0; t < 50; t++) { world.step(); const o1 = world.observe(); obs = o1; void o1; }
  const stateShaAfter = Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                                       Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                                       Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]);
  out.r6_state_sha_unchanged = sha(stateShaAfter) === stateShaBefore;
  out.r6_probe_recheck = probeLoss(jepa);
  out.r6_recheck_delta = Math.abs(out.r6_probe_recheck - out.r6_loss_corrupted);
  out.r6_top26 = top26;

  // ---- R5: mesh conservation on a world2 energy field ----
  const mesh = new Mesh(GRID);
  const energy = new Float32Array(GRID * GRID);
  const lastPC = out._lastPerCell;
  for (let i = 0; i < GRID * GRID; i++) energy[i] = lastPC[i];
  mesh.loadFrom(obs, energy);
  const t0 = mesh.totals();
  let varianceNonIncreasing = true, firstViolating = -1, prevVar = t0.variance;
  for (let s = 0; s < 100; s++) {
    mesh.step();
    const tt = mesh.totals();
    if (tt.variance > prevVar + 1e-12) { varianceNonIncreasing = false; if (firstViolating < 0) firstViolating = s; }
    prevVar = tt.variance;
  }
  const t100 = mesh.totals();
  out.r5_total_drift_rel = Math.abs(t100.total - t0.total) / Math.max(1e-12, Math.abs(t0.total));
  out.r5_variance_non_increasing = varianceNonIncreasing;
  out.r5_first_violating = firstViolating;

  const metrics = {
    r1_hardGate: out.lossFirst10, r1_ratio: out.r1_ratio,
    r2_drift_ratio: out.r2_drift_ratio,
    r3_conc_ratio: out.r3_conc_ratio, r3_glob_ratio: out.r3_glob_ratio,
    r6_jump: out.r6_jump, r6_state_sha_unchanged: out.r6_state_sha_unchanged,
    r6_recheck_delta: out.r6_recheck_delta,
    r5_total_drift_rel: out.r5_total_drift_rel, r5_variance_non_increasing: out.r5_variance_non_increasing,
    lossFirst10: out.lossFirst10, lossLast10: out.lossLast10,
    r3_conc_anomaly: out.r3_conc_anomaly, r3_conc_baseline: out.r3_conc_baseline,
    r6_loss_pre: out.r6_loss_pre, r6_loss_corrupted: out.r6_loss_corrupted
  };
  out.metricsSha = sha(JSON.stringify(metrics));
  out.metrics = metrics;
  return out;
}

// ---------- execute ----------
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;

const chain = new Chain();
chain.add('header', {
  repo: 'quilt-jepa', round: 2, executed_in: 'wave 51', seed_u32: seedU32,
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration-v2.json (sealed pre-run, self_sha256_masked + mtime)',
  law: 'same JEPA law as round 1; world upgraded to core/world2.js (hard world: dual-frequency drifting wave, 16-tick turbulence at +/-0.05, ball speed 2, occluder bar 2 ticks every 80)',
  measurement_lesson: 'round-1 P3 scored surprise at anomaly ticks BEFORE intruder injection (spike landed on the un-measured t+1); round 2 applies the intruder BEFORE scoring, per the receipted timing fix'
});
const r1 = coreRun2(seedU32);
const r2 = coreRun2(seedU32);
chain.add('R1_hard_world_learning', {
  hardGate_lossFirst10: r1.lossFirst10, ratio: r1.r1_ratio,
  claim: 'lossFirst10 > 0.05 AND last10/first10 < 0.5',
  pass: r1.lossFirst10 > 0.05 && r1.r1_ratio < 0.5,
  lossLast10: r1.lossLast10
});
chain.add('R2_ema_stationarity', { drift_ratio: r1.r2_drift_ratio, claim: 'drift/norm < 0.01 (snapshot at step 200, 200 steps, world2)', pass: r1.r2_drift_ratio < 0.01 });
chain.add('R3_concentration', {
  conc_ratio: r1.r3_conc_ratio, glob_ratio: r1.r3_glob_ratio,
  conc_anomaly: r1.r3_conc_anomaly, conc_baseline: r1.r3_conc_baseline,
  glob_anomaly: r1.r3_glob_anomaly, glob_baseline: r1.r3_glob_baseline,
  claim: 'concentrated(top-4) anomaly/baseline > 3.0 (global ratio receipted as contrast, gates nothing)',
  pass: r1.r3_conc_ratio > 3.0, anomalyTicks: r1.anomalyTicks
});
chain.add('R4_determinism', { claim: 'two runs byte-identical metrics', pass: r1.metricsSha === r2.metricsSha, sha_run1: r1.metricsSha, sha_run2: r2.metricsSha });
chain.add('R5_mesh_conservation', { total_drift_rel: r1.r5_total_drift_rel, variance_non_increasing: r1.r5_variance_non_increasing, first_violating: r1.r5_first_violating, claim: 'total conserved within 1e-6 rel AND variance non-increasing over 100 steps (world2 energy)', pass: r1.r5_total_drift_rel <= 1e-6 && r1.r5_variance_non_increasing });
chain.add('R6_impact_sensitive_no_repair', {
  jump: r1.r6_jump, loss_pre: r1.r6_loss_pre, loss_corrupted: r1.r6_loss_corrupted,
  state_sha_unchanged: r1.r6_state_sha_unchanged, recheck_delta: r1.r6_recheck_delta,
  flipped: r1.r6_flipped, top26: r1.r6_top26,
  claim: 'jump > 1.5 AND state sha unchanged AND |recheck - corrupted| <= 1e-9',
  pass: r1.r6_jump > 1.5 && r1.r6_state_sha_unchanged && r1.r6_recheck_delta <= 1e-9
});

const verdicts = {};
for (const row of chain.rows) if (row.type.startsWith('R')) verdicts[row.type] = row.payload.pass;
const nPass = Object.values(verdicts).filter(Boolean).length;

const outDoc = {
  schema: 'quilt-jepa/run-receipt-v2',
  seed_u32: seedU32,
  claims_passed: nPass,
  claims_total: Object.keys(verdicts).length,
  verdicts,
  metrics: r1.metrics,
  chain: chain.rows,
  tip: chain.tip()
};
fs.writeFileSync(path.join(RECEIPTS, 'run2.json'), JSON.stringify(outDoc, null, 1));
console.log('claims:', nPass + '/' + Object.keys(verdicts).length, JSON.stringify(verdicts));
console.log('tip:', chain.tip());
console.log('detail: hardGate=' + r1.lossFirst10.toFixed(5) + ' r1ratio=' + r1.r1_ratio.toFixed(4)
  + ' conc=' + r1.r3_conc_ratio.toFixed(3) + ' glob=' + r1.r3_glob_ratio.toFixed(3)
  + ' jump=' + r1.r6_jump.toFixed(3) + ' drift=' + r1.r2_drift_ratio.toExponential(2)
  + ' r5drift=' + r1.r5_total_drift_rel.toExponential(2));
