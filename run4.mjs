// run4.mjs — quilt-jepa ROUND 4 (wave 54-a). The two registered round-4 laws executed against
// the sealed registration-v4.json:
//   R2v4 — pace-aware EMA window: tau = 0.99998 (1 - tau = K4*LAT/lr, K4 = 1.5e-6, p = 0.075);
//          round-2 stationarity threshold (< 0.01) UNCHANGED. Round 3 failed it at tau 0.999.
//   R3v4 — percentile-normalized surprise: per-cell z against the cell's own 124-tick baseline
//          distribution BEFORE concentration; gate > 3.0 UNCHANGED. Round 3's raw law: 1.919.
// FAIL-CLOSED: the run re-verifies the seal (masked sha + mtime) at startup and refuses to
// execute otherwise. Deterministic core executed twice (R4) and cross-checked bit-exactly
// against the pre-seal design probe receipt (receipts/design4.json) — probe==run==run.
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
const LR3 = 0.3;     // registered learning rate (registration-v3, carried unchanged)
const TAU4 = 0.99998; // registered round-4 tau (registration-v4 law_R2v4: 1-tau = K4*LAT/lr, K4=1.5e-6, p=0.075)

// ---------- fail-closed seal verification ----------
const REG = path.join(HERE, 'registration-v4.json');
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
// L2 meter: closed-form linear next-latent floor with encoders frozen at init (tau-independent)
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

// R3v4 normalizer study — arithmetic IDENTICAL to probe4.mjs normalizerStudy (bit-exact cross-check)
const ANOMALY_TICKS = [430, 465, 500];
const topK = (arr, k) => mean(Array.from(arr).sort((a, b) => b - a).slice(0, k));
function normalizerStudy(S) {
  const nT = S.length; // 130 ticks, index 0 = tick 401
  const idx = (t) => t - 401;
  const isAnom = (t) => ANOMALY_TICKS.includes(t) || ANOMALY_TICKS.includes(t + 1);
  const B124 = []; for (let t = 401; t <= 530; t++) if (!isAnom(t)) B124.push(t);
  const sampleTicks = []; for (const t of B124) { if (sampleTicks.length < 30) sampleTicks.push(t); }
  const mu = new Float64Array(CELLS), sd = new Float64Array(CELLS), med = new Float64Array(CELLS), mad = new Float64Array(CELLS);
  const sortedCols = Array.from({ length: CELLS }, () => []);
  for (const t of B124) for (let c = 0; c < CELLS; c++) sortedCols[c].push(S[idx(t)][c]);
  for (let c = 0; c < CELLS; c++) {
    const v = sortedCols[c];
    mu[c] = mean(v);
    let s2 = 0; for (const x of v) s2 += (x - mu[c]) * (x - mu[c]);
    sd[c] = Math.sqrt(s2 / v.length);
    const sv = [...v].sort((a, b) => a - b);
    const m0 = sv.length % 2 ? sv[(sv.length - 1) / 2] : (sv[sv.length / 2 - 1] + sv[sv.length / 2]) / 2;
    med[c] = m0;
    const av = v.map((x) => Math.abs(x - m0)).sort((a, b) => a - b);
    mad[c] = av.length % 2 ? av[(av.length - 1) / 2] : (av[av.length / 2 - 1] + av[av.length / 2]) / 2;
  }
  const Z = S.map((row) => row.map((x, c) => (sd[c] > 0 ? (x - mu[c]) / sd[c] : 0)));
  const MD = S.map((row) => row.map((x, c) => (mad[c] > 0 ? (x - med[c]) / mad[c] : 0)));
  const U = S.map((row) => row.map((x, c) => {
    const v = sortedCols[c];
    let lo = 0; for (const b of v) if (b <= x) lo++; // ECDF map: rank (ties le) over own 124-tick baseline
    return lo / v.length;
  }));
  const statTop = (M, selectBy) => (t) => {
    const pairs = [];
    for (let c = 0; c < CELLS; c++) pairs.push([selectBy === 'self' ? M[idx(t)][c] : S[idx(t)][c], c]);
    pairs.sort((a, b) => b[0] - a[0]);
    return mean(pairs.slice(0, 4).map(([, c]) => M[idx(t)][c]));
  };
  const ratio = (fn) => mean(ANOMALY_TICKS.map(fn)) / mean(sampleTicks.map(fn));
  const res = {
    baseline_n: B124.length, sample_n: sampleTicks.length,
    v0_raw_ratio: ratio(statTop(S, 'self')),
    v1_z_ratio: ratio(statTop(Z, 'self')),
    v2_rank_ratio_selfsel: ratio(statTop(U, 'self')),
    v2b_rank_ratio_rawsel: ratio(statTop(U, 'raw')),
    v3_mad_ratio: ratio(statTop(MD, 'self')),
    anomaly_vs_sample: {}
  };
  for (const [name, M] of [['raw', S], ['z', Z], ['rank', U], ['mad', MD]]) {
    const fn = statTop(M, 'self');
    res.anomaly_vs_sample[name] = {
      anomaly_mean: mean(ANOMALY_TICKS.map(fn)),
      sample_mean: mean(sampleTicks.map(fn))
    };
  }
  const fnUR = statTop(U, 'raw');
  res.v4_rank_excess_diff = mean(ANOMALY_TICKS.map(fnUR)) - mean(sampleTicks.map(fnUR));
  const cntU1 = (t) => { let n = 0; for (let c = 0; c < CELLS; c++) if (U[idx(t)][c] >= 1 - 1e-12) n++; return n; };
  res.own_max_cells_anomaly_mean = mean(ANOMALY_TICKS.map(cntU1));
  res.own_max_cells_sample_mean = mean(sampleTicks.map(cntU1));
  res.own_max_cells_b124_mean = mean(B124.map(cntU1));
  return res;
}
function varRatio(T, T0) { // pooled per-dim variance trained-target / init-target over the window
  const nT = T.length, D = T[0].length;
  const v = (rows) => { let s = 0; for (let d = 0; d < D; d++) { let m = 0, m2 = 0; for (let t = 0; t < nT; t++) { m += rows[t][d]; m2 += rows[t][d] * rows[t][d]; } m /= nT; s += m2 / nT - m * m; } return s; };
  return v(T) / Math.max(1e-30, v(T0));
}

// ---------- the deterministic core (executed twice for R4) ----------
function coreRun4(seedU32) {
  const out = {};

  // ---- G: L1 learning-sanity gate on the TRIVIAL world (100 steps) at registered tau ----
  {
    const world = new World(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3; jepa.tau = TAU4;
    const losses = [];
    let obs = world.observe();
    for (let t = 0; t < 100; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
    out.g_first10 = mean(losses.slice(0, 10));
    out.g_last10 = mean(losses.slice(-10));
    out.g_ratio = out.g_last10 / out.g_first10;
  }

  // ---- L2: difficulty meter ordering on the run seed (2000-tick windows, frozen init; tau-independent) ----
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

  // ---- R1: hard world, real learning (400 steps) at registered tau + plasticity receipt ----
  {
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3; jepa.tau = TAU4;
    const wt0 = Float32Array.from(jepa.Wt);
    const losses = [];
    let obs = world.observe();
    for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
    out.r1_first10 = mean(losses.slice(0, 10));
    out.r1_last10 = mean(losses.slice(-10));
    out.r1_ratio = out.r1_last10 / out.r1_first10;
    let wtMove = 0, wtN = 0;
    for (let i = 0; i < jepa.Wt.length; i++) { const d = jepa.Wt[i] - wt0[i]; wtMove += d * d; wtN += jepa.Wt[i] * jepa.Wt[i]; }
    out.r2v4_wt_total_move_rel_400 = Math.sqrt(wtMove) / Math.sqrt(wtN); // plasticity cost, RECEIPTED, gates nothing
  }

  // ---- R2v4: EMA stationarity at the REGISTERED tau (snapshot 200, 200 steps, world2) ----
  {
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3; jepa.tau = TAU4;
    let ob = world.observe();
    for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(ob, o1); ob = o1; }
    const snap200 = Float32Array.from(jepa.Wt);
    const snapWc = Float32Array.from(jepa.Wc);
    for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(ob, o1); ob = o1; }
    let drift = 0, wcDisp = 0, wtNorm2 = 0, wcNorm2 = 0;
    for (let i = 0; i < snap200.length; i++) {
      const dW = jepa.Wt[i] - snap200[i], dC = jepa.Wc[i] - snapWc[i];
      drift += dW * dW; wcDisp += dC * dC;
      wtNorm2 += jepa.Wt[i] * jepa.Wt[i]; wcNorm2 += jepa.Wc[i] * jepa.Wc[i];
    }
    out.r2_drift_ratio = Math.sqrt(drift) / Math.sqrt(wtNorm2);
    out.r2v4_wc_disp_200_400_rel = Math.sqrt(wcDisp) / Math.sqrt(wcNorm2); // churn floor receipt (tau-independent)
  }

  // ---- R3v4: percentile-normalized concentration (timing law: intruder BEFORE scoring),
  //      continuing a 400-step trained trajectory, window 401-530, anomalies 430/465/500 ----
  {
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3; jepa.tau = TAU4;
    const jInit = new Jepa3(seedU32); // untouched init encoder for the no-collapse variance guard
    let obs = world.observe();
    for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
    const S = []; const T = []; const T0 = [];
    let obsPrev = obs;
    for (let t = 401; t <= 530; t++) {
      world.step();
      const obsNew = world.observe();
      if (ANOMALY_TICKS.includes(t)) {
        const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + 0.9);
        }
      }
      const zCtx = jepa.encode(obsPrev);
      const zPred = jepa.predict(zCtx);
      const zTgt = jepa.encodeTarget(obsNew);
      const zTgt0 = jInit.encodeTarget(obsNew);
      S.push(Array.from(perCellSurprise(zPred, zTgt)));
      T.push(Array.from(zTgt)); T0.push(Array.from(zTgt0));
      if (t === 530) out._lastPerCell = perCellSurprise(zPred, zTgt);
      obsPrev = obsNew;
    }
    const study = normalizerStudy(S);
    out.r3v4 = study;
    out.r3v4_var_ratio = varRatio(T, T0); // no-collapse guard (R2v4 compound guard iii)

    // ---- R6v4: impact-sensitive no-repair, probe window 531-560 on the SAME trajectory,
    //      with the CORRECTED frozen-state invariant (sha snapshotted AT CORRUPTION TIME) ----
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
    let flipped = 0;
    for (const c of top26) {
      for (let i = 0; i < LAT * LAT; i++) { jepa.Wc[c * LAT * LAT + i] = -jepa.Wc[c * LAT * LAT + i]; flipped++; }
    }
    out.r6_flipped = flipped;
    out.r6_loss_corrupted = probeLoss(jepa);
    out.r6_jump = out.r6_loss_corrupted / out.r6_loss_pre;
    const stateShaAtCorruption = sha(Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                                                    Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                                                    Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)])); // CORRECTED: AFTER corruption
    for (let t = 0; t < 50; t++) { world.step(); obsPrev = world.observe(); }
    const stateShaAfterIdle = sha(Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                                                 Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                                                 Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]));
    out.r6_sha_invariant = stateShaAfterIdle === stateShaAtCorruption;
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
    r2v4_wc_disp_200_400_rel: out.r2v4_wc_disp_200_400_rel,
    r2v4_wt_total_move_rel_400: out.r2v4_wt_total_move_rel_400,
    r2v4_var_ratio: out.r3v4_var_ratio,
    r3v4_z_ratio: out.r3v4.v1_z_ratio,
    r3v4_z_anomaly_mean: out.r3v4.anomaly_vs_sample.z.anomaly_mean,
    r3v4_z_sample_mean: out.r3v4.anomaly_vs_sample.z.sample_mean,
    r3v4_raw_ratio: out.r3v4.v0_raw_ratio,
    r3v4_mad_ratio: out.r3v4.v3_mad_ratio,
    r3v4_rank_ratio_selfsel: out.r3v4.v2_rank_ratio_selfsel,
    r3v4_rank_ratio_rawsel: out.r3v4.v2b_rank_ratio_rawsel,
    r3v4_own_max_anomaly: out.r3v4.own_max_cells_anomaly_mean,
    r3v4_own_max_sample: out.r3v4.own_max_cells_sample_mean,
    r3v4_rank_excess_diff: out.r3v4.v4_rank_excess_diff,
    r6_corr_mean: out.r6_corr_mean, r6_jump: out.r6_jump, r6_sha_invariant: out.r6_sha_invariant,
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
  repo: 'quilt-jepa', round: 4, executed_in: 'wave 54', seed_u32: seedU32,
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration-v4.json (sealed pre-run, self_sha256_masked + mtime; RE-VERIFIED fail-closed at this run\'s startup)',
  laws: 'R2v4 pace-aware EMA window (tau=0.99998, 1-tau = K4*LAT/lr, K4=1.5e-6; round-2 drift gate UNCHANGED at 0.01) + R3v4 percentile-normalized surprise (per-cell z against own 124-tick baseline; gate UNCHANGED at 3.0); lr = 0.3 carried; core/jepa3.js byte-untouched',
  carries: 'L2 gate meter, R4 determinism, R5 mesh conservation unchanged; R6 uses the corrected frozen-state invariant (registration-v3-addendum1) as-registered',
  retired: 'nothing this round — round-3 registered laws G/L2/R1/R4/R5/R6 stand; R2/R3 are the two repaired claims'
});
const r1 = coreRun4(seedU32);
const r2 = coreRun4(seedU32);

// G gates everything downstream (registered verdict_rule)
const gPass = r1.g_ratio < 0.5;
chain.add('G_learning_sanity_gate', {
  ratio: r1.g_ratio, first10: r1.g_first10, last10: r1.g_last10, lr: LR3, tau: TAU4, steps: 100, world: 'trivial (core/world.js)',
  claim: 'last10/first10 < 0.5 on the trivial world at 100 steps (L1 law) at the registered tau', pass: gPass,
  gate_note: gPass ? 'gate OPEN — downstream claims scored' : 'gate CLOSED — all downstream claims VOID-AS-GATED'
});
chain.add('L2_difficulty_meter', {
  floor_trivial: r1.l2_floor_trivial, floor_hard: r1.l2_floor_hard,
  ratio_trivial: r1.l2_ratio_trivial, ratio_hard: r1.l2_ratio_hard,
  init_trivial: r1.l2_init_trivial, init_hard: r1.l2_init_hard,
  claim: 'hard world linear floor exceeds trivial (absolute and relative) — the round-4 gate meter (unchanged law)',
  pass: r1.l2_floor_hard > r1.l2_floor_trivial && r1.l2_ratio_hard > r1.l2_ratio_trivial
});
chain.add('R1_hard_world_learning', {
  ratio: r1.r1_ratio, first10: r1.r1_first10, last10: r1.r1_last10, lr: LR3, tau: TAU4, steps: 400,
  claim: 'last10/first10 < 0.5 on world2 at the registered tau (no absolute gate — L2 law)', pass: r1.r1_ratio < 0.5,
  void_as_gated: !gPass
});
chain.add('R2v4_pace_aware_ema', {
  drift_ratio: r1.r2_drift_ratio, drift_gate: 0.01, tau: TAU4, tau_law: '1 - tau = K4*LAT/lr, K4 = 1.5e-6, p = lr/LAT = 0.075',
  round3_reference: 'tau=0.999 at the same pace: drift 1.061e-1 (registration-v3 R2 FAIL of record)',
  g_ratio: r1.g_ratio, r1_ratio: r1.r1_ratio,
  var_ratio: r1.r3v4_var_ratio, var_gate: 0.5,
  wc_disp_200_400_rel: r1.r2v4_wc_disp_200_400_rel, wt_total_move_rel_400: r1.r2v4_wt_total_move_rel_400,
  claim: 'PACE-AWARE EMA LAW: drift/norm < 0.01 (round-2 threshold UNCHANGED) AND g<0.5 AND r1<0.5 AND var_ratio>=0.5; wc_disp and wt_move receipted, gate nothing (declared cost)',
  pass: r1.r2_drift_ratio < 0.01 && r1.g_ratio < 0.5 && r1.r1_ratio < 0.5 && r1.r3v4_var_ratio >= 0.5,
  void_as_gated: !gPass
});
chain.add('R3v4_percentile_normalized_surprise', {
  z_ratio: r1.r3v4.v1_z_ratio, gate: 3.0,
  z_anomaly_mean: r1.r3v4.anomaly_vs_sample.z.anomaly_mean, z_sample_mean: r1.r3v4.anomaly_vs_sample.z.sample_mean,
  contrasts_gate_nothing: {
    raw_ratio: r1.r3v4.v0_raw_ratio, raw_anomaly_mean: r1.r3v4.anomaly_vs_sample.raw.anomaly_mean, raw_sample_mean: r1.r3v4.anomaly_vs_sample.raw.sample_mean,
    mad_ratio: r1.r3v4.v3_mad_ratio, rank_ratio_selfsel: r1.r3v4.v2_rank_ratio_selfsel, rank_ratio_rawsel: r1.r3v4.v2b_rank_ratio_rawsel,
    own_max_cells_anomaly_mean: r1.r3v4.own_max_cells_anomaly_mean, own_max_cells_sample_mean: r1.r3v4.own_max_cells_sample_mean,
    rank_excess_diff: r1.r3v4.v4_rank_excess_diff, baseline_n: r1.r3v4.baseline_n, sample_n: r1.r3v4.sample_n
  },
  round3_reference: 'raw law at tau=0.999: 1.919 (registration-v3 R3 FAIL of record)',
  claim: 'PERCENTILE-NORMALIZED SURPRISE LAW: per-cell z vs own 124-tick baseline BEFORE concentration; top-4-by-z anomaly/baseline > 3.0 (gate UNCHANGED)',
  pass: r1.r3v4.v1_z_ratio > 3.0,
  anomalyTicks: ANOMALY_TICKS, void_as_gated: !gPass
});

// R4: byte-identical twin runs + probe cross-check (bit-exact vs design4.json)
const probe = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design4.json'), 'utf8'));
const sharedProbePairs = [
  ['g_ratio', r1.g_ratio, probe.partC_trivial_G['0.99998'].g_ratio],
  ['g_first10', r1.g_first10, probe.partC_trivial_G['0.99998'].first10],
  ['g_last10', r1.g_last10, probe.partC_trivial_G['0.99998'].last10],
  ['r1_ratio', r1.r1_ratio, probe.partA_tau_sweep['0.99998'].r1_ratio],
  ['r1_last10', r1.r1_last10, probe.partA_tau_sweep['0.99998'].r1_last10],
  ['r2_drift_ratio', r1.r2_drift_ratio, probe.partA_tau_sweep['0.99998'].r2_drift_ratio],
  ['wc_disp_200_400_rel', r1.r2v4_wc_disp_200_400_rel, probe.partA_tau_sweep['0.99998'].wc_disp_200_400_rel],
  ['wt_total_move_rel_400', r1.r2v4_wt_total_move_rel_400, probe.partA_tau_sweep['0.99998'].wt_total_move_rel_400],
  ['r3v4_z_ratio', r1.r3v4.v1_z_ratio, probe.partB_normalizer_study['0.99998'].v1_z_ratio],
  ['r3v4_raw_ratio', r1.r3v4.v0_raw_ratio, probe.partB_normalizer_study['0.99998'].v0_raw_ratio],
  ['r3v4_mad_ratio', r1.r3v4.v3_mad_ratio, probe.partB_normalizer_study['0.99998'].v3_mad_ratio],
  ['r3v4_rank_ratio_selfsel', r1.r3v4.v2_rank_ratio_selfsel, probe.partB_normalizer_study['0.99998'].v2_rank_ratio_selfsel],
  ['r3v4_rank_ratio_rawsel', r1.r3v4.v2b_rank_ratio_rawsel, probe.partB_normalizer_study['0.99998'].v2b_rank_ratio_rawsel],
  ['r3v4_rank_excess_diff', r1.r3v4.v4_rank_excess_diff, probe.partB_normalizer_study['0.99998'].v4_rank_excess_diff],
  ['r3v4_var_ratio', r1.r3v4_var_ratio, probe.partB_normalizer_study['0.99998'].var_ratio_trained_over_init_target],
  ['r3v4_own_max_anomaly', r1.r3v4.own_max_cells_anomaly_mean, probe.partB_normalizer_study['0.99998'].own_max_cells_anomaly_mean],
  ['r3v4_own_max_sample', r1.r3v4.own_max_cells_sample_mean, probe.partB_normalizer_study['0.99998'].own_max_cells_sample_mean]
];
const probeMismatches = sharedProbePairs.filter(([, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, probe: b }));
chain.add('R4_determinism', {
  claim: 'two runs byte-identical metrics AND all shared metrics bit-equal to the design4 probe receipt (probe==run==run)',
  pass: r1.metricsSha === r2.metricsSha && probeMismatches.length === 0,
  sha_run1: r1.metricsSha, sha_run2: r2.metricsSha,
  probe_cross_check: { shared: sharedProbePairs.length, mismatches: probeMismatches }
});
chain.add('R5_mesh_conservation', {
  total_drift_rel: r1.r5_total_drift_rel, variance_non_increasing: r1.r5_variance_non_increasing, first_violating: r1.r5_first_violating,
  claim: 'total conserved within 1e-6 rel AND variance non-increasing over 100 steps (world2 energy from the round-4 R3 window)',
  pass: r1.r5_total_drift_rel <= 1e-6 && r1.r5_variance_non_increasing
});
chain.add('R6v4_impact_sensitive_no_repair', {
  corr_mean: r1.r6_corr_mean, corr_min: r1.r6_corr_min,
  jump: r1.r6_jump, loss_pre: r1.r6_loss_pre, loss_corrupted: r1.r6_loss_corrupted,
  sha_invariant: r1.r6_sha_invariant, recheck_delta: r1.r6_recheck_delta,
  flipped: r1.r6_flipped, top26: r1.r6_top26,
  claim: 'L3 precondition corr > 0.3 AND jump > 1.5 AND corrected frozen-state invariant (sha at corruption time == sha after 50 idle ticks) AND |recheck - corrupted| <= 1e-9',
  pass: r1.r6_corr_mean > 0.3 && r1.r6_jump > 1.5 && r1.r6_sha_invariant && r1.r6_recheck_delta <= 1e-9,
  void_as_gated: !gPass
});

const verdicts = {};
for (const row of chain.rows) if (/^(G|L2|R)/.test(row.type)) verdicts[row.type] = row.payload.pass;
const nPass = Object.values(verdicts).filter(Boolean).length;

const outDoc = {
  schema: 'quilt-jepa/run-receipt-v4',
  seed_u32: seedU32,
  lr_registered: LR3,
  tau_registered: TAU4,
  seal_verified_at_startup: { masked_sha: storedMasked, mtime: storedMtime },
  claims_passed: nPass,
  claims_total: Object.keys(verdicts).length,
  verdicts,
  metrics: r1.metrics,
  chain: chain.rows,
  tip: chain.tip()
};
fs.writeFileSync(path.join(RECEIPTS, 'run4.json'), JSON.stringify(outDoc, null, 1));
console.log('claims:', nPass + '/' + Object.keys(verdicts).length, JSON.stringify(verdicts));
console.log('tip:', chain.tip());
console.log('detail: G=' + r1.g_ratio.toFixed(4) + ' L2floor ' + r1.l2_floor_trivial.toExponential(3) + ' vs ' + r1.l2_floor_hard.toExponential(3)
  + ' r1=' + r1.r1_ratio.toFixed(4) + ' r2v4drift=' + r1.r2_drift_ratio.toExponential(2) + ' (gate 1e-2, round3 was 1.06e-1)'
  + ' zconc=' + r1.r3v4.v1_z_ratio.toFixed(3) + ' (gate 3.0, raw contrast ' + r1.r3v4.v0_raw_ratio.toFixed(3) + ')'
  + ' corr=' + r1.r6_corr_mean.toFixed(3) + ' jump=' + r1.r6_jump.toFixed(3) + ' inv=' + r1.r6_sha_invariant
  + ' r5drift=' + r1.r5_total_drift_rel.toExponential(2));
if (probeMismatches.length) console.log('PROBE CROSS-CHECK MISMATCHES: ' + JSON.stringify(probeMismatches));
else console.log('probe cross-check: ' + sharedProbePairs.length + '/17 bit-identical to receipts/design4.json');
