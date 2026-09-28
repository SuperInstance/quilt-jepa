// run.mjs — quilt-jepa wave-49 experiment. Deterministic core, stone receipt chain out.
// Law: everything measured BEFORE the verdict is written; receipts are the product.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { World, GRID } = require('./core/world.js');
const { Jepa, CELLS } = require('./core/jepa.js');
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

// ---------- the deterministic core (executed twice for P4) ----------
function coreRun(seedU32) {
  const out = {};
  // Phase A: training
  const world = new World(seedU32);
  const jepa = new Jepa(seedU32);
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
  out.p1_ratio = out.lossLast10 / out.lossFirst10;
  // P2: EMA stationarity over final 200 steps — snapshot Wt at 200, run 200 more, compare
  const worldB = new World(seedU32);
  const jepaB = new Jepa(seedU32);
  const lB = [];
  let ob = worldB.observe();
  const snapWt = Float32Array.from(jepaB.Wt);
  for (let t = 0; t < 400; t++) {
    worldB.step();
    const ob1 = worldB.observe();
    lB.push(jepaB.trainStep(ob, ob1));
    ob = ob1;
  }
  let drift = 0;
  for (let i = 0; i < snapWt.length; i++) { const d = jepaB.Wt[i] - snapWt[i]; drift += d * d; }
  drift = Math.sqrt(drift); // NOTE: snapshot is at step 0, so this is full-run drift; corrected below
  // re-do properly: snapshot at step 200
  const worldC = new World(seedU32);
  const jepaC = new Jepa(seedU32);
  let oc = worldC.observe();
  for (let t = 0; t < 200; t++) { worldC.step(); const o1 = worldC.observe(); jepaC.trainStep(oc, o1); oc = o1; }
  const snap200 = Float32Array.from(jepaC.Wt);
  for (let t = 0; t < 200; t++) { worldC.step(); const o1 = worldC.observe(); jepaC.trainStep(oc, o1); oc = o1; }
  let drift200 = 0;
  for (let i = 0; i < snap200.length; i++) { const d = jepaC.Wt[i] - snap200[i]; drift200 += d * d; }
  drift200 = Math.sqrt(drift200);
  out.p2_drift_ratio = drift200 / jepaC.normWt();

  // Phase B: anomaly surprise (frozen weights, world continues)
  const anomalyTicks = [430, 465, 500]; // registered fixed ticks
  const sampleTicks = [];
  for (let t = 401; t <= 530 && sampleTicks.length < 30; t++) {
    if (!anomalyTicks.includes(t) && !anomalyTicks.includes(t + 1)) sampleTicks.push(t);
  }
  let obsPrev = obs;
  const surpriseAt = new Map();
  for (let t = 401; t <= 530; t++) {
    world.step();
    const obsNew = world.observe();
    const zCtx = jepa.encode(obsPrev);
    const zPred = jepa.predict(zCtx);
    const zTgt = jepa.encodeTarget(obsNew);
    const s = jepa.loss(zPred, zTgt);
    surpriseAt.set(t, s);
    if (anomalyTicks.includes(t)) {
      // intruder: +0.9 luminance on a 2x2 patch far from ball
      const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + 0.9);
    }
    obsPrev = obsNew;
  }
  const anomalySurprise = anomalyTicks.map((t) => surpriseAt.get(t));
  const baselineSurprise = sampleTicks.map((t) => surpriseAt.get(t));
  out.p3_anomaly_mean = mean(anomalySurprise);
  out.p3_baseline_mean = mean(baselineSurprise);
  out.p3_ratio = out.p3_anomaly_mean / out.p3_baseline_mean;
  out.anomalyTicks = anomalyTicks;

  // Phase C: zero self-repair (P6) at tick 531
  const lossBefore = surpriseAt.get(530);
  const corrupted = jepa.corruptWc(0.10, seedU32 ^ 0xC0FFEE);
  const zCtx = jepa.encode(obs);
  const zPred = jepa.predict(zCtx);
  const zTgt = jepa.encodeTarget(obs);
  const lossCorrupted = jepa.loss(zPred, zTgt);
  // freeze: 50 more ticks, NO trainStep
  let frozen = obs, lossT50 = 0;
  for (let t = 0; t < 50; t++) {
    world.step();
    const o1 = world.observe();
    const zc = jepa.encode(frozen);
    const zp = jepa.predict(zc);
    const zt = jepa.encodeTarget(o1);
    lossT50 = Math.max(lossT50, jepa.loss(zp, zt)); // max over frozen window: does ANY tick heal below corrupted level? track min too
    frozen = o1;
  }
  // strict reading: minimum frozen loss vs corrupted loss
  let fo = obs, minFrozen = Infinity;
  for (let t = 0; t < 50; t++) {
    world.step();
    const o1 = world.observe();
    const zc = jepa.encode(fo);
    const zp = jepa.predict(zc);
    const zt = jepa.encodeTarget(o1);
    minFrozen = Math.min(minFrozen, jepa.loss(zp, zt));
    fo = o1;
  }
  out.p6_lossBefore = lossBefore;
  out.p6_lossCorrupted = lossCorrupted;
  out.p6_jump_ratio = lossCorrupted / lossBefore;
  out.p6_minFrozen = minFrozen;
  out.p6_no_heal = minFrozen >= lossCorrupted - 1e-9;
  out.p6_corrupted_cells = corrupted;

  // Phase D: mesh diffusion conservation (P5)
  const mesh = new Mesh(GRID);
  const energy = new Float32Array(GRID * GRID);
  for (let i = 0; i < GRID * GRID; i++) energy[i] = Math.abs(zPred[i] - zTgt[i]);
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
  out.p5_total_drift_rel = Math.abs(t100.total - t0.total) / Math.max(1e-12, Math.abs(t0.total));
  out.p5_variance_non_increasing = varianceNonIncreasing;
  out.p5_first_violating = firstViolating;

  // canonical metrics (for P4 byte-identity across two runs)
  const metrics = {
    p1_ratio: out.p1_ratio, p2_drift_ratio: out.p2_drift_ratio,
    p3_ratio: out.p3_ratio, p6_jump_ratio: out.p6_jump_ratio,
    p6_no_heal: out.p6_no_heal, p5_total_drift_rel: out.p5_total_drift_rel,
    p5_variance_non_increasing: out.p5_variance_non_increasing,
    lossFirst10: out.lossFirst10, lossLast10: out.lossLast10,
    p3_anomaly_mean: out.p3_anomaly_mean, p3_baseline_mean: out.p3_baseline_mean
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
  repo: 'quilt-jepa', wave: 49, seed_u32: seedU32,
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration.json (sealed pre-run, self_sha256_masked + mtime)',
  law: 'JEPA latent-space prediction; no pixel reconstruction; EMA target tau=0.999; Perona-Malik mesh lambda=0.2'
});
const r1 = coreRun(seedU32);
const r2 = coreRun(seedU32);
chain.add('P1_learning', { ratio: r1.p1_ratio, claim: 'last10/first10 < 0.25', pass: r1.p1_ratio < 0.25, lossFirst10: r1.lossFirst10, lossLast10: r1.lossLast10 });
chain.add('P2_ema_stationarity', { drift_ratio: r1.p2_drift_ratio, claim: 'drift/norm < 0.01 (snapshot at step 200, 200 steps)', pass: r1.p2_drift_ratio < 0.01 });
chain.add('P3_anomaly_surprise', { ratio: r1.p3_ratio, claim: 'anomaly_mean > 3x baseline_mean', pass: r1.p3_ratio > 3.0, anomaly_mean: r1.p3_anomaly_mean, baseline_mean: r1.p3_baseline_mean, anomalyTicks: r1.anomalyTicks });
chain.add('P4_determinism', { claim: 'two runs byte-identical metrics', pass: r1.metricsSha === r2.metricsSha, sha_run1: r1.metricsSha, sha_run2: r2.metricsSha });
chain.add('P5_diffusion_conservation', { total_drift_rel: r1.p5_total_drift_rel, variance_non_increasing: r1.p5_variance_non_increasing, first_violating: r1.p5_first_violating, claim: 'total conserved within 1e-6 rel AND variance non-increasing over 100 steps', pass: r1.p5_total_drift_rel <= 1e-6 && r1.p5_variance_non_increasing });
chain.add('P6_zero_self_repair', { jump_ratio: r1.p6_jump_ratio, min_frozen: r1.p6_minFrozen, loss_corrupted: r1.p6_lossCorrupted, no_heal: r1.p6_no_heal, claim: 'loss jumps >1.5x AND frozen min >= corrupted - 1e-9', pass: r1.p6_jump_ratio > 1.5 && r1.p6_no_heal, corrupted_weights: r1.p6_corrupted_cells });

const verdicts = {};
for (const row of chain.rows) if (row.type.startsWith('P')) verdicts[row.type] = row.payload.pass;
const nPass = Object.values(verdicts).filter(Boolean).length;

const outDoc = {
  schema: 'quilt-jepa/run-receipt-v1',
  seed_u32: seedU32,
  claims_passed: nPass,
  claims_total: Object.keys(verdicts).length,
  verdicts,
  metrics: r1.metrics,
  chain: chain.rows,
  tip: chain.tip()
};
fs.writeFileSync(path.join(RECEIPTS, 'run.json'), JSON.stringify(outDoc, null, 1));
console.log('claims:', nPass + '/' + Object.keys(verdicts).length, JSON.stringify(verdicts));
console.log('tip:', chain.tip());
