// run3.mjs — quilt-jepa ROUND 3 (wave 53-c). The L1 optimizer repair (per-latent scale +
// chain-rule Wc indexing — D4 receipted in registration-v3) executed against the sealed
// registration-v3.json. FAIL-CLOSED: the run re-verifies the seal (masked sha + mtime) at
// startup and refuses to execute otherwise. Deterministic core executed twice (R4).
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GRID, xorshift32 } = require('./core/world2.js');
const { World } = require('./core/world.js');
const { World2 } = require('./core/world2.js');
const { CELLS, LAT } = require('./core/jepa.js');
const { Jepa3 } = require('./core/jepa3.js');
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
const LR3 = 0.3; // registered learning rate (registration-v3 learning_rate_registered)

// ---------- fail-closed seal verification ----------
const REG = path.join(HERE, 'registration-v3.json');
const raw = fs.readFileSync(REG, 'utf8');
const reg = JSON.parse(raw);
const storedMasked = reg.registration.seal.self_sha256_masked;
const storedMtime = reg.registration.seal.mtime_local_ms;
const maskedBody = raw.replace(`"self_sha256_masked": "${storedMasked}"`, `"self_sha256_masked": "${'0'.repeat(64)}"`);
const recomputed = sha(maskedBody);
const st = fs.statSync(REG);
if (recomputed !== storedMasked) {
  console.error('SEAL VERIFICATION FAILED: masked sha mismatch — run REFUSED (fail-closed). stored=' + storedMasked.slice(0, 12) + ' recomputed=' + recomputed.slice(0, 12));
  process.exit(2);
}
if (st.mtimeMs !== storedMtime) {
  console.error('SEAL VERIFICATION FAILED: mtime ' + st.mtimeMs + ' != sealed ' + storedMtime + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
console.log('seal verified: masked sha ' + storedMasked.slice(0, 12) + '… mtime ' + storedMtime);

// ---------- shared helpers ----------
function perCellSurprise(zPred, zTgt) {
  const out = new Float32Array(CELLS);
  for (let c = 0; c < CELLS; c++) {
    let s = 0;
    for (let k = 0; k < LAT; k++) { const d = zPred[c * LAT + k] - zTgt[c * LAT + k]; s += d * d; }
    out[c] = s;
  }
  return out;
}
function concentrated(perCell, k) { return mean(Array.from(perCell).sort((a, b) => b - a).slice(0, k)); }
function cellFeatures(o, c) {
  const x = c % GRID, y = (c / GRID) | 0;
  const l = o[c];
  const r = o[y * GRID + Math.min(GRID - 1, x + 1)] - l;
  const d = o[Math.min(GRID - 1, y + 1) * GRID + x] - l;
  return [l, r, d, l - 0.5];
}
function solve4(A, B) { // Gauss-Jordan 4x4: A M = B
  const n = 4;
  const Aug = A.map((row, i) => [...row, ...B[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(Aug[r][col]) > Math.abs(Aug[piv][col])) piv = r;
    [Aug[col], Aug[piv]] = [Aug[piv], Aug[col]];
    const p = Aug[col][col];
    for (let j = 0; j < 2 * n; j++) Aug[col][j] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = Aug[r][col];
      if (f !== 0) for (let j = 0; j < 2 * n; j++) Aug[r][j] -= f * Aug[col][j];
    }
  }
  return Aug.map((row) => row.slice(n));
}
// L2 meter: closed-form linear next-latent floor with encoders frozen at init
function linearFloor(WorldCls, jepaSeed, windowTicks) {
  const world = new WorldCls(jepaSeed);
  const jepa = new Jepa3(jepaSeed); // untouched init: Wt = Wc
  const xs = [], ys = [];
  let obs = world.observe();
  for (let t = 0; t < windowTicks; t++) {
    world.step();
    const o1 = world.observe();
    const zCtx = jepa.encode(obs);
    for (let c = 0; c < CELLS; c++) {
      const f1 = cellFeatures(o1, c);
      const zt = new Float32Array(LAT);
      for (let k = 0; k < LAT; k++) { let z = 0; for (let j = 0; j < LAT; j++) z += jepa.Wt[c * LAT * LAT + k * LAT + j] * f1[j]; zt[k] = z; }
      xs.push(Float32Array.from(zCtx.subarray(c * LAT, c * LAT + LAT)));
      ys.push(zt);
    }
    obs = o1;
  }
  const WpInit = Float32Array.from(jepa.Wp);
  let initS = 0;
  for (let i = 0; i < xs.length; i++) {
    const cell = i % CELLS;
    for (let k = 0; k < LAT; k++) {
      let z = 0;
      for (let j = 0; j < LAT; j++) z += WpInit[cell * LAT * LAT + k * LAT + j] * xs[i][j];
      const dv = z - ys[i][k];
      initS += dv * dv;
    }
  }
  const initLoss = initS / xs.length / LAT;
  let floorS = 0;
  for (let c = 0; c < CELLS; c++) {
    const A = Array.from({ length: LAT }, () => new Float64Array(LAT));
    const B = Array.from({ length: LAT }, () => new Float64Array(LAT));
    for (let i = 0; i < xs.length; i++) {
      if (i % CELLS !== c) continue;
      const x = xs[i], y = ys[i];
      for (let a = 0; a < LAT; a++) for (let b = 0; b < LAT; b++) { A[a][b] += x[a] * x[b]; B[a][b] += x[a] * y[b]; }
    }
    const M = solve4(A, B); // Wp = Mᵀ
    for (let i = 0; i < xs.length; i++) {
      if (i % CELLS !== c) continue;
      const x = xs[i], y = ys[i];
      for (let k = 0; k < LAT; k++) {
        let z = 0;
        for (let j = 0; j < LAT; j++) z += M[j][k] * x[j];
        const dv = z - y[k];
        floorS += dv * dv;
      }
    }
  }
  const floorLoss = floorS / xs.length / LAT;
  return { initLoss, floorLoss, ratio: floorLoss / initLoss };
}

// ---------- the deterministic core (executed twice for R4) ----------
function coreRun3(seedU32) {
  const out = {};

  // ---- G: L1 learning-sanity gate on the TRIVIAL world (100 steps) ----
  {
    const world = new World(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3;
    const losses = [];
    let obs = world.observe();
    for (let t = 0; t < 100; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
    out.g_first10 = mean(losses.slice(0, 10));
    out.g_last10 = mean(losses.slice(-10));
    out.g_ratio = out.g_last10 / out.g_first10;
  }

  // ---- L2: difficulty meter ordering on the run seed (2000-tick windows, frozen init) ----
  {
    const triv = linearFloor(World, seedU32, 2000);
    const hard = linearFloor(World2, seedU32, 2000);
    out.l2_floor_trivial = triv.floorLoss;
    out.l2_floor_hard = hard.floorLoss;
    out.l2_ratio_trivial = triv.ratio;
    out.l2_ratio_hard = hard.ratio;
    out.l2_init_trivial = triv.initLoss;
    out.l2_init_hard = hard.initLoss;
  }

  // ---- R1: hard world, real learning (400 steps) ----
  {
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3;
    const losses = [];
    let obs = world.observe();
    for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
    out.r1_first10 = mean(losses.slice(0, 10));
    out.r1_last10 = mean(losses.slice(-10));
    out.r1_ratio = out.r1_last10 / out.r1_first10;
  }

  // ---- R2: EMA stationarity on world2 (separate run, snapshot at 200) ----
  {
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3;
    let ob = world.observe();
    for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(ob, o1); ob = o1; }
    const snap200 = Float32Array.from(jepa.Wt);
    for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(ob, o1); ob = o1; }
    let drift = 0;
    for (let i = 0; i < snap200.length; i++) { const d = jepa.Wt[i] - snap200[i]; drift += d * d; }
    out.r2_drift_ratio = Math.sqrt(drift) / jepa.normWt();
  }

  // ---- R3: concentration statistic (timing law: intruder BEFORE scoring), continuing a
  //      400-step trained trajectory, window 401-530, anomalies 430/465/500 ----
  {
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3;
    let obs = world.observe();
    for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
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
        const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + 0.9);
        }
      }
      const zCtx = jepa.encode(obsPrev);
      const zPred = jepa.predict(zCtx);
      const zTgt = jepa.encodeTarget(obsNew);
      const pc = perCellSurprise(zPred, zTgt);
      concAt.set(t, concentrated(pc, 4));
      let g = 0; for (let i = 0; i < pc.length; i++) g += pc[i];
      globAt.set(t, g / pc.length);
      if (t === 530) out._lastPerCell = pc;
      obsPrev = obsNew;
    }
    out.r3_conc_anomaly = mean(anomalyTicks.map((t) => concAt.get(t)));
    out.r3_conc_baseline = mean(sampleTicks.map((t) => concAt.get(t)));
    out.r3_conc_ratio = out.r3_conc_anomaly / out.r3_conc_baseline;
    out.r3_glob_anomaly = mean(anomalyTicks.map((t) => globAt.get(t)));
    out.r3_glob_baseline = mean(sampleTicks.map((t) => globAt.get(t)));
    out.r3_glob_ratio = out.r3_glob_anomaly / out.r3_glob_baseline;
    out.anomalyTicks = anomalyTicks;

    // ---- R6: impact-sensitive no-repair, probe window 531-560 on the SAME trajectory ----
    const probePairs = [];
    for (let t = 0; t < 30; t++) {
      world.step();
      const o1 = world.observe();
      probePairs.push([obsPrev, o1]);
      obsPrev = o1;
    }
    const probeLoss = (je) => mean(probePairs.map(([a, b]) => {
      const zc = je.encode(a), zp = je.predict(zc), zt = je.encodeTarget(b);
      return je.loss(zp, zt);
    }));
    const impact = new Float32Array(CELLS);
    for (const [a, b] of probePairs) {
      const zc = jepa.encode(a), zp = jepa.predict(zc), zt = jepa.encodeTarget(b);
      const pc = perCellSurprise(zp, zt);
      for (let c = 0; c < CELLS; c++) impact[c] += pc[c];
    }
    for (let c = 0; c < CELLS; c++) impact[c] /= probePairs.length;
    const ranked = Array.from(impact.keys()).sort((x, y) => (impact[y] - impact[x]) || (x - y));
    const top26 = ranked.slice(0, 26);
    // L3 precondition: mean per-cell Pearson corr(pred, tgt) over probe pairs, top-26 cells
    const corrs = [];
    for (const c of top26) {
      const ps = [], ts = [];
      for (const [a, b] of probePairs) {
        const zc = jepa.encode(a), zp = jepa.predict(zc), zt = jepa.encodeTarget(b);
        for (let k = 0; k < LAT; k++) { ps.push(zp[c * LAT + k]); ts.push(zt[c * LAT + k]); }
      }
      const mp = mean(ps), mt = mean(ts);
      let sp = 0, st2 = 0, sp1 = 0;
      for (let i = 0; i < ps.length; i++) { const dp = ps[i] - mp, dt = ts[i] - mt; sp += dp * dp; st2 += dt * dt; sp1 += dp * dt; }
      corrs.push(sp1 / Math.sqrt(sp * st2));
    }
    out.r6_corr_mean = mean(corrs);
    out.r6_corr_min = Math.min(...corrs);
    out.r6_loss_pre = probeLoss(jepa);
    const stateShaBefore = sha(Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                                              Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                                              Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]));
    let flipped = 0;
    for (const c of top26) {
      for (let i = 0; i < LAT * LAT; i++) { jepa.Wc[c * LAT * LAT + i] = -jepa.Wc[c * LAT * LAT + i]; flipped++; }
    }
    out.r6_flipped = flipped;
    out.r6_loss_corrupted = probeLoss(jepa);
    out.r6_jump = out.r6_loss_corrupted / out.r6_loss_pre;
    for (let t = 0; t < 50; t++) { world.step(); obsPrev = world.observe(); }
    const stateShaAfter = Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                                         Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                                         Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]);
    out.r6_state_sha_unchanged = sha(stateShaAfter) === stateShaBefore;
    out.r6_probe_recheck = probeLoss(jepa);
    out.r6_recheck_delta = Math.abs(out.r6_probe_recheck - out.r6_loss_corrupted);
    out.r6_top26 = top26;

    // ---- R5: mesh conservation on world2 energy ----
    const mesh = new Mesh(GRID);
    const energy = new Float32Array(GRID * GRID);
    const lastPC = out._lastPerCell;
    for (let i = 0; i < GRID * GRID; i++) energy[i] = lastPC[i];
    mesh.loadFrom(obsPrev, energy);
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
  }

  const metrics = {
    g_ratio: out.g_ratio, g_last10: out.g_last10,
    l2_floor_trivial: out.l2_floor_trivial, l2_floor_hard: out.l2_floor_hard,
    l2_ratio_trivial: out.l2_ratio_trivial, l2_ratio_hard: out.l2_ratio_hard,
    r1_ratio: out.r1_ratio, r1_first10: out.r1_first10, r1_last10: out.r1_last10,
    r2_drift_ratio: out.r2_drift_ratio,
    r3_conc_ratio: out.r3_conc_ratio, r3_glob_ratio: out.r3_glob_ratio,
    r6_corr_mean: out.r6_corr_mean, r6_jump: out.r6_jump, r6_state_sha_unchanged: out.r6_state_sha_unchanged,
    r6_recheck_delta: out.r6_recheck_delta,
    r5_total_drift_rel: out.r5_total_drift_rel, r5_variance_non_increasing: out.r5_variance_non_increasing
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
  repo: 'quilt-jepa', round: 3, executed_in: 'wave 53', seed_u32: seedU32,
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration-v3.json (sealed pre-run, self_sha256_masked + mtime; RE-VERIFIED fail-closed at this run\'s startup)',
  repair: 'core/jepa3.js: per-latent gradient scale (1/LAT, L1 law) + chain-rule Wc indexing (D4 finite-difference receipt); jepa.js untouched history; registered lr = 0.3',
  retired: 'entry-loss absolute gate (round-2 law L2: world-independent init-mismatch measure) — replaced by the L2 closed-form linear floor meter'
});
const r1 = coreRun3(seedU32);
const r2 = coreRun3(seedU32);

// G gates everything downstream (registered verdict_rule)
const gPass = r1.g_ratio < 0.5;
chain.add('G_learning_sanity_gate', {
  ratio: r1.g_ratio, first10: r1.g_first10, last10: r1.g_last10, lr: LR3, steps: 100, world: 'trivial (core/world.js)',
  claim: 'last10/first10 < 0.5 on the trivial world at 100 steps (L1 law)', pass: gPass,
  gate_note: gPass ? 'gate OPEN — downstream claims scored' : 'gate CLOSED — all downstream claims VOID-AS-GATED'
});
chain.add('L2_difficulty_meter', {
  floor_trivial: r1.l2_floor_trivial, floor_hard: r1.l2_floor_hard,
  ratio_trivial: r1.l2_ratio_trivial, ratio_hard: r1.l2_ratio_hard,
  init_trivial: r1.l2_init_trivial, init_hard: r1.l2_init_hard,
  claim: 'hard world linear floor exceeds trivial (absolute and relative)',
  pass: r1.l2_floor_hard > r1.l2_floor_trivial && r1.l2_ratio_hard > r1.l2_ratio_trivial
});
chain.add('R1_hard_world_learning', {
  ratio: r1.r1_ratio, first10: r1.r1_first10, last10: r1.r1_last10, lr: LR3, steps: 400,
  claim: 'last10/first10 < 0.5 on world2 (no absolute gate — L2 law)', pass: r1.r1_ratio < 0.5,
  void_as_gated: !gPass
});
chain.add('R2_ema_stationarity', {
  drift_ratio: r1.r2_drift_ratio, claim: 'drift/norm < 0.01 (snapshot 200, 200 steps, world2, WORKING optimizer)',
  pass: r1.r2_drift_ratio < 0.01, void_as_gated: !gPass
});
chain.add('R3_concentration', {
  conc_ratio: r1.r3_conc_ratio, glob_ratio: r1.r3_glob_ratio,
  conc_anomaly: r1.r3_conc_anomaly, conc_baseline: r1.r3_conc_baseline,
  glob_anomaly: r1.r3_glob_anomaly, glob_baseline: r1.r3_glob_baseline,
  claim: 'concentrated(top-4) anomaly/baseline > 3.0 (intruder BEFORE scoring)', pass: r1.r3_conc_ratio > 3.0,
  anomalyTicks: r1.anomalyTicks, void_as_gated: !gPass
});
chain.add('R4_determinism', { claim: 'two runs byte-identical metrics', pass: r1.metricsSha === r2.metricsSha, sha_run1: r1.metricsSha, sha_run2: r2.metricsSha });
chain.add('R5_mesh_conservation', {
  total_drift_rel: r1.r5_total_drift_rel, variance_non_increasing: r1.r5_variance_non_increasing, first_violating: r1.r5_first_violating,
  claim: 'total conserved within 1e-6 rel AND variance non-increasing over 100 steps (world2 energy)',
  pass: r1.r5_total_drift_rel <= 1e-6 && r1.r5_variance_non_increasing
});
chain.add('R6_impact_sensitive_no_repair', {
  corr_mean: r1.r6_corr_mean, corr_min: r1.r6_corr_min,
  jump: r1.r6_jump, loss_pre: r1.r6_loss_pre, loss_corrupted: r1.r6_loss_corrupted,
  state_sha_unchanged: r1.r6_state_sha_unchanged, recheck_delta: r1.r6_recheck_delta,
  flipped: r1.r6_flipped, top26: r1.r6_top26,
  claim: 'L3 precondition corr > 0.3 AND jump > 1.5 AND state sha unchanged AND |recheck - corrupted| <= 1e-9',
  pass: r1.r6_corr_mean > 0.3 && r1.r6_jump > 1.5 && r1.r6_state_sha_unchanged && r1.r6_recheck_delta <= 1e-9,
  void_as_gated: !gPass
});

const verdicts = {};
for (const row of chain.rows) if (/^(G|L2|R)/.test(row.type)) verdicts[row.type] = row.payload.pass;
const nPass = Object.values(verdicts).filter(Boolean).length;

const outDoc = {
  schema: 'quilt-jepa/run-receipt-v3',
  seed_u32: seedU32,
  lr_registered: LR3,
  seal_verified_at_startup: { masked_sha: storedMasked, mtime: storedMtime },
  claims_passed: nPass,
  claims_total: Object.keys(verdicts).length,
  verdicts,
  metrics: r1.metrics,
  chain: chain.rows,
  tip: chain.tip()
};
fs.writeFileSync(path.join(RECEIPTS, 'run3.json'), JSON.stringify(outDoc, null, 1));
console.log('claims:', nPass + '/' + Object.keys(verdicts).length, JSON.stringify(verdicts));
console.log('tip:', chain.tip());
console.log('detail: G=' + r1.g_ratio.toFixed(4) + ' L2floor ' + r1.l2_floor_trivial.toExponential(3) + ' vs ' + r1.l2_floor_hard.toExponential(3)
  + ' r1=' + r1.r1_ratio.toFixed(4) + ' r2drift=' + r1.r2_drift_ratio.toExponential(2)
  + ' conc=' + r1.r3_conc_ratio.toFixed(3) + ' glob=' + r1.r3_glob_ratio.toFixed(3)
  + ' corr=' + r1.r6_corr_mean.toFixed(3) + ' jump=' + r1.r6_jump.toFixed(3)
  + ' r5drift=' + r1.r5_total_drift_rel.toExponential(2));
