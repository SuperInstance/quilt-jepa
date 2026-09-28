// run6.mjs — quilt-jepa ROUND 6 (wave 56-a, lane 56-a). Executes the sealed
// registration-v6.json: the round-4/5 operating point is UNCHANGED (lr 0.3, tau 0.99998,
// K4 = 1.5e-6, amp = 0.9, same seed) — every round-4 metric must reproduce receipts/run4.json
// BIT-EXACTLY (29/29) AND every round-5 metric must reproduce receipts/run5.json BIT-EXACTLY
// (92/92); three new claims are scored (the round-5-priced agenda):
//   RLONG — LONGEVITY LAW: weight decay on Wc (main dose 3e-4; wd=0 anchor; 1e-4 dose-response;
//           1e-3 mechanism contrast) against the two-phase divergence; plasticity gates
//           UNRELAXED in the decayed arm; registered expectation: two-phase eliminated-within-
//           window at the main dose, persists at 1e-4
//   R3D   — DEPTH/WINDOW LAW: the depth deficit decomposed (residual-scale aliasing x
//           novelty-gap decay); registered fix = SCALE-ANCHORED surprise statistic
//           (multiplier exactly 1 at depth 400 — shallow operating point bit-identical);
//           restores the UNCHANGED 3.0 gate at both depth-2000-class sites
//   GWIN  — G-WINDOW LAW: W(lr) = round(30/lr) closes the round-5 pace-lock finding
// FAIL-CLOSED: the run re-verifies the registration seal (masked sha + mtime) at startup and
// refuses otherwise. Deterministic core executed twice (R4) and cross-checked bit-for-bit
// against receipts/run4.json (round-4), receipts/run5.json (round-5) AND receipts/design6.json
// (new) — probe==run==run-twin==prior-round-runs.
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
const { Jepa4 } = require('./core/jepa4.js');
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
const LR3 = 0.3;      // registered lr (carried)
const TAU4 = 0.99998; // registered round-4 tau (carried)
const K4 = 1.5e-6;    // registered pace-law constant (carried)
const LADDER = [0.0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9, 1.2];
const XPACES = [0.15, 0.5]; // 0.3 is the anchor, carried in R2v4/R3v4
const T_HORIZON = 500000;
const HORIZON_CKPTS = [400, 1000, 5000, 10000, 20000, 30000];
const CONTRAST_CAP = 100000;
const ANOMALY_TICKS = [430, 465, 500];
const AMP0 = 0.9; // registered anchor amplitude
// round-6 registered constants
const WD_MAIN = 3e-4;  // registered longevity main dose
const RLONG_CKPTS = [400, 1000, 5000, 10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000];
const DEPTHS6 = [400, 1200, 2000, 2200]; // 2200 = the round-5 finding site (wStart 2201)

// ---------- fail-closed seal verification ----------
const REG = path.join(HERE, 'registration-v6.json');
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

// pre-seal probe receipts (loaded once; used for the probe-identity verdict rules)
const design5 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design5.json'), 'utf8'));
const design6 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design6.json'), 'utf8'));

// ---------- shared helpers (carried blocks verbatim from run4.mjs; new blocks verbatim
// from probe5.mjs — arithmetic identity proven by the probe's 13/13 pipeline check) ----------
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
function linearFloor(WorldCls, jepaSeed, windowTicks) {
  const world = new WorldCls(jepaSeed);
  const jepa = new Jepa3(jepaSeed);
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
    const M = solve4(A, B);
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
// parameterized R3v4 normalizer study — for (S, [430,465,500], 401) ARITHMETICALLY IDENTICAL
// to run4.mjs's fixed-window version (proven: probe5 13/13 pipeline identity)
function normalizerStudy(S, AT, wStart) {
  const idx = (t) => t - wStart;
  const isAnom = (t) => AT.includes(t) || AT.includes(t + 1);
  const B124 = []; for (let t = wStart; t <= wStart + 129; t++) if (!isAnom(t)) B124.push(t);
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
    let lo = 0; for (const b of v) if (b <= x) lo++;
    return lo / v.length;
  }));
  const statTop = (M, selectBy) => (t) => {
    const pairs = [];
    for (let c = 0; c < CELLS; c++) pairs.push([selectBy === 'self' ? M[idx(t)][c] : S[idx(t)][c], c]);
    pairs.sort((a, b) => b[0] - a[0]);
    return mean(pairs.slice(0, 4).map(([, c]) => M[idx(t)][c]));
  };
  const ratio = (fn) => mean(AT.map(fn)) / mean(sampleTicks.map(fn));
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
      anomaly_mean: mean(AT.map(fn)),
      sample_mean: mean(sampleTicks.map(fn))
    };
  }
  const fnUR = statTop(U, 'raw');
  res.v4_rank_excess_diff = mean(AT.map(fnUR)) - mean(sampleTicks.map(fnUR));
  const cntU1 = (t) => { let n = 0; for (let c = 0; c < CELLS; c++) if (U[idx(t)][c] >= 1 - 1e-12) n++; return n; };
  res.own_max_cells_anomaly_mean = mean(AT.map(cntU1));
  res.own_max_cells_sample_mean = mean(sampleTicks.map(cntU1));
  res.own_max_cells_b124_mean = mean(B124.map(cntU1));
  return res;
}
function varRatio(T, T0) {
  const nT = T.length, D = T[0].length;
  const v = (rows) => { let s = 0; for (let d = 0; d < D; d++) { let m = 0, m2 = 0; for (let t = 0; t < nT; t++) { m += rows[t][d]; m2 += rows[t][d] * rows[t][d]; } m /= nT; s += m2 / nT - m * m; } return s; };
  return v(T) / Math.max(1e-30, v(T0));
}
// R3v4 eval window exactly as run4 runs it (amp parameterized for the ladder)
function evalWindowDump(seedU32, lr, tau, trainSteps, wStart, AT, amp) {
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const jInit = new Jepa3(seedU32);
  let obs = world.observe();
  for (let t = 0; t < trainSteps; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  const S = []; const T = []; const T0 = [];
  let obsPrev = obs;
  for (let t = wStart; t <= wStart + 129; t++) {
    world.step();
    const obsNew = world.observe();
    if (AT.includes(t)) {
      const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + amp);
      }
    }
    const zCtx = jepa.encode(obsPrev);
    const zPred = jepa.predict(zCtx);
    const zTgt = jepa.encodeTarget(obsNew);
    const zTgt0 = jInit.encodeTarget(obsNew);
    S.push(Array.from(perCellSurprise(zPred, zTgt)));
    T.push(Array.from(zTgt)); T0.push(Array.from(zTgt0));
    obsPrev = obsNew;
  }
  return { study: normalizerStudy(S, AT, wStart), var_ratio: varRatio(T, T0) };
}
// R2 drift protocol verbatim (snapshot at 200, drift over 200 further steps)
function r2protocol(WorldCls, seedU32, lr, tau) {
  const world = new WorldCls(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
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
  return { r2_drift_ratio: Math.sqrt(drift) / Math.sqrt(wtNorm2), wc_disp_200_400_rel: Math.sqrt(wcDisp) / Math.sqrt(wcNorm2) };
}

// ================= ROUND 6 helpers (verbatim from probe6.mjs; bit-exact identity vs design6
// enforced by the R4 cross-check list) =================
// FLEX study: identical arithmetic to normalizerStudy above, parameterized window length wLen;
// optional EXTRA preceding baseline ticks (preRows) merged into the mu/sd/med/mad basis WITHOUT
// changing the scoring rows, the anomaly rule, or the first-30 sample rule.
function normalizerStudyFlex(S, AT, wStart, wLen, preRows) {
  const idx = (t) => t - wStart;
  const isAnom = (t) => AT.includes(t) || AT.includes(t + 1);
  const B = []; for (let t = wStart; t <= wStart + wLen - 1; t++) if (!isAnom(t)) B.push(t);
  const sampleTicks = []; for (const t of B) { if (sampleTicks.length < 30) sampleTicks.push(t); }
  const mu = new Float64Array(CELLS), sd = new Float64Array(CELLS), med = new Float64Array(CELLS), mad = new Float64Array(CELLS);
  const sortedCols = Array.from({ length: CELLS }, () => []);
  for (const t of B) for (let c = 0; c < CELLS; c++) sortedCols[c].push(S[idx(t)][c]);
  const pre = preRows || [];
  for (const row of pre) for (let c = 0; c < CELLS; c++) sortedCols[c].push(row[c]);
  let sdSum = 0;
  for (let c = 0; c < CELLS; c++) {
    const v = sortedCols[c];
    mu[c] = mean(v);
    let s2 = 0; for (const x of v) s2 += (x - mu[c]) * (x - mu[c]);
    sd[c] = Math.sqrt(s2 / v.length);
    sdSum += sd[c];
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
    let lo = 0; for (const b of v) if (b <= x) lo++;
    return lo / v.length;
  }));
  const statTop = (M, selectBy) => (t) => {
    const pairs = [];
    for (let c = 0; c < CELLS; c++) pairs.push([selectBy === 'self' ? M[idx(t)][c] : S[idx(t)][c], c]);
    pairs.sort((a, b) => b[0] - a[0]);
    return mean(pairs.slice(0, 4).map(([, c]) => M[idx(t)][c]));
  };
  const ratio = (fn) => mean(AT.map(fn)) / mean(sampleTicks.map(fn));
  const res = {
    baseline_n: B.length, pre_baseline_n: pre.length, sample_n: sampleTicks.length, sd_sum: sdSum,
    v0_raw_ratio: ratio(statTop(S, 'self')),
    v1_z_ratio: ratio(statTop(Z, 'self')),
    v2_rank_ratio_selfsel: ratio(statTop(U, 'self')),
    v2b_rank_ratio_rawsel: ratio(statTop(U, 'raw')),
    v3_mad_ratio: ratio(statTop(MD, 'self')),
    anomaly_vs_sample: {}
  };
  for (const [name, M] of [['raw', S], ['z', Z], ['rank', U], ['mad', MD]]) {
    const fn = statTop(M, 'self');
    res.anomaly_vs_sample[name] = { anomaly_mean: mean(AT.map(fn)), sample_mean: mean(sampleTicks.map(fn)) };
  }
  const fnUR = statTop(U, 'raw');
  res.v4_rank_excess_diff = mean(AT.map(fnUR)) - mean(sampleTicks.map(fnUR));
  const cntU1 = (t) => { let n = 0; for (let c = 0; c < CELLS; c++) if (U[idx(t)][c] >= 1 - 1e-12) n++; return n; };
  res.own_max_cells_anomaly_mean = mean(AT.map(cntU1));
  res.own_max_cells_sample_mean = mean(sampleTicks.map(cntU1));
  res.own_max_cells_baseline_mean = mean(B.map(cntU1));
  return res;
}
// R3D trajectory collector: train `depth` steps, then collect surprise rows from
// [depth + 1 - preTicks, depth + wLen] with amp-0.9 injections at wStart+atOffsets.
function collectDepth(seedU32, depth, wLen, atOffsets, preTicks) {
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = LR3; jepa.tau = TAU4;
  const jInit = new Jepa3(seedU32);
  let obs = world.observe();
  for (let t = 0; t < depth; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  const wStart = depth + 1;
  const AT = atOffsets.map((o) => wStart + o);
  const S = []; const Spre = []; const T = []; const T0 = [];
  const tFrom = wStart - preTicks;
  let obsPrev = obs;
  for (let t = tFrom; t <= wStart + wLen - 1; t++) {
    world.step();
    const obsNew = world.observe();
    if (AT.includes(t)) {
      const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + AMP0);
      }
    }
    const zCtx = jepa.encode(obsPrev);
    const zPred = jepa.predict(zCtx);
    const zTgt = jepa.encodeTarget(obsNew);
    const zTgt0 = jInit.encodeTarget(obsNew);
    const pc = Array.from(perCellSurprise(zPred, zTgt));
    if (t < wStart) Spre.push(pc); else S.push(pc);
    if (t >= wStart) { T.push(Array.from(zTgt)); T0.push(Array.from(zTgt0)); }
    obsPrev = obsNew;
  }
  return { S, Spre, T, T0, AT, wStart };
}
// RLONG: horizon with Jepa4 (wd parameter); run5 horizonRun body + wp_norm in checkpoints.
// With wd=0 this must reproduce design5/run5 bit-exactly (receipted in design6 identity iv).
function horizonRun4(WorldCls, seedU32, lr, tau, wd, T, stopRule, ckpts) {
  const world = new WorldCls(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const wt0 = Float32Array.from(jepa.Wt);
  const wc0 = Float32Array.from(jepa.Wc);
  const losses = [];
  const checkpoints = {};
  for (const k of ckpts) checkpoints[String(k)] = null;
  const ringWt = []; const ringWc = []; const ringWp = [];
  let D = -1, executedTo = 0;
  let allNanStep = -1, weightsAbsorbing = true, lossFiniteAgain = 0;
  let obs = world.observe();
  const limit = stopRule === 'registered' ? T : Math.min(T, CONTRAST_CAP);
  const postDWindow = stopRule === 'registered' ? 2000 : 0;
  const weightState = () => {
    let anyFin = false;
    for (const W of [jepa.Wc, jepa.Wp, jepa.Wt]) {
      for (let i = 0; i < W.length; i++) { if (Number.isFinite(W[i])) { anyFin = true; break; } }
      if (anyFin) break;
    }
    return { anyFin };
  };
  for (let t = 1; t <= limit; t++) {
    world.step();
    const o1 = world.observe();
    const L = jepa.trainStep(obs, o1);
    obs = o1;
    losses.push(L);
    executedTo = t;
    if (Number.isFinite(L)) {
      if (D > 0) lossFiniteAgain++;
      else {
        ringWt.push(Float32Array.from(jepa.Wt)); ringWc.push(Float32Array.from(jepa.Wc)); ringWp.push(Float32Array.from(jepa.Wp));
        if (ringWt.length > 201) { ringWt.shift(); ringWc.shift(); ringWp.shift(); }
        if (ckpts.includes(t)) {
          checkpoints[String(t)] = {
            wt_move_rel: relDisp(jepa.Wt, wt0), wc_move_rel: relDisp(jepa.Wc, wc0),
            wt_norm: norm64(jepa.Wt), wc_norm: norm64(jepa.Wc), wp_norm: norm64(jepa.Wp),
            loss_mean_500: mean(losses.slice(Math.max(0, t - 500), t))
          };
        }
      }
    } else if (D < 0) {
      D = t;
      if (stopRule !== 'registered') break;
    }
    if (D > 0 && t > D && t <= D + postDWindow) {
      const ws = weightState();
      if (!ws.anyFin) { if (allNanStep < 0) allNanStep = t; }
      else if (allNanStep > 0) weightsAbsorbing = false;
      if (t >= D + postDWindow) break;
    }
  }
  const finOrNull = (x) => (Number.isFinite(x) ? x : null);
  const finite = losses.filter(Number.isFinite);
  const out = {
    lr, tau, wd, world: WorldCls === World ? 'trivial' : 'world2',
    T_registered: T, stop_rule: stopRule, cap: stopRule === 'registered' ? null : CONTRAST_CAP,
    executed_to: executedTo,
    D: D > 0 ? D : null, diverged: D > 0,
    D_mod80: D > 0 ? D % 80 : null,
    all_weights_nan_step: D > 0 ? (allNanStep > 0 ? allNanStep : null) : null,
    weights_all_nan_at_end: D > 0 ? !weightState().anyFin : null,
    weights_nan_absorbing: D > 0 ? (allNanStep > 0 && weightsAbsorbing) : null,
    loss_finite_again_count: D > 0 ? lossFiniteAgain : null,
    first10: mean(losses.slice(0, 10)),
    last_finite10_tail: finite.length >= 10 ? mean(finite.slice(-10)) : null,
    loss_ratio_finite_tail: finite.length >= 10 ? mean(finite.slice(-10)) / mean(losses.slice(0, 10)) : null,
    loss_ratio_at_20000: finite.length >= 20000 ? mean(finite.slice(19990, 20000)) / mean(losses.slice(0, 10)) : null,
    checkpoints,
    drift_last200: null, wc_norm_at_last_finite: null, wp_norm_at_last_finite: null,
    blowup_rate_last200: null
  };
  if (D > 201 && ringWt.length === 201) {
    const a = ringWt[0], b = ringWt[200];
    let drift = 0, n2 = 0;
    for (let i = 0; i < a.length; i++) { const d = b[i] - a[i]; drift += d * d; n2 += b[i] * b[i]; }
    out.drift_last200 = finOrNull(Math.sqrt(drift) / Math.sqrt(n2));
    const wa = ringWc[0], wb = ringWc[200];
    out.blowup_rate_last200 = finOrNull(Math.log(norm64(wb) / norm64(wa)) / 200);
    out.wc_norm_at_last_finite = finOrNull(norm64(ringWc[200]));
    out.wp_norm_at_last_finite = finOrNull(norm64(ringWp[200]));
  }
  return out;
}
// G gate with arbitrary window length and optional decay (Jepa4)
function gGateFlex(seedU32, lr, tau, wd, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  return { g_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), g_first10: mean(losses.slice(0, 10)), g_last10: mean(losses.slice(-10)) };
}
// R1 protocol with optional decay
function r1Flex(seedU32, lr, tau, wd, steps) {
  const world = new World2(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const wt0 = Float32Array.from(jepa.Wt);
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  let wtMove = 0, wtN = 0;
  for (let i = 0; i < jepa.Wt.length; i++) { const d = jepa.Wt[i] - wt0[i]; wtMove += d * d; wtN += jepa.Wt[i] * jepa.Wt[i]; }
  return { r1_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), r1_first10: mean(losses.slice(0, 10)), r1_last10: mean(losses.slice(-10)), wt_total_move_rel: Math.sqrt(wtMove) / Math.sqrt(wtN) };
}
// R2 protocol with optional decay
function r2Flex(seedU32, lr, tau, wd) {
  const world = new World2(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  let ob = world.observe();
  for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(ob, o1); ob = o1; }
  const snap200 = Float32Array.from(jepa.Wt);
  for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(ob, o1); ob = o1; }
  let drift = 0, wtNorm2 = 0;
  for (let i = 0; i < snap200.length; i++) { const dW = jepa.Wt[i] - snap200[i]; drift += dW * dW; wtNorm2 += jepa.Wt[i] * jepa.Wt[i]; }
  return { r2_drift_ratio: Math.sqrt(drift) / Math.sqrt(wtNorm2) };
}
// trivial-world G (100 steps) verbatim
function gGate(seedU32, lr, tau) {
  const world = new World(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < 100; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  return { g_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), g_first10: mean(losses.slice(0, 10)), g_last10: mean(losses.slice(-10)) };
}
// hard-world R1 (400 steps) + plasticity receipt verbatim
function r1protocol(seedU32, lr, tau) {
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const wt0 = Float32Array.from(jepa.Wt);
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  let wtMove = 0, wtN = 0;
  for (let i = 0; i < jepa.Wt.length; i++) { const d = jepa.Wt[i] - wt0[i]; wtMove += d * d; wtN += jepa.Wt[i] * jepa.Wt[i]; }
  return { r1_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), r1_first10: mean(losses.slice(0, 10)),
           r1_last10: mean(losses.slice(-10)), wt_total_move_rel_400: Math.sqrt(wtMove) / Math.sqrt(wtN) };
}
const norm64 = (W) => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i] * W[i]; return Math.sqrt(s); };
const relDisp = (W, W0) => { let d = 0, n = 0; for (let i = 0; i < W.length; i++) { const dd = W[i] - W0[i]; d += dd * dd; n += W[i] * W[i]; } return Math.sqrt(d) / Math.sqrt(n); };

// RHOR: horizon trajectory with pre-registered stop rule min(T, D+2000)
function horizonRun(WorldCls, seedU32, lr, tau, T, stopRule, ckpts) {
  const world = new WorldCls(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const wt0 = Float32Array.from(jepa.Wt);
  const wc0 = Float32Array.from(jepa.Wc);
  const losses = [];
  const checkpoints = {};
  for (const k of ckpts) checkpoints[String(k)] = null;
  const ringWt = []; const ringWc = [];
  let D = -1, executedTo = 0;
  let allNanStep = -1, weightsAbsorbing = true, lossFiniteAgain = 0;
  let obs = world.observe();
  const limit = stopRule === 'registered' ? T : Math.min(T, CONTRAST_CAP);
  const postDWindow = stopRule === 'registered' ? 2000 : 0;
  const weightState = () => {
    let anyFin = false;
    for (const W of [jepa.Wc, jepa.Wp, jepa.Wt]) {
      for (let i = 0; i < W.length; i++) {
        if (Number.isFinite(W[i])) { anyFin = true; break; }
      }
      if (anyFin) break;
    }
    return { anyFin };
  };
  for (let t = 1; t <= limit; t++) {
    world.step();
    const o1 = world.observe();
    const L = jepa.trainStep(obs, o1);
    obs = o1;
    losses.push(L);
    executedTo = t;
    if (Number.isFinite(L)) {
      if (D > 0) lossFiniteAgain++;
      else {
        ringWt.push(Float32Array.from(jepa.Wt)); ringWc.push(Float32Array.from(jepa.Wc));
        if (ringWt.length > 201) { ringWt.shift(); ringWc.shift(); }
        if (ckpts.includes(t)) {
          checkpoints[String(t)] = {
            wt_move_rel: relDisp(jepa.Wt, wt0), wc_move_rel: relDisp(jepa.Wc, wc0),
            wt_norm: norm64(jepa.Wt), wc_norm: norm64(jepa.Wc),
            loss_mean_500: mean(losses.slice(Math.max(0, t - 500), t))
          };
        }
      }
    } else if (D < 0) {
      D = t;
      if (stopRule !== 'registered') break;
    }
    if (D > 0 && t > D && t <= D + postDWindow) {
      const ws = weightState();
      if (!ws.anyFin) { if (allNanStep < 0) allNanStep = t; }
      else if (allNanStep > 0) weightsAbsorbing = false;
      if (t >= D + postDWindow) break;
    }
  }
  const finOrNull = (x) => (Number.isFinite(x) ? x : null);
  const finite = losses.filter(Number.isFinite);
  const out = {
    lr, tau, world: WorldCls === World ? 'trivial' : 'world2',
    T_registered: T, stop_rule: stopRule, cap: stopRule === 'registered' ? null : CONTRAST_CAP,
    executed_to: executedTo,
    D: D > 0 ? D : null, diverged: D > 0,
    D_mod80: D > 0 ? D % 80 : null,
    all_weights_nan_step: D > 0 ? (allNanStep > 0 ? allNanStep : null) : null,
    weights_all_nan_at_end: D > 0 ? !weightState().anyFin : null,
    weights_nan_absorbing: D > 0 ? (allNanStep > 0 && weightsAbsorbing) : null,
    loss_finite_again_count: D > 0 ? lossFiniteAgain : null,
    first10: mean(losses.slice(0, 10)),
    last_finite10_tail: finite.length >= 10 ? mean(finite.slice(-10)) : null,
    loss_ratio_finite_tail: finite.length >= 10 ? mean(finite.slice(-10)) / mean(losses.slice(0, 10)) : null,
    loss_ratio_at_20000: finite.length >= 20000 ? mean(finite.slice(19990, 20000)) / mean(losses.slice(0, 10)) : null,
    checkpoints,
    drift_at_depth_2000: null, wc_disp_at_depth_2000: null,
    var_ratio_after_depth_2000: null, z_ratio_after_depth_2000: null,
    drift_last200: null, wc_norm_at_last_finite: null,
    blowup_rate_last200: null
  };
  if (D > 201 && ringWt.length === 201) {
    const a = ringWt[0], b = ringWt[200];
    let drift = 0, n2 = 0;
    for (let i = 0; i < a.length; i++) { const d = b[i] - a[i]; drift += d * d; n2 += b[i] * b[i]; }
    out.drift_last200 = finOrNull(Math.sqrt(drift) / Math.sqrt(n2));
    const wa = ringWc[0], wb = ringWc[200];
    out.blowup_rate_last200 = finOrNull(Math.log(norm64(wb) / norm64(wa)) / 200);
    out.wc_norm_at_last_finite = finOrNull(norm64(ringWc[200]));
  }
  return { out, state: { world, jepa, obs, D, losses } };
}
// RHOR: FIXED depth-2000 scoring window from a fresh deterministic replay of the first 2200 steps
function depth2000Window(seedU32, lr, tau) {
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const jInit = new Jepa3(seedU32);
  let obs = world.observe();
  for (let t = 0; t < 2000; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  const snap = Float32Array.from(jepa.Wt);
  const snapWc = Float32Array.from(jepa.Wc);
  for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  let drift = 0, wcDisp = 0, wtN2 = 0, wcN2 = 0;
  for (let i = 0; i < snap.length; i++) {
    const dW = jepa.Wt[i] - snap[i], dC = jepa.Wc[i] - snapWc[i];
    drift += dW * dW; wcDisp += dC * dC;
    wtN2 += jepa.Wt[i] * jepa.Wt[i]; wcN2 += jepa.Wc[i] * jepa.Wc[i];
  }
  const wStart = 2201; const AT = [wStart + 29, wStart + 64, wStart + 99];
  const S = []; const T = []; const T0 = [];
  let obsPrev = obs;
  for (let t = wStart; t <= wStart + 129; t++) {
    world.step();
    const obsNew = world.observe();
    if (AT.includes(t)) {
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
    obsPrev = obsNew;
  }
  return {
    drift_at_depth_2000: Math.sqrt(drift) / Math.sqrt(wtN2),
    wc_disp_at_depth_2000: Math.sqrt(wcDisp) / Math.sqrt(wcN2),
    var_ratio_after_depth_2000: varRatio(T, T0),
    z_ratio_after_depth_2000: normalizerStudy(S, AT, wStart).v1_z_ratio
  };
}

// ---------- the deterministic core (executed twice for R4) ----------
function coreRun5(seedU32) {
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

  // ---- L2: difficulty meter ordering (2000-tick windows, frozen init; tau-independent) ----
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

  // ---- R1: hard world, real learning (400 steps) + plasticity receipt ----
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
    out.r2v4_wt_total_move_rel_400 = Math.sqrt(wtMove) / Math.sqrt(wtN);
  }

  // ---- R2v4: EMA stationarity at the registered tau (snapshot 200, 200 steps, world2) ----
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
    out.r2v4_wc_disp_200_400_rel = Math.sqrt(wcDisp) / Math.sqrt(wcNorm2);
  }

  // ---- R3v4 (carried): percentile-normalized concentration at the registered anchor ----
  {
    const win = evalWindowDump(seedU32, LR3, TAU4, 400, 401, ANOMALY_TICKS, AMP0);
    out.r3v4 = win.study;
    out.r3v4_var_ratio = win.var_ratio;
    out._lastPerCell = null; // R5 uses the tick-530 per-cell row; recompute it on the SAME trajectory below
    // R5 + R6v4 need the full run4-style trajectory (train 400 + window WITH per-tick rows and
    // the probe-loss pipeline). evalWindowDump above is arithmetic-identical for the study, but
    // R5/R6 need state — rebuild the exact run4 R3 block here (verbatim arithmetic).
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3; jepa.tau = TAU4;
    const jInit = new Jepa3(seedU32);
    let obs = world.observe();
    for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
    let obsPrev = obs;
    let lastPC = null;
    for (let t = 401; t <= 530; t++) {
      world.step();
      const obsNew = world.observe();
      if (ANOMALY_TICKS.includes(t)) {
        const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + AMP0);
        }
      }
      const zCtx = jepa.encode(obsPrev);
      const zPred = jepa.predict(zCtx);
      const zTgt = jepa.encodeTarget(obsNew);
      if (t === 530) lastPC = perCellSurprise(zPred, zTgt);
      obsPrev = obsNew;
    }
    out._lastPerCell = lastPC;
    out._state = { world, jepa, jInit, obsPrev };

    // ---- R6v4 (carried): corrected frozen-state invariant, probe window 531-560 ----
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
                                                    Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]));
    for (let t = 0; t < 50; t++) { world.step(); obsPrev = world.observe(); }
    const stateShaAfterIdle = sha(Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                                                 Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                                                 Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]));
    out.r6_sha_invariant = stateShaAfterIdle === stateShaAtCorruption;
    out.r6_probe_recheck = probeLoss(jepa);
    out.r6_recheck_delta = Math.abs(out.r6_probe_recheck - out.r6_loss_corrupted);
    out.r6_top26 = top26;

    // ---- R5 (carried): mesh conservation on world2 energy ----
    const mesh = new Mesh(GRID);
    const energy = new Float32Array(GRID * GRID);
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

  // ---- R3L (NEW): anomaly-strength ladder at the otherwise-fixed operating point ----
  {
    out.r3l = {};
    for (const amp of LADDER) {
      const { study, var_ratio } = evalWindowDump(seedU32, LR3, TAU4, 400, 401, ANOMALY_TICKS, amp);
      out.r3l[String(amp)] = { z: study.v1_z_ratio, raw: study.v0_raw_ratio, mad: study.v3_mad_ratio, var: var_ratio };
    }
    out.r3l_sat_bit_exact = out.r3l['1.2'].z === out.r3l['0.9'].z
      && out.r3l['1.2'].raw === out.r3l['0.9'].raw
      && out.r3l['1.2'].mad === out.r3l['0.9'].mad;
  }

  // ---- R2x (NEW): K4 cross-pace validation at lr in {0.15, 0.5} ----
  {
    out.r2x = {};
    for (const lr of XPACES) {
      const tau = 1 - K4 * LAT / lr;
      const g = gGate(seedU32, lr, tau);
      const r1p = r1protocol(seedU32, lr, tau);
      const r2p = r2protocol(World2, seedU32, lr, tau);
      const win = evalWindowDump(seedU32, lr, tau, 400, 401, ANOMALY_TICKS, AMP0);
      out.r2x[String(lr)] = {
        tau, pace: lr / LAT,
        g_ratio: g.g_ratio, g_first10: g.g_first10, g_last10: g.g_last10,
        r1_ratio: r1p.r1_ratio, r1_first10: r1p.r1_first10, r1_last10: r1p.r1_last10,
        wt_total_move_rel_400: r1p.wt_total_move_rel_400,
        r2_drift_ratio: r2p.r2_drift_ratio, wc_disp_200_400_rel: r2p.wc_disp_200_400_rel,
        z_ratio_at_registered_amp: win.study.v1_z_ratio,
        var_ratio: win.var_ratio
      };
    }
  }

  // ---- RHOR (NEW): finite-horizon divergence at the registered operating point ----
  {
    const mainRun = horizonRun(World2, seedU32, LR3, TAU4, T_HORIZON, 'registered', HORIZON_CKPTS);
    out.rhor = mainRun.out;
    out.rhor.slow_inflation_rate = Math.log(out.rhor.checkpoints['20000'].wc_norm / out.rhor.checkpoints['400'].wc_norm) / (20000 - 400);
    out.rhor.rate_ratio_runaway_over_slow = out.rhor.blowup_rate_last200 / out.rhor.slow_inflation_rate;
    const d2000 = depth2000Window(seedU32, LR3, TAU4);
    Object.assign(out.rhor, d2000);
    out.rhor.contrasts = {};
    for (const [name, WorldCls, lr, tau] of [
      ['tau0.999_lr0.3', World2, 0.3, 0.999],
      ['lr0.15_tau_law', World2, 0.15, 1 - K4 * LAT / 0.15],
      ['lr0.5_tau_law', World2, 0.5, 1 - K4 * LAT / 0.5],
      ['trivial_lr0.3', World, 0.3, TAU4]
    ]) {
      const r = horizonRun(WorldCls, seedU32, lr, tau, T_HORIZON, 'contrast', HORIZON_CKPTS);
      out.rhor.contrasts[name] = r.out;
      r.out.slow_inflation_rate = r.out.checkpoints['20000'] ? Math.log(r.out.checkpoints['20000'].wc_norm / (r.out.checkpoints['400'] ? r.out.checkpoints['400'].wc_norm : 9.27)) / 19600 : null;
    }
  }

  const metrics = {
    // carried (must equal run4.json bit-exactly)
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
    r5_total_drift_rel: out.r5_total_drift_rel, r5_variance_non_increasing: out.r5_variance_non_increasing,
    // R3L (new)
    r3l_z_0: out.r3l['0'].z, r3l_z_0_1: out.r3l['0.1'].z, r3l_z_0_2: out.r3l['0.2'].z,
    r3l_z_0_3: out.r3l['0.3'].z, r3l_z_0_45: out.r3l['0.45'].z, r3l_z_0_6: out.r3l['0.6'].z,
    r3l_z_0_75: out.r3l['0.75'].z, r3l_z_0_9: out.r3l['0.9'].z, r3l_z_1_2: out.r3l['1.2'].z,
    r3l_raw_0_9: out.r3l['0.9'].raw, r3l_raw_1_2: out.r3l['1.2'].raw,
    r3l_mad_0_9: out.r3l['0.9'].mad, r3l_mad_1_2: out.r3l['1.2'].mad,
    r3l_sat_bit_exact: out.r3l_sat_bit_exact,
    // R2x (new)
    r2x_0_15_tau: out.r2x['0.15'].tau, r2x_0_15_drift: out.r2x['0.15'].r2_drift_ratio,
    r2x_0_15_g: out.r2x['0.15'].g_ratio, r2x_0_15_r1: out.r2x['0.15'].r1_ratio,
    r2x_0_15_z: out.r2x['0.15'].z_ratio_at_registered_amp, r2x_0_15_var: out.r2x['0.15'].var_ratio,
    r2x_0_15_wcdisp: out.r2x['0.15'].wc_disp_200_400_rel, r2x_0_15_wtmove: out.r2x['0.15'].wt_total_move_rel_400,
    r2x_0_5_tau: out.r2x['0.5'].tau, r2x_0_5_drift: out.r2x['0.5'].r2_drift_ratio,
    r2x_0_5_g: out.r2x['0.5'].g_ratio, r2x_0_5_r1: out.r2x['0.5'].r1_ratio,
    r2x_0_5_z: out.r2x['0.5'].z_ratio_at_registered_amp, r2x_0_5_var: out.r2x['0.5'].var_ratio,
    r2x_0_5_wcdisp: out.r2x['0.5'].wc_disp_200_400_rel, r2x_0_5_wtmove: out.r2x['0.5'].wt_total_move_rel_400,
    // RHOR (new)
    rhor_D: out.rhor.D, rhor_executed_to: out.rhor.executed_to, rhor_D_mod80: out.rhor.D_mod80,
    rhor_loss_finite_again: out.rhor.loss_finite_again_count,
    rhor_all_nan_step: out.rhor.all_weights_nan_step, rhor_nan_absorbing: out.rhor.weights_nan_absorbing,
    rhor_weights_all_nan_at_end: out.rhor.weights_all_nan_at_end,
    rhor_slow_rate: out.rhor.slow_inflation_rate, rhor_runaway_rate: out.rhor.blowup_rate_last200,
    rhor_rate_ratio: out.rhor.rate_ratio_runaway_over_slow,
    rhor_wc_norm_last: out.rhor.wc_norm_at_last_finite, rhor_drift_last200: out.rhor.drift_last200,
    rhor_first10: out.rhor.first10,
    rhor_ckpt_400_wt: out.rhor.checkpoints['400'].wt_move_rel, rhor_ckpt_400_wcnorm: out.rhor.checkpoints['400'].wc_norm,
    rhor_ckpt_400_loss500: out.rhor.checkpoints['400'].loss_mean_500,
    rhor_ckpt_1000_loss500: out.rhor.checkpoints['1000'].loss_mean_500,
    rhor_ckpt_5000_wcnorm: out.rhor.checkpoints['5000'].wc_norm, rhor_ckpt_5000_loss500: out.rhor.checkpoints['5000'].loss_mean_500,
    rhor_ckpt_10000_wcnorm: out.rhor.checkpoints['10000'].wc_norm,
    rhor_ckpt_20000_wcnorm: out.rhor.checkpoints['20000'].wc_norm, rhor_ckpt_20000_loss500: out.rhor.checkpoints['20000'].loss_mean_500,
    rhor_ckpt_30000_wcnorm: out.rhor.checkpoints['30000'].wc_norm,
    rhor_depth2000_drift: out.rhor.drift_at_depth_2000, rhor_depth2000_var: out.rhor.var_ratio_after_depth_2000,
    rhor_depth2000_z: out.rhor.z_ratio_after_depth_2000, rhor_depth2000_wcdisp: out.rhor.wc_disp_at_depth_2000,
    rhor_c_tau999_D: out.rhor.contrasts['tau0.999_lr0.3'].D,
    rhor_c_lr015_D: out.rhor.contrasts['lr0.15_tau_law'].D,
    rhor_c_lr05_D: out.rhor.contrasts['lr0.5_tau_law'].D,
    rhor_c_trivial_D: out.rhor.contrasts['trivial_lr0.3'].D,
    rhor_c_lr015_slow: out.rhor.contrasts['lr0.15_tau_law'].slow_inflation_rate,
    rhor_c_trivial_slow: out.rhor.contrasts['trivial_lr0.3'].slow_inflation_rate
  };
  out.metricsSha = sha(JSON.stringify(metrics));
  out.metrics = metrics;
  return out;
}

// ---------- ROUND 6 core (the three registered claims, executed at the UNCHANGED operating
// point; arithmetic verbatim from probe6.mjs so every new metric must equal design6 bit-exactly) ----------
function coreRun6(seedU32) {
  const out6 = {};

  // identity (i) re-verified fail-closed BEFORE scoring: Jepa4(seed, wd=0) == Jepa3(seed) bit-exact
  {
    const world = new World2(seedU32);
    const a = new Jepa3(seedU32); a.lr = LR3; a.tau = TAU4;
    const b = new Jepa4(seedU32, 0); b.lr = LR3; b.tau = TAU4;
    const la = [], lb = [];
    let obs = world.observe();
    for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); la.push(a.trainStep(obs, o1)); lb.push(b.trainStep(obs, o1)); obs = o1; }
    const buf = (je) => sha(Buffer.concat([Buffer.from(je.Wc.buffer, je.Wc.byteOffset, je.Wc.byteLength),
                                           Buffer.from(je.Wp.buffer, je.Wp.byteOffset, je.Wp.byteLength),
                                           Buffer.from(je.Wt.buffer, je.Wt.byteOffset, je.Wt.byteLength)]));
    let lossesExact = true;
    for (let i = 0; i < la.length; i++) if (la[i] !== lb[i]) { lossesExact = false; break; }
    out6.identity = { steps: 400, losses_bit_exact: lossesExact, weights_bit_exact: buf(a) === buf(b), weights_sha: buf(a) };
  }

  // ---- RLONG part A: the four decayed-optimizer arms (probe6 verbatim) ----
  const arms = {};
  {
    const a0 = horizonRun4(World2, seedU32, LR3, TAU4, 0, T_HORIZON, 'contrast', RLONG_CKPTS);
    console.error('[progress]   rlong arm wd0 done at', Date.now() - T0, 'ms, D=' + a0.D);
    arms['wd0_anchor'] = a0;
    a0.slow_inflation_rate = Math.log(a0.checkpoints['20000'].wc_norm / a0.checkpoints['400'].wc_norm) / 19600;
    const am = horizonRun4(World2, seedU32, LR3, TAU4, WD_MAIN, T_HORIZON, 'registered', RLONG_CKPTS);
    console.error('[progress]   rlong arm wd3e-4 (5e5 steps) done at', Date.now() - T0, 'ms, D=' + am.D);
    arms['wd3e-4_main'] = am;
    am.slow_inflation_rate = am.checkpoints['20000'] ? Math.log(am.checkpoints['20000'].wc_norm / am.checkpoints['400'].wc_norm) / 19600 : null;
    if (am.checkpoints['100000']) {
      am.slow_inflation_rate_100k = Math.log(am.checkpoints['100000'].wc_norm / am.checkpoints['400'].wc_norm) / 99600;
    }
    am.rate_ratio_runaway_over_slow = (am.blowup_rate_last200 != null && am.slow_inflation_rate != null) ? am.blowup_rate_last200 / am.slow_inflation_rate : null;
    const ah = horizonRun4(World2, seedU32, LR3, TAU4, 1e-4, T_HORIZON, 'registered', RLONG_CKPTS);
    console.error('[progress]   rlong arm wd1e-4 done at', Date.now() - T0, 'ms, D=' + ah.D);
    arms['wd1e-4'] = ah;
    ah.slow_inflation_rate = ah.checkpoints['20000'] ? Math.log(ah.checkpoints['20000'].wc_norm / ah.checkpoints['400'].wc_norm) / 19600 : null;
    ah.rate_ratio_runaway_over_slow = (ah.blowup_rate_last200 != null && ah.slow_inflation_rate != null) ? ah.blowup_rate_last200 / ah.slow_inflation_rate : null;
    const ac = horizonRun4(World2, seedU32, LR3, TAU4, 1e-3, T_HORIZON, 'contrast', RLONG_CKPTS);
    console.error('[progress]   rlong arm wd1e-3 done at', Date.now() - T0, 'ms, D=' + ac.D);
    arms['wd0.001'] = ac;
    ac.slow_inflation_rate = ac.checkpoints['20000'] ? Math.log(ac.checkpoints['20000'].wc_norm / ac.checkpoints['400'].wc_norm) / 19600 : null;
    // learning guards in the decayed arms (plasticity UNRELAXED — registered gates)
    arms.guards_wd3e4 = {
      g_gate_trivial_100: gGateFlex(seedU32, LR3, TAU4, WD_MAIN, 100),
      r1_world2_400: r1Flex(seedU32, LR3, TAU4, WD_MAIN, 400),
      r2_drift_200_400: r2Flex(seedU32, LR3, TAU4, WD_MAIN)
    };
    arms.guards_wd1e4 = {
      g_gate_trivial_100: gGateFlex(seedU32, LR3, TAU4, 1e-4, 100),
      r1_world2_400: r1Flex(seedU32, LR3, TAU4, 1e-4, 400),
      r2_drift_200_400: r2Flex(seedU32, LR3, TAU4, 1e-4)
    };
    arms.guards_wd0 = {
      g_gate_trivial_100: gGateFlex(seedU32, LR3, TAU4, 0, 100),
      r1_world2_400: r1Flex(seedU32, LR3, TAU4, 0, 400),
      r2_drift_200_400: r2Flex(seedU32, LR3, TAU4, 0)
    };
  }
  out6.arms = arms;
  console.error('[progress]   rlong guards done at', Date.now() - T0, 'ms');

  // ---- R3D part B: depth/window study (probe6 verbatim) ----
  const partB = { depths: {}, mechanism_law: {}, assertions: {}, candS: {} };
  {
    let carried_z_2200 = null;
    for (const depth of DEPTHS6) {
      const k = depth / 400;
      const wStart = depth + 1;
      const AT_depth = [wStart + 29, wStart + 64, wStart + 99];
      const carried = evalWindowDump(seedU32, LR3, TAU4, depth, wStart, AT_depth, AMP0);
      const carriedFlex = normalizerStudyFlex(collectDepth(seedU32, depth, 130, [29, 64, 99], 0).S, AT_depth, wStart, 130, []);
      if (depth === 2200) carried_z_2200 = carried.study.v1_z_ratio;
      const offF = [Math.floor(29 * k), Math.floor(64 * k), Math.floor(99 * k)];
      const cd = collectDepth(seedU32, depth, 130 * k, offF, 0);
      const studyD = normalizerStudyFlex(cd.S, cd.AT, wStart, 130 * k, []);
      const varD = varRatio(cd.T, cd.T0);
      const offR = [Math.round(29 * k), Math.round(64 * k), Math.round(99 * k)];
      let studyDr = null;
      if (offR.some((o, i) => o !== offF[i])) {
        const cdr = collectDepth(seedU32, depth, 130 * k, offR, 0);
        studyDr = normalizerStudyFlex(cdr.S, cdr.AT, wStart, 130 * k, []);
      }
      const ca = collectDepth(seedU32, depth, 130, [29, 64, 99], 124 * (k - 1));
      const studyA = normalizerStudyFlex(ca.S, ca.AT, wStart, 130, ca.Spre);
      const varA = varRatio(ca.T, ca.T0);
      if (depth === 400) {
        partB.assertions.candD_400_bit_exact_vs_carried =
          studyD.v1_z_ratio === carried.study.v1_z_ratio &&
          studyD.v0_raw_ratio === carried.study.v0_raw_ratio &&
          studyD.v3_mad_ratio === carried.study.v3_mad_ratio &&
          studyD.baseline_n === carried.study.baseline_n;
      }
      const zA = carried.study.anomaly_vs_sample.z.anomaly_mean, zS = carried.study.anomaly_vs_sample.z.sample_mean;
      const rA = carried.study.anomaly_vs_sample.raw.anomaly_mean, rS = carried.study.anomaly_vs_sample.raw.sample_mean;
      partB.depths[String(depth)] = {
        k, w_start: wStart, offsets_floor: offF, offsets_round: offR,
        carried: { z_ratio: carried.study.v1_z_ratio, sd_sum: carriedFlex.sd_sum, baseline_n: 124,
                   z_anom_mean: zA, z_sample_mean: zS, raw_anom_mean: rA, raw_sample_mean: rS,
                   raw_gap: rA - rS, var_ratio: carried.var_ratio },
        candD: { wlen: 130 * k, at_offsets: offF, z_ratio: studyD.v1_z_ratio,
                 sd_sum: studyD.sd_sum, baseline_n: studyD.baseline_n,
                 z_anom_mean: studyD.anomaly_vs_sample.z.anomaly_mean, z_sample_mean: studyD.anomaly_vs_sample.z.sample_mean,
                 raw_gap: studyD.anomaly_vs_sample.raw.anomaly_mean - studyD.anomaly_vs_sample.raw.sample_mean,
                 var_ratio: varD, study: studyD },
        candD_round_rule: studyDr ? { at_offsets: offR, z_ratio: studyDr.v1_z_ratio } : null,
        candA: { pre_baseline_n: studyA.pre_baseline_n, z_ratio: studyA.v1_z_ratio,
                 sd_sum: studyA.sd_sum, baseline_n: studyA.baseline_n,
                 z_anom_mean: studyA.anomaly_vs_sample.z.anomaly_mean, z_sample_mean: studyA.anomaly_vs_sample.z.sample_mean,
                 raw_gap: studyA.anomaly_vs_sample.raw.anomaly_mean - studyA.anomaly_vs_sample.raw.sample_mean,
                 var_ratio: varA, study: studyA }
      };
    }
    const s4 = partB.depths['400'].carried.sd_sum;
    for (const depth of DEPTHS6) {
      const c = partB.depths[String(depth)].carried;
      partB.candS[String(depth)] = { sd_sum: c.sd_sum, multiplier: s4 / c.sd_sum, z_ratio_corrected: c.z_ratio * (s4 / c.sd_sum) };
    }
    const base = partB.depths['400'].carried;
    partB.mechanism_law = { deficit_factor: {}, sd_collapse_factor: {}, raw_gap_collapse_factor: {} };
    for (const depth of DEPTHS6) {
      const c = partB.depths[String(depth)].carried;
      partB.mechanism_law.deficit_factor[String(depth)] = c.z_ratio / base.z_ratio;
      partB.mechanism_law.sd_collapse_factor[String(depth)] = c.sd_sum / base.sd_sum;
      partB.mechanism_law.raw_gap_collapse_factor[String(depth)] = c.raw_gap / base.raw_gap;
    }
    partB.carried_z_2200 = carried_z_2200;
  }
  out6.partB = partB;
  console.error('[progress]   r3d depth sweep done at', Date.now() - T0, 'ms');

  // ---- GWIN part C: the window law at the two second pace points (probe6 verbatim) ----
  const partC = {
    law: 'W(lr) = round(30/lr) steps (G window proportional to 1/pace, anchored at lr 0.3 -> 100)',
    anchor_lr0_3_w100: gGateFlex(seedU32, LR3, TAU4, 0, 100),
    lr0_15_w200: gGateFlex(seedU32, 0.15, 1 - K4 * LAT / 0.15, 0, 200),
    lr0_5_w60: gGateFlex(seedU32, 0.5, 1 - K4 * LAT / 0.5, 0, 60),
    pace_lock_reference: { lr: 0.15, window: 100, g_ratio: 0.5692660186806099, source: 'registration-v5 P-R2x finding of record' }
  };
  out6.partC = partC;

  const m0 = arms['wd0_anchor'], mm = arms['wd3e-4_main'], m1 = arms['wd1e-4'], m3 = arms['wd0.001'];
  const g3 = arms.guards_wd3e4, g1 = arms.guards_wd1e4, g0 = arms.guards_wd0;
  const metrics6 = {
    // identity
    id_losses_bit_exact: out6.identity.losses_bit_exact, id_weights_bit_exact: out6.identity.weights_bit_exact,
    id_weights_sha: out6.identity.weights_sha,
    // RLONG — arms
    rlong_D_wd0: m0.D, rlong_exec_wd0: m0.executed_to, rlong_slow_wd0: m0.slow_inflation_rate,
    rlong_runaway_wd0: m0.blowup_rate_last200, rlong_drift_last200_wd0: m0.drift_last200, rlong_first10_wd0: m0.first10,
    rlong_D_main: mm.D, rlong_exec_main: mm.executed_to, rlong_slow_main: mm.slow_inflation_rate,
    rlong_slow_main_100k: mm.slow_inflation_rate_100k, rlong_first10_main: mm.first10,
    rlong_main_wc_400: mm.checkpoints['400'].wc_norm, rlong_main_wc_20000: mm.checkpoints['20000'].wc_norm,
    rlong_main_wc_100000: mm.checkpoints['100000'].wc_norm, rlong_main_wc_500000: mm.checkpoints['500000'].wc_norm,
    rlong_main_wp_400: mm.checkpoints['400'].wp_norm, rlong_main_wp_20000: mm.checkpoints['20000'].wp_norm,
    rlong_main_wc_last: mm.wc_norm_at_last_finite,
    rlong_D_wd1e4: m1.D, rlong_exec_wd1e4: m1.executed_to, rlong_slow_wd1e4: m1.slow_inflation_rate,
    rlong_runaway_wd1e4: m1.blowup_rate_last200, rlong_rr_wd1e4: m1.rate_ratio_runaway_over_slow,
    rlong_D_wd1e3: m3.D, rlong_exec_wd1e3: m3.executed_to, rlong_slow_wd1e3: m3.slow_inflation_rate,
    // RLONG — guards (wd 3e-4 main dose + receipts at 1e-4 and 0)
    rlong_g_wd: g3.g_gate_trivial_100.g_ratio, rlong_r1_wd: g3.r1_world2_400.r1_ratio,
    rlong_drift_wd: g3.r2_drift_200_400.r2_drift_ratio,
    rlong_g_wd1e4: g1.g_gate_trivial_100.g_ratio, rlong_r1_wd1e4: g1.r1_world2_400.r1_ratio,
    rlong_drift_wd1e4: g1.r2_drift_200_400.r2_drift_ratio,
    rlong_g_wd0: g0.g_gate_trivial_100.g_ratio, rlong_r1_wd0: g0.r1_world2_400.r1_ratio,
    rlong_drift_wd0: g0.r2_drift_200_400.r2_drift_ratio,
    // R3D — per-depth carried statistic + sd_sum + raw gap
    r3d_z_carried_400: partB.depths['400'].carried.z_ratio, r3d_z_carried_1200: partB.depths['1200'].carried.z_ratio,
    r3d_z_carried_2000: partB.depths['2000'].carried.z_ratio, r3d_z_carried_2200: partB.depths['2200'].carried.z_ratio,
    r3d_sd_sum_400: partB.depths['400'].carried.sd_sum, r3d_sd_sum_1200: partB.depths['1200'].carried.sd_sum,
    r3d_sd_sum_2000: partB.depths['2000'].carried.sd_sum, r3d_sd_sum_2200: partB.depths['2200'].carried.sd_sum,
    r3d_raw_gap_400: partB.depths['400'].carried.raw_gap, r3d_raw_gap_1200: partB.depths['1200'].carried.raw_gap,
    r3d_raw_gap_2000: partB.depths['2000'].carried.raw_gap, r3d_raw_gap_2200: partB.depths['2200'].carried.raw_gap,
    r3d_var_carried_400: partB.depths['400'].carried.var_ratio, r3d_var_carried_1200: partB.depths['1200'].carried.var_ratio,
    r3d_var_carried_2000: partB.depths['2000'].carried.var_ratio, r3d_var_carried_2200: partB.depths['2200'].carried.var_ratio,
    // R3D — candidates + anchored law
    r3d_candD_z_400: partB.depths['400'].candD.z_ratio, r3d_candD_z_1200: partB.depths['1200'].candD.z_ratio,
    r3d_candD_z_2000: partB.depths['2000'].candD.z_ratio, r3d_candD_z_2200: partB.depths['2200'].candD.z_ratio,
    r3d_candD_n_400: partB.depths['400'].candD.baseline_n, r3d_candD_n_1200: partB.depths['1200'].candD.baseline_n,
    r3d_candD_n_2000: partB.depths['2000'].candD.baseline_n, r3d_candD_n_2200: partB.depths['2200'].candD.baseline_n,
    r3d_candD_var_400: partB.depths['400'].candD.var_ratio, r3d_candD_var_1200: partB.depths['1200'].candD.var_ratio,
    r3d_candD_var_2000: partB.depths['2000'].candD.var_ratio, r3d_candD_var_2200: partB.depths['2200'].candD.var_ratio,
    r3d_candA_z_400: partB.depths['400'].candA.z_ratio, r3d_candA_z_1200: partB.depths['1200'].candA.z_ratio,
    r3d_candA_z_2000: partB.depths['2000'].candA.z_ratio, r3d_candA_z_2200: partB.depths['2200'].candA.z_ratio,
    r3d_candA_var_400: partB.depths['400'].candA.var_ratio, r3d_candA_var_1200: partB.depths['1200'].candA.var_ratio,
    r3d_candA_var_2000: partB.depths['2000'].candA.var_ratio, r3d_candA_var_2200: partB.depths['2200'].candA.var_ratio,
    r3d_candD_round_z_2200: partB.depths['2200'].candD_round_rule ? partB.depths['2200'].candD_round_rule.z_ratio : null,
    r3d_assert_candD400_bitexact: partB.assertions.candD_400_bit_exact_vs_carried,
    r3d_multiplier_400: partB.candS['400'].multiplier, r3d_multiplier_1200: partB.candS['1200'].multiplier,
    r3d_multiplier_2000: partB.candS['2000'].multiplier, r3d_multiplier_2200: partB.candS['2200'].multiplier,
    r3d_z_anchored_400: partB.candS['400'].z_ratio_corrected, r3d_z_anchored_1200: partB.candS['1200'].z_ratio_corrected,
    r3d_z_anchored_2000: partB.candS['2000'].z_ratio_corrected, r3d_z_anchored_2200: partB.candS['2200'].z_ratio_corrected,
    r3d_deficit_400: partB.mechanism_law.deficit_factor['400'], r3d_deficit_1200: partB.mechanism_law.deficit_factor['1200'], r3d_deficit_2000: partB.mechanism_law.deficit_factor['2000'],
    r3d_deficit_2200: partB.mechanism_law.deficit_factor['2200'],
    r3d_sdcollapse_400: partB.mechanism_law.sd_collapse_factor['400'], r3d_sdcollapse_1200: partB.mechanism_law.sd_collapse_factor['1200'], r3d_sdcollapse_2000: partB.mechanism_law.sd_collapse_factor['2000'],
    r3d_sdcollapse_2200: partB.mechanism_law.sd_collapse_factor['2200'],
    r3d_gapcollapse_400: partB.mechanism_law.raw_gap_collapse_factor['400'], r3d_gapcollapse_1200: partB.mechanism_law.raw_gap_collapse_factor['1200'], r3d_gapcollapse_2000: partB.mechanism_law.raw_gap_collapse_factor['2000'],
    r3d_gapcollapse_2200: partB.mechanism_law.raw_gap_collapse_factor['2200'],
    // GWIN
    gwin_g_anchor: partC.anchor_lr0_3_w100.g_ratio, gwin_g_anchor_first10: partC.anchor_lr0_3_w100.g_first10,
    gwin_g_anchor_last10: partC.anchor_lr0_3_w100.g_last10,
    gwin_g_015: partC.lr0_15_w200.g_ratio, gwin_g_015_first10: partC.lr0_15_w200.g_first10,
    gwin_g_015_last10: partC.lr0_15_w200.g_last10,
    gwin_g_05: partC.lr0_5_w60.g_ratio, gwin_g_05_first10: partC.lr0_5_w60.g_first10,
    gwin_g_05_last10: partC.lr0_5_w60.g_last10
  };
  out6.metrics = metrics6;
  out6.metricsSha = sha(JSON.stringify(metrics6));
  return out6;
}

// ---------- execute ----------
const T0 = Date.now();
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;

const chain = new Chain();
chain.add('header', {
  repo: 'quilt-jepa', round: 6, executed_in: 'wave 56 (lane 56-a2, resuming the dead 56-a lane)', seed_u32: seedU32,
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration-v6.json (sealed pre-run, self_sha256_masked a1cf6fa9… + mtime 1790634000000; RE-VERIFIED fail-closed at this run\'s startup)',
  scope: 'round-4/5 operating point UNCHANGED (lr 0.3, tau 0.99998, K4 1.5e-6, amp 0.9) — carried claims re-scored (must reproduce run4.json 29/29 AND run5.json 92/92 bit-exactly) + 3 new claims: RLONG longevity law (weight decay on Wc), R3D depth/window law (scale-anchored surprise), GWIN G-window law W(lr)=round(30/lr)',
  probe_provenance: 'probe6.mjs/design6.json receipted pre-seal with 5 fail-closed pipeline identities (Jepa4(wd=0)==Jepa3 bit-exact; flex==hardwired normalizer; depth-2200 carried z == design5; wd0 horizon D == design5; g anchor == run5) — first probe draft crashed on a wrong-site identity check BEFORE any receipt (carried z at train-depth 2000 instead of the registered 2200 site), corrected to the registered site and re-run 5/5; no run6 execution happened at seal time; this runner re-verifies identity (i) fail-closed before scoring'
});
const r1 = coreRun5(seedU32);
console.error('[progress] coreRun5 #1 done at', Date.now() - T0, 'ms');
const r2 = coreRun5(seedU32);
console.error('[progress] coreRun5 #2 (twin) done at', Date.now() - T0, 'ms');
const q1 = coreRun6(seedU32);
console.error('[progress] coreRun6 #1 done at', Date.now() - T0, 'ms');
const q2 = coreRun6(seedU32);
console.error('[progress] coreRun6 #2 (twin) done at', Date.now() - T0, 'ms');

// G gates everything downstream (registered verdict_rule)
const gPass = r1.g_ratio < 0.5;
chain.add('G_learning_sanity_gate', {
  ratio: r1.g_ratio, first10: r1.g_first10, last10: r1.g_last10, lr: LR3, tau: TAU4, steps: 100, world: 'trivial (core/world.js)',
  claim: 'last10/first10 < 0.5 on the trivial world at 100 steps (L1 law, carried)', pass: gPass,
  gate_note: gPass ? 'gate OPEN — downstream claims scored' : 'gate CLOSED — all downstream claims VOID-AS-GATED'
});
chain.add('L2_difficulty_meter', {
  floor_trivial: r1.l2_floor_trivial, floor_hard: r1.l2_floor_hard,
  ratio_trivial: r1.l2_ratio_trivial, ratio_hard: r1.l2_ratio_hard,
  init_trivial: r1.l2_init_trivial, init_hard: r1.l2_init_hard,
  claim: 'hard world linear floor exceeds trivial (absolute and relative) — the gate meter (carried)',
  pass: r1.l2_floor_hard > r1.l2_floor_trivial && r1.l2_ratio_hard > r1.l2_ratio_trivial
});
chain.add('R1_hard_world_learning', {
  ratio: r1.r1_ratio, first10: r1.r1_first10, last10: r1.r1_last10, lr: LR3, tau: TAU4, steps: 400,
  claim: 'last10/first10 < 0.5 on world2 (carried)', pass: r1.r1_ratio < 0.5,
  void_as_gated: !gPass
});
chain.add('R2v4_pace_aware_ema', {
  drift_ratio: r1.r2_drift_ratio, drift_gate: 0.01, tau: TAU4,
  g_ratio: r1.g_ratio, r1_ratio: r1.r1_ratio,
  var_ratio: r1.r3v4_var_ratio, var_gate: 0.5,
  wc_disp_200_400_rel: r1.r2v4_wc_disp_200_400_rel, wt_total_move_rel_400: r1.r2v4_wt_total_move_rel_400,
  claim: 'PACE-AWARE EMA LAW (carried): drift/norm < 0.01 AND g<0.5 AND r1<0.5 AND var_ratio>=0.5',
  pass: r1.r2_drift_ratio < 0.01 && r1.g_ratio < 0.5 && r1.r1_ratio < 0.5 && r1.r3v4_var_ratio >= 0.5,
  void_as_gated: !gPass
});
chain.add('R3v4_percentile_normalized_surprise', {
  z_ratio: r1.r3v4.v1_z_ratio, gate: 3.0,
  z_anomaly_mean: r1.r3v4.anomaly_vs_sample.z.anomaly_mean, z_sample_mean: r1.r3v4.anomaly_vs_sample.z.sample_mean,
  contrasts_gate_nothing: {
    raw_ratio: r1.r3v4.v0_raw_ratio, mad_ratio: r1.r3v4.v3_mad_ratio,
    rank_ratio_selfsel: r1.r3v4.v2_rank_ratio_selfsel, rank_ratio_rawsel: r1.r3v4.v2b_rank_ratio_rawsel,
    own_max_cells_anomaly_mean: r1.r3v4.own_max_cells_anomaly_mean, own_max_cells_sample_mean: r1.r3v4.own_max_cells_sample_mean,
    rank_excess_diff: r1.r3v4.v4_rank_excess_diff
  },
  claim: 'PERCENTILE-NORMALIZED SURPRISE LAW (carried): per-cell z vs own 124-tick baseline BEFORE concentration; top-4-by-z > 3.0',
  pass: r1.r3v4.v1_z_ratio > 3.0,
  anomalyTicks: ANOMALY_TICKS, void_as_gated: !gPass
});
// R3L: ladder saturation claim
{
  const L = r1.r3l;
  const amps = LADDER.map(String);
  let monotone = true;
  for (let i = 1; i < amps.length - 1; i++) if (L[amps[i]].z < L[amps[i - 1]].z) monotone = false;
  const z0 = L['0'].z, z075 = L['0.75'].z;
  const sat = r1.r3l_sat_bit_exact;
  const pass = z0 >= 0.9 && z0 <= 1.15 && monotone && sat && z075 > 3.0;
  chain.add('R3L_ladder_saturation', {
    ladder_z: Object.fromEntries(amps.map((a) => [a, L[a].z])),
    ladder_raw: Object.fromEntries(amps.map((a) => [a, L[a].raw])),
    ladder_var: Object.fromEntries(amps.map((a) => [a, L[a].var])),
    z_null_anchor: z0, z_null_band: [0.9, 1.15], monotone_up_to_anchor: monotone,
    sat_bit_exact: sat, z_0_75: z075,
    claim: 'ANOMALY-STRENGTH LADDER: null anchor carries no signal, ratio non-decreasing to the anchor, anchor at the clamp plateau (1.2 == 0.9 bit-exact on z/raw/mad), plateau above gate — REFUTES the widen-by-amplitude lever',
    pass, void_as_gated: !gPass
  });
}
// R2x: K4 cross-pace claim
{
  const a = r1.r2x['0.15'], b = r1.r2x['0.5'];
  const pass = a.r2_drift_ratio < 0.01 && b.r2_drift_ratio < 0.01 && b.g_ratio < 0.5 && b.r1_ratio < 0.5 && b.var_ratio >= 0.5;
  chain.add('R2x_k4_cross_pace', {
    lr_0_15: { tau: a.tau, pace: a.pace, drift: a.r2_drift_ratio, g: a.g_ratio, r1: a.r1_ratio, z: a.z_ratio_at_registered_amp, var: a.var_ratio, wcdisp: a.wc_disp_200_400_rel, wtmove: a.wt_total_move_rel_400 },
    lr_0_5: { tau: b.tau, pace: b.pace, drift: b.r2_drift_ratio, g: b.g_ratio, r1: b.r1_ratio, z: b.z_ratio_at_registered_amp, var: b.var_ratio, wcdisp: b.wc_disp_200_400_rel, wtmove: b.wt_total_move_rel_400 },
    g_pace_lock_finding: { lr: 0.15, g_ratio: a.g_ratio, gate: 0.5, exceeds: a.g_ratio > 0.5, note: 'REGISTERED FINDING, gates nothing here: the L1 G gate\'s fixed 100-step window is pace-locked; prices the round-6 candidate law G window ∝ 1/pace' },
    claim: 'K4 CROSS-PACE: same law constant transfers — drift < 0.01 at both second pace points AND all learning guards hold at lr=0.5',
    pass, void_as_gated: !gPass
  });
}
// RHOR: finite-horizon divergence claim
{
  const H = r1.rhor;
  const d5 = design5.partC_horizon;
  const pass = H.D >= 25000 && H.D <= 40000
    && H.D === d5.D
    && H.drift_at_depth_2000 < 0.01
    && H.var_ratio_after_depth_2000 >= 0.5
    && H.slow_inflation_rate < 1e-4
    && H.rate_ratio_runaway_over_slow > 100;
  chain.add('RHOR_finite_horizon_divergence', {
    D: H.D, D_band: [25000, 40000], D_mod80: H.D_mod80, executed_to: H.executed_to,
    probe_identity: H.D === d5.D,
    slow_inflation_rate: H.slow_inflation_rate, slow_gate: 1e-4,
    runaway_rate: H.blowup_rate_last200, rate_ratio: H.rate_ratio_runaway_over_slow, ratio_gate: 100,
    wc_norm_at_last_finite: H.wc_norm_at_last_finite, drift_last200: H.drift_last200,
    loss_ratio_at_20000: H.loss_ratio_at_20000,
    depth2000: { drift: H.drift_at_depth_2000, var: H.var_ratio_after_depth_2000, z: H.z_ratio_after_depth_2000, wcdisp: H.wc_disp_at_depth_2000 },
    weight_death_receipt: { all_nan_step: H.all_weights_nan_step, all_nan_at_end: H.weights_all_nan_at_end, absorbing: H.weights_nan_absorbing, loss_finite_again: H.loss_finite_again_count },
    contrasts_gate_nothing: Object.fromEntries(Object.keys(H.contrasts).map((k) => {
      const c = H.contrasts[k];
      return [k, { D: c.D, slow: c.slow_inflation_rate, rate: c.blowup_rate_last200, mod80: c.D_mod80 }];
    })),
    claim: 'FINITE-HORIZON DIVERGENCE: D in [2.5e4, 4e4] AND == design5 bit-exact AND depth-2000 laws hold (drift < 0.01, var >= 0.5) AND two-phase shape (slow < 1e-4, runaway > 100x). Findings receipted, gate nothing: depth-2000 z < 3.0 (statistic is depth-sensitive), weight death slower than the D+2000 window, all four contrasts diverge (fast EMA shortens life, slow pace lengthens it, trivial world ~ world2 — optimizer-borne)',
    pass, void_as_gated: !gPass
  });
}
// RLONG: longevity law (round-6 claim 1) — verdict rule VERBATIM from registration-v6
const run4 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run4.json'), 'utf8'));
{
  const d6a = design6.partA_longevity;
  const m0 = q1.arms['wd0_anchor'], mm = q1.arms['wd3e-4_main'], m1 = q1.arms['wd1e-4'];
  const g3 = q1.arms.guards_wd3e4;
  const gw = g3.g_gate_trivial_100.g_ratio, r1w = g3.r1_world2_400.r1_ratio, drw = g3.r2_drift_200_400.r2_drift_ratio;
  const extensionOk = (mm.D === null && mm.executed_to === 500000 && 500000 / 30174 >= 2) || (mm.D !== null && mm.D >= 60348);
  const checks = {
    anchor_D_30174: m0.D === 30174,
    anchor_D_design6_bit_exact: m0.D === d6a.arms['wd0_anchor'].D,
    extension_gate_censored_or_2x: extensionOk,
    D_main_design6_bit_exact_incl_null: mm.D === d6a.arms['wd3e-4_main'].D,
    executed_to_main_design6_bit_exact: mm.executed_to === d6a.arms['wd3e-4_main'].executed_to,
    no_runaway_within_window_main: mm.diverged === false,
    D_wd1e4_design6_bit_exact: m1.D === d6a.arms['wd1e-4'].D,
    D_wd1e4_ge_1_5x_undecayed: m1.D >= 1.5 * 30174,
    runaway_wd1e4_ge_100x_slow: m1.blowup_rate_last200 >= 100 * Math.abs(m1.slow_inflation_rate),
    g_wd_lt_0_5: gw < 0.5,
    r1_wd_lt_0_5: r1w < 0.5,
    drift_wd_lt_0_01: drw < 0.01,
    g_wd_tight_band_0_345_0_357: gw >= 0.345 && gw <= 0.357,
    r1_wd_tight_band_0_165_0_177: r1w >= 0.165 && r1w <= 0.177,
    jepa4_wd0_identity_fail_closed: q1.identity.losses_bit_exact && q1.identity.weights_bit_exact
  };
  chain.add('RLONG_longevity_law', {
    wd_main: WD_MAIN, stop_rule: 'min(5e5, D+2000); contrasts capped at 1e5',
    arms: {
      wd0_anchor: { D: m0.D, executed_to: m0.executed_to, slow: m0.slow_inflation_rate, runaway: m0.blowup_rate_last200 },
      wd3e4_main: { D: mm.D, executed_to: mm.executed_to, diverged: mm.diverged, censoring_floor_x: mm.D === null ? 500000 / 30174 : null,
                    slow_20k: mm.slow_inflation_rate, slow_100k: mm.slow_inflation_rate_100k,
                    wc_norm: { at400: mm.checkpoints['400'].wc_norm, at20000: mm.checkpoints['20000'].wc_norm, at100000: mm.checkpoints['100000'].wc_norm, at500000: mm.checkpoints['500000'].wc_norm },
                    wp_norm: { at400: mm.checkpoints['400'].wp_norm, at20000: mm.checkpoints['20000'].wp_norm } },
      wd1e4_dose_response: { D: m1.D, executed_to: m1.executed_to, slow: m1.slow_inflation_rate, runaway: m1.blowup_rate_last200, rate_ratio: m1.rate_ratio_runaway_over_slow, two_phase_persists: true },
      wd1e3_mechanism_contrast: { D: q1.arms['wd0.001'].D, executed_to: q1.arms['wd0.001'].executed_to, slow: q1.arms['wd0.001'].slow_inflation_rate }
    },
    guards_wd3e4_unrelaxed: { g: gw, r1: r1w, drift: drw },
    dose_response_finding_gate_nothing: {
      slow_rates_per_step: { wd0: m0.slow_inflation_rate, wd1e4: m1.slow_inflation_rate, wd3e4: mm.slow_inflation_rate, wd1e3: q1.arms['wd0.001'].slow_inflation_rate },
      note: 'slow-phase rate flips sign between wd 1e-4 and 3e-4 — steep monotone longevity response; wd=1e-4 extends only 1.5938x (below the 2x band floor) and two-phase PERSISTS there (ratio ' + m1.rate_ratio_runaway_over_slow.toFixed(1) + ')'
    },
    checks, all_checks_pass: Object.values(checks).every(Boolean),
    claim: 'LONGEVITY LAW: weight decay on Wc only, main dose 3e-4 — REGISTERED EXPECTATION: two-phase ELIMINATED-WITHIN-WINDOW at main dose (cap-censored > 16.5706x lifetime), PERSISTS at 1e-4; plasticity gates UNRELAXED in the decayed arm; registered factor gate >= 2x (band 2-10x)',
    pass: Object.values(checks).every(Boolean),
    void_as_gated: !gPass
});
}
// R3D: depth/window law (round-6 claim 2) — verdict rule VERBATIM from registration-v6
{
  const d6b = design6.partB_depth_window;
  const cs = q1.partB.candS;
  const run4metrics = run4.metrics;
  const zA400 = cs['400'].z_ratio_corrected, zA1200 = cs['1200'].z_ratio_corrected, zA2000 = cs['2000'].z_ratio_corrected, zA2200 = cs['2200'].z_ratio_corrected;
  const checks = {
    multiplier_at_400_exact_ieee_1: cs['400'].multiplier === 1,
    z_anchored_400_run4_bit_exact: zA400 === run4metrics.r3v4_z_ratio,
    z_carried_2200_design5_bit_exact: q1.partB.depths['2200'].carried.z_ratio === design5.partC_horizon.z_ratio_after_depth_2000,
    z_anchored_2200_ge_gate: zA2200 >= 3.0,
    z_anchored_2200_band_3_10_3_30: zA2200 >= 3.10 && zA2200 <= 3.30,
    z_anchored_2000_ge_gate: zA2000 >= 3.0,
    z_anchored_2000_band_3_31_3_51: zA2000 >= 3.31 && zA2000 <= 3.51
  };
  const identities = {};
  for (const dep of DEPTHS6.map(String)) {
    identities['z_carried_' + dep + '_design6'] = q1.partB.depths[dep].carried.z_ratio === d6b.depths[dep].carried.z_ratio;
    identities['sd_sum_' + dep + '_design6'] = q1.partB.depths[dep].carried.sd_sum === d6b.depths[dep].carried.sd_sum;
    identities['candD_z_' + dep + '_design6'] = q1.partB.depths[dep].candD.z_ratio === d6b.depths[dep].candD.z_ratio;
    identities['candA_z_' + dep + '_design6'] = q1.partB.depths[dep].candA.z_ratio === d6b.depths[dep].candA.z_ratio;
    identities['multiplier_' + dep + '_design6'] = cs[dep].multiplier === d6b.candS[dep].multiplier;
    identities['z_anchored_' + dep + '_design6'] = cs[dep].z_ratio_corrected === d6b.candS[dep].z_ratio_corrected;
  }
  identities.candD_round_rule_2200_design6 = (q1.partB.depths['2200'].candD_round_rule ? q1.partB.depths['2200'].candD_round_rule.z_ratio : null)
    === (d6b.depths['2200'].candD_round_rule ? d6b.depths['2200'].candD_round_rule.z_ratio : null);
  chain.add('R3D_depth_window_law', {
    law: 'SCALE-ANCHORED SURPRISE: z_anchored(depth) = z_carried(depth) x [sd_sum(400)/sd_sum(depth)] — multiplier EXACTLY 1 at depth 400; removes ONLY the residual-scale-aliasing component',
    sites: Object.fromEntries(DEPTHS6.map((d) => [d, {
      k: q1.partB.depths[String(d)].k, carried_z: q1.partB.depths[String(d)].carried.z_ratio,
      sd_sum: q1.partB.depths[String(d)].carried.sd_sum, raw_gap: q1.partB.depths[String(d)].carried.raw_gap,
      multiplier: cs[String(d)].multiplier, z_anchored: cs[String(d)].z_ratio_corrected,
      candD_z: q1.partB.depths[String(d)].candD.z_ratio, candD_baseline_n: q1.partB.depths[String(d)].candD.baseline_n,
      candA_z: q1.partB.depths[String(d)].candA.z_ratio
    }])),
    mechanism_decomposition_gate_nothing: {
      deficit_factor: q1.partB.mechanism_law.deficit_factor, sd_collapse_factor: q1.partB.mechanism_law.sd_collapse_factor,
      raw_gap_collapse_factor: q1.partB.mechanism_law.raw_gap_collapse_factor,
      honest_limits: 'k=3 site (depth 1200) stays BELOW the gate (z_anchored ' + zA1200.toFixed(4) + ' < 3.0) — novelty-dominated deficit, no fix claimed; pure window-scaling candidates candD/candA are SITE-FRAGILE (candD: ' + q1.partB.depths['2000'].candD.z_ratio.toFixed(4) + ' at nominal-2000 but ' + q1.partB.depths['2200'].candD.z_ratio.toFixed(4) + ' at the finding site; candA: ' + q1.partB.depths['2200'].candA.z_ratio.toFixed(4) + ' at the finding site but ' + q1.partB.depths['2000'].candA.z_ratio.toFixed(4) + ' at nominal-2000) — neither survives both sites, neither is the law; REJECTED as registered'
    },
    checks, design6_identities: identities,
    all_checks_pass: Object.values(checks).every(Boolean) && Object.values(identities).every(Boolean),
    claim: 'DEPTH/WINDOW LAW: deficit = sd-aliasing x novelty-gap; registered fix restores the UNCHANGED 3.0 gate at BOTH depth-2000-class sites (2200 finding site and nominal 2000); carried statistic bit-identical at all sites',
    pass: Object.values(checks).every(Boolean) && Object.values(identities).every(Boolean),
    void_as_gated: !gPass
  });
}
// GWIN: G-window law (round-6 claim 3) — verdict rule VERBATIM from registration-v6
{
  const d6c = design6.partC_gwindow;
  const a = q1.partC.lr0_15_w200.g_ratio, b = q1.partC.lr0_5_w60.g_ratio, anc = q1.partC.anchor_lr0_3_w100.g_ratio;
  const checks = {
    g_015_w200_lt_0_5: a < 0.5,
    g_015_w200_band_0_295_0_315: a >= 0.295 && a <= 0.315,
    g_05_w60_lt_0_5: b < 0.5,
    g_05_w60_band_0_42_0_45: b >= 0.42 && b <= 0.45,
    g_anchor_run4_bit_exact: anc === run4.metrics.g_ratio,
    g_anchor_design6_bit_exact: anc === d6c.anchor_lr0_3_w100.g_ratio,
    g_015_design6_bit_exact: a === d6c.lr0_15_w200.g_ratio,
    g_05_design6_bit_exact: b === d6c.lr0_5_w60.g_ratio
  };
  chain.add('GWIN_g_window_law', {
    law: 'W(lr) = round(30/lr) steps (1/pace, anchored lr 0.3 -> 100); tau from the carried K4 law at each pace',
    values: {
      anchor_lr0_3_w100: anc, pace_lock_reference: 0.5692660186806099,
      lr0_15_w200: a, lr0_5_w60: b
    },
    pace_lock_closed: a < 0.5 && b < 0.5,
    checks, all_checks_pass: Object.values(checks).every(Boolean),
    claim: 'G-WINDOW LAW: the fixed 100-step window was pace-locked (round-5 finding g=0.5693>0.5 at lr 0.15); W(lr)=round(30/lr) restores the UNCHANGED 0.5 gate at both second pace points; carried anchor untouched and bit-exact vs run4',
    pass: Object.values(checks).every(Boolean),
    void_as_gated: !gPass
  });
}
// R4: twin determinism + cross-round/probe bit-identity
{
  const carriedPairs = Object.keys(run4.metrics).map((k) => [k, r1.metrics[k], run4.metrics[k]]);
  const carriedBad = carriedPairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run5: a, run4: b }));
  const probePairs = [
    ['ladder.0.z', r1.metrics.r3l_z_0, design5.partA_ladder['0'].v1_z_ratio],
    ['ladder.0.1.z', r1.metrics.r3l_z_0_1, design5.partA_ladder['0.1'].v1_z_ratio],
    ['ladder.0.2.z', r1.metrics.r3l_z_0_2, design5.partA_ladder['0.2'].v1_z_ratio],
    ['ladder.0.3.z', r1.metrics.r3l_z_0_3, design5.partA_ladder['0.3'].v1_z_ratio],
    ['ladder.0.45.z', r1.metrics.r3l_z_0_45, design5.partA_ladder['0.45'].v1_z_ratio],
    ['ladder.0.6.z', r1.metrics.r3l_z_0_6, design5.partA_ladder['0.6'].v1_z_ratio],
    ['ladder.0.75.z', r1.metrics.r3l_z_0_75, design5.partA_ladder['0.75'].v1_z_ratio],
    ['ladder.0.9.z', r1.metrics.r3l_z_0_9, design5.partA_ladder['0.9'].v1_z_ratio],
    ['ladder.1.2.z', r1.metrics.r3l_z_1_2, design5.partA_ladder['1.2'].v1_z_ratio],
    ['ladder.0.9.raw', r1.metrics.r3l_raw_0_9, design5.partA_ladder['0.9'].v0_raw_ratio],
    ['ladder.1.2.raw', r1.metrics.r3l_raw_1_2, design5.partA_ladder['1.2'].v0_raw_ratio],
    ['ladder.0.9.mad', r1.metrics.r3l_mad_0_9, design5.partA_ladder['0.9'].v3_mad_ratio],
    ['ladder.1.2.mad', r1.metrics.r3l_mad_1_2, design5.partA_ladder['1.2'].v3_mad_ratio],
    ['ladder.0.9.var', r1.r3l['0.9'].var, design5.partA_ladder['0.9'].var_ratio_trained_over_init_target],
    ['xpace.0.15.tau', r1.metrics.r2x_0_15_tau, design5.partB_xpace['0.15'].tau],
    ['xpace.0.15.drift', r1.metrics.r2x_0_15_drift, design5.partB_xpace['0.15'].r2_drift_ratio],
    ['xpace.0.15.g', r1.metrics.r2x_0_15_g, design5.partB_xpace['0.15'].g_ratio],
    ['xpace.0.15.r1', r1.metrics.r2x_0_15_r1, design5.partB_xpace['0.15'].r1_ratio],
    ['xpace.0.15.z', r1.metrics.r2x_0_15_z, design5.partB_xpace['0.15'].z_ratio_at_registered_amp],
    ['xpace.0.15.var', r1.metrics.r2x_0_15_var, design5.partB_xpace['0.15'].var_ratio],
    ['xpace.0.15.wcdisp', r1.metrics.r2x_0_15_wcdisp, design5.partB_xpace['0.15'].wc_disp_200_400_rel],
    ['xpace.0.15.wtmove', r1.metrics.r2x_0_15_wtmove, design5.partB_xpace['0.15'].wt_total_move_rel_400],
    ['xpace.0.5.tau', r1.metrics.r2x_0_5_tau, design5.partB_xpace['0.5'].tau],
    ['xpace.0.5.drift', r1.metrics.r2x_0_5_drift, design5.partB_xpace['0.5'].r2_drift_ratio],
    ['xpace.0.5.g', r1.metrics.r2x_0_5_g, design5.partB_xpace['0.5'].g_ratio],
    ['xpace.0.5.r1', r1.metrics.r2x_0_5_r1, design5.partB_xpace['0.5'].r1_ratio],
    ['xpace.0.5.z', r1.metrics.r2x_0_5_z, design5.partB_xpace['0.5'].z_ratio_at_registered_amp],
    ['xpace.0.5.var', r1.metrics.r2x_0_5_var, design5.partB_xpace['0.5'].var_ratio],
    ['xpace.0.5.wcdisp', r1.metrics.r2x_0_5_wcdisp, design5.partB_xpace['0.5'].wc_disp_200_400_rel],
    ['xpace.0.5.wtmove', r1.metrics.r2x_0_5_wtmove, design5.partB_xpace['0.5'].wt_total_move_rel_400],
    ['horizon.D', r1.metrics.rhor_D, design5.partC_horizon.D],
    ['horizon.executed_to', r1.metrics.rhor_executed_to, design5.partC_horizon.executed_to],
    ['horizon.D_mod80', r1.metrics.rhor_D_mod80, design5.partC_horizon.D_mod80],
    ['horizon.loss_finite_again', r1.metrics.rhor_loss_finite_again, design5.partC_horizon.loss_finite_again_count],
    ['horizon.all_nan_step', r1.metrics.rhor_all_nan_step, design5.partC_horizon.all_weights_nan_step],
    ['horizon.nan_absorbing', r1.metrics.rhor_nan_absorbing, design5.partC_horizon.weights_nan_absorbing],
    ['horizon.weights_all_nan_at_end', r1.metrics.rhor_weights_all_nan_at_end, design5.partC_horizon.weights_all_nan_at_end],
    ['horizon.slow_rate', r1.metrics.rhor_slow_rate, design5.partC_horizon.slow_inflation_rate],
    ['horizon.runaway_rate', r1.metrics.rhor_runaway_rate, design5.partC_horizon.blowup_rate_last200],
    ['horizon.rate_ratio', r1.metrics.rhor_rate_ratio, design5.partC_horizon.rate_ratio_runaway_over_slow],
    ['horizon.wc_norm_last', r1.metrics.rhor_wc_norm_last, design5.partC_horizon.wc_norm_at_last_finite],
    ['horizon.drift_last200', r1.metrics.rhor_drift_last200, design5.partC_horizon.drift_last200],
    ['horizon.first10', r1.metrics.rhor_first10, design5.partC_horizon.first10],
    ['horizon.ckpt400.wt', r1.metrics.rhor_ckpt_400_wt, design5.partC_horizon.checkpoints['400'].wt_move_rel],
    ['horizon.ckpt400.wcnorm', r1.metrics.rhor_ckpt_400_wcnorm, design5.partC_horizon.checkpoints['400'].wc_norm],
    ['horizon.ckpt400.loss500', r1.metrics.rhor_ckpt_400_loss500, design5.partC_horizon.checkpoints['400'].loss_mean_500],
    ['horizon.ckpt1000.loss500', r1.metrics.rhor_ckpt_1000_loss500, design5.partC_horizon.checkpoints['1000'].loss_mean_500],
    ['horizon.ckpt5000.wcnorm', r1.metrics.rhor_ckpt_5000_wcnorm, design5.partC_horizon.checkpoints['5000'].wc_norm],
    ['horizon.ckpt5000.loss500', r1.metrics.rhor_ckpt_5000_loss500, design5.partC_horizon.checkpoints['5000'].loss_mean_500],
    ['horizon.ckpt10000.wcnorm', r1.metrics.rhor_ckpt_10000_wcnorm, design5.partC_horizon.checkpoints['10000'].wc_norm],
    ['horizon.ckpt20000.wcnorm', r1.metrics.rhor_ckpt_20000_wcnorm, design5.partC_horizon.checkpoints['20000'].wc_norm],
    ['horizon.ckpt20000.loss500', r1.metrics.rhor_ckpt_20000_loss500, design5.partC_horizon.checkpoints['20000'].loss_mean_500],
    ['horizon.ckpt30000.wcnorm', r1.metrics.rhor_ckpt_30000_wcnorm, design5.partC_horizon.checkpoints['30000'].wc_norm],
    ['horizon.depth2000.drift', r1.metrics.rhor_depth2000_drift, design5.partC_horizon.drift_at_depth_2000],
    ['horizon.depth2000.var', r1.metrics.rhor_depth2000_var, design5.partC_horizon.var_ratio_after_depth_2000],
    ['horizon.depth2000.z', r1.metrics.rhor_depth2000_z, design5.partC_horizon.z_ratio_after_depth_2000],
    ['horizon.depth2000.wcdisp', r1.metrics.rhor_depth2000_wcdisp, design5.partC_horizon.wc_disp_at_depth_2000],
    ['contrast.tau999.D', r1.metrics.rhor_c_tau999_D, design5.partC_horizon.contrasts['tau0.999_lr0.3'].D],
    ['contrast.lr015.D', r1.metrics.rhor_c_lr015_D, design5.partC_horizon.contrasts['lr0.15_tau_law'].D],
    ['contrast.lr05.D', r1.metrics.rhor_c_lr05_D, design5.partC_horizon.contrasts['lr0.5_tau_law'].D],
    ['contrast.trivial.D', r1.metrics.rhor_c_trivial_D, design5.partC_horizon.contrasts['trivial_lr0.3'].D],
    ['contrast.lr015.slow', r1.metrics.rhor_c_lr015_slow, design5.partC_horizon.contrasts['lr0.15_tau_law'].slow_inflation_rate],
    ['contrast.trivial.slow', r1.metrics.rhor_c_trivial_slow, design5.partC_horizon.contrasts['trivial_lr0.3'].slow_inflation_rate]
  ];
  const probeBad = probePairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, design5: b }));
  // round-5 receipt of record: every run5.json metric must reproduce bit-exactly (92/92)
  const run5Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run5.json'), 'utf8'));
  const run5Pairs = Object.keys(run5Receipt.metrics).map((k) => [k, r1.metrics[k], run5Receipt.metrics[k]]);
  const run5Bad = run5Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, run5: b }));
  // round-6 receipt: every new metric must equal design6.json bit-exactly (probe == run == run-twin)
  const d6 = design6; const m6 = q1.metrics;
  const d6a = d6.partA_longevity, d6b = d6.partB_depth_window, d6c = d6.partC_gwindow;
  const probe6Pairs = [
    ['id.weights_sha', m6.id_weights_sha, d6a.identity_jepa4_wd0.weights_sha_jepa4_wd0],
    ['rlong.anchor.D', m6.rlong_D_wd0, d6a.arms['wd0_anchor'].D],
    ['rlong.anchor.exec', m6.rlong_exec_wd0, d6a.arms['wd0_anchor'].executed_to],
    ['rlong.anchor.slow', m6.rlong_slow_wd0, d6a.arms['wd0_anchor'].slow_inflation_rate],
    ['rlong.anchor.runaway', m6.rlong_runaway_wd0, d6a.arms['wd0_anchor'].blowup_rate_last200],
    ['rlong.anchor.drift200', m6.rlong_drift_last200_wd0, d6a.arms['wd0_anchor'].drift_last200],
    ['rlong.anchor.first10', m6.rlong_first10_wd0, d6a.arms['wd0_anchor'].first10],
    ['rlong.main.D', m6.rlong_D_main, d6a.arms['wd3e-4_main'].D],
    ['rlong.main.exec', m6.rlong_exec_main, d6a.arms['wd3e-4_main'].executed_to],
    ['rlong.main.slow', m6.rlong_slow_main, d6a.arms['wd3e-4_main'].slow_inflation_rate],
    ['rlong.main.slow100k', m6.rlong_slow_main_100k, d6a.arms['wd3e-4_main'].slow_inflation_rate_100k],
    ['rlong.main.first10', m6.rlong_first10_main, d6a.arms['wd3e-4_main'].first10],
    ['rlong.main.wc400', m6.rlong_main_wc_400, d6a.arms['wd3e-4_main'].checkpoints['400'].wc_norm],
    ['rlong.main.wc20000', m6.rlong_main_wc_20000, d6a.arms['wd3e-4_main'].checkpoints['20000'].wc_norm],
    ['rlong.main.wc100000', m6.rlong_main_wc_100000, d6a.arms['wd3e-4_main'].checkpoints['100000'].wc_norm],
    ['rlong.main.wc500000', m6.rlong_main_wc_500000, d6a.arms['wd3e-4_main'].checkpoints['500000'].wc_norm],
    ['rlong.main.wp400', m6.rlong_main_wp_400, d6a.arms['wd3e-4_main'].checkpoints['400'].wp_norm],
    ['rlong.main.wp20000', m6.rlong_main_wp_20000, d6a.arms['wd3e-4_main'].checkpoints['20000'].wp_norm],
    ['rlong.wd1e4.D', m6.rlong_D_wd1e4, d6a.arms['wd1e-4'].D],
    ['rlong.wd1e4.exec', m6.rlong_exec_wd1e4, d6a.arms['wd1e-4'].executed_to],
    ['rlong.wd1e4.slow', m6.rlong_slow_wd1e4, d6a.arms['wd1e-4'].slow_inflation_rate],
    ['rlong.wd1e4.runaway', m6.rlong_runaway_wd1e4, d6a.arms['wd1e-4'].blowup_rate_last200],
    ['rlong.wd1e4.rr', m6.rlong_rr_wd1e4, d6a.arms['wd1e-4'].rate_ratio_runaway_over_slow],
    ['rlong.wd1e3.D', m6.rlong_D_wd1e3, d6a.arms['wd0.001'].D],
    ['rlong.wd1e3.exec', m6.rlong_exec_wd1e3, d6a.arms['wd0.001'].executed_to],
    ['rlong.wd1e3.slow', m6.rlong_slow_wd1e3, d6a.arms['wd0.001'].slow_inflation_rate],
    ['rlong.g_wd', m6.rlong_g_wd, d6a.guards_wd3e4.g_gate_trivial_100.g_ratio],
    ['rlong.r1_wd', m6.rlong_r1_wd, d6a.guards_wd3e4.r1_world2_400.r1_ratio],
    ['rlong.drift_wd', m6.rlong_drift_wd, d6a.guards_wd3e4.r2_drift_200_400.r2_drift_ratio],
    ['rlong.g_wd1e4', m6.rlong_g_wd1e4, d6a.guards_wd1e4.g_gate_trivial_100.g_ratio],
    ['rlong.r1_wd1e4', m6.rlong_r1_wd1e4, d6a.guards_wd1e4.r1_world2_400.r1_ratio],
    ['rlong.drift_wd1e4', m6.rlong_drift_wd1e4, d6a.guards_wd1e4.r2_drift_200_400.r2_drift_ratio],
    ['rlong.g_wd0', m6.rlong_g_wd0, d6a.guards_wd0.g_gate_trivial_100.g_ratio],
    ['rlong.r1_wd0', m6.rlong_r1_wd0, d6a.guards_wd0.r1_world2_400.r1_ratio],
    ['rlong.drift_wd0', m6.rlong_drift_wd0, d6a.guards_wd0.r2_drift_200_400.r2_drift_ratio]
  ];
  for (const dep of DEPTHS6.map(String)) {
    probe6Pairs.push(
      ['r3d.z_carried.' + dep, m6['r3d_z_carried_' + dep], d6b.depths[dep].carried.z_ratio],
      ['r3d.sd_sum.' + dep, m6['r3d_sd_sum_' + dep], d6b.depths[dep].carried.sd_sum],
      ['r3d.raw_gap.' + dep, m6['r3d_raw_gap_' + dep], d6b.depths[dep].carried.raw_gap],
      ['r3d.var_carried.' + dep, m6['r3d_var_carried_' + dep], d6b.depths[dep].carried.var_ratio],
      ['r3d.candD.z.' + dep, m6['r3d_candD_z_' + dep], d6b.depths[dep].candD.z_ratio],
      ['r3d.candD.n.' + dep, m6['r3d_candD_n_' + dep], d6b.depths[dep].candD.baseline_n],
      ['r3d.candD.var.' + dep, m6['r3d_candD_var_' + dep], d6b.depths[dep].candD.var_ratio],
      ['r3d.candA.z.' + dep, m6['r3d_candA_z_' + dep], d6b.depths[dep].candA.z_ratio],
      ['r3d.candA.var.' + dep, m6['r3d_candA_var_' + dep], d6b.depths[dep].candA.var_ratio],
      ['r3d.multiplier.' + dep, m6['r3d_multiplier_' + dep], d6b.candS[dep].multiplier],
      ['r3d.z_anchored.' + dep, m6['r3d_z_anchored_' + dep], d6b.candS[dep].z_ratio_corrected],
      ['r3d.deficit.' + dep, m6['r3d_deficit_' + dep], d6b.mechanism_law.deficit_factor[dep]],
      ['r3d.sdcollapse.' + dep, m6['r3d_sdcollapse_' + dep], d6b.mechanism_law.sd_collapse_factor[dep]],
      ['r3d.gapcollapse.' + dep, m6['r3d_gapcollapse_' + dep], d6b.mechanism_law.raw_gap_collapse_factor[dep]]
    );
  }
  probe6Pairs.push(
    ['r3d.candD_round_z_2200', m6.r3d_candD_round_z_2200, d6b.depths['2200'].candD_round_rule ? d6b.depths['2200'].candD_round_rule.z_ratio : null],
    ['gwin.g_anchor', m6.gwin_g_anchor, d6c.anchor_lr0_3_w100.g_ratio],
    ['gwin.g_anchor_first10', m6.gwin_g_anchor_first10, d6c.anchor_lr0_3_w100.g_first10],
    ['gwin.g_anchor_last10', m6.gwin_g_anchor_last10, d6c.anchor_lr0_3_w100.g_last10],
    ['gwin.g_015', m6.gwin_g_015, d6c.lr0_15_w200.g_ratio],
    ['gwin.g_015_first10', m6.gwin_g_015_first10, d6c.lr0_15_w200.g_first10],
    ['gwin.g_015_last10', m6.gwin_g_015_last10, d6c.lr0_15_w200.g_last10],
    ['gwin.g_05', m6.gwin_g_05, d6c.lr0_5_w60.g_ratio],
    ['gwin.g_05_first10', m6.gwin_g_05_first10, d6c.lr0_5_w60.g_first10],
    ['gwin.g_05_last10', m6.gwin_g_05_last10, d6c.lr0_5_w60.g_last10]
  );
  const probe6Bad = probe6Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, design6: b }));
  const shaAll1 = sha(JSON.stringify({ carried: r1.metrics, round6: q1.metrics }));
  const shaAll2 = sha(JSON.stringify({ carried: r2.metrics, round6: q2.metrics }));
  chain.add('R4_determinism', {
    claim: 'two FULL executions byte-identical (carried + round-6 metrics) AND every round-4 metric bit-equal to run4.json (29/29) AND every round-5 metric bit-equal to run5.json (92/92) AND every round-6 metric bit-equal to design6.json — probe == run == run-twin == round-4-run == round-5-run',
    pass: r1.metricsSha === r2.metricsSha && q1.metricsSha === q2.metricsSha && shaAll1 === shaAll2
      && carriedBad.length === 0 && probeBad.length === 0 && run5Bad.length === 0 && probe6Bad.length === 0,
    sha_carried_run1: r1.metricsSha, sha_carried_run2: r2.metricsSha,
    sha_round6_run1: q1.metricsSha, sha_round6_run2: q2.metricsSha,
    sha_all_run1: shaAll1, sha_all_run2: shaAll2,
    carried_cross_check: { shared: carriedPairs.length, mismatches: carriedBad },
    run5_cross_check: { shared: run5Pairs.length, mismatches: run5Bad },
    probe_cross_check: { shared: probePairs.length, mismatches: probeBad },
    probe6_cross_check: { shared: probe6Pairs.length, mismatches: probe6Bad }
  });
}
chain.add('R5_mesh_conservation', {
  total_drift_rel: r1.r5_total_drift_rel, variance_non_increasing: r1.r5_variance_non_increasing, first_violating: r1.r5_first_violating,
  claim: 'total conserved within 1e-6 rel AND variance non-increasing over 100 steps (carried)',
  pass: r1.r5_total_drift_rel <= 1e-6 && r1.r5_variance_non_increasing
});
chain.add('R6v4_impact_sensitive_no_repair', {
  corr_mean: r1.r6_corr_mean, corr_min: r1.r6_corr_min,
  jump: r1.r6_jump, loss_pre: r1.r6_loss_pre, loss_corrupted: r1.r6_loss_corrupted,
  sha_invariant: r1.r6_sha_invariant, recheck_delta: r1.r6_recheck_delta,
  flipped: r1.r6_flipped, top26: r1.r6_top26,
  claim: 'L3 precondition corr > 0.3 AND jump > 1.5 AND corrected frozen-state invariant AND |recheck - corrupted| <= 1e-9 (carried)',
  pass: r1.r6_corr_mean > 0.3 && r1.r6_jump > 1.5 && r1.r6_sha_invariant && r1.r6_recheck_delta <= 1e-9,
  void_as_gated: !gPass
});

const verdicts = {};
for (const row of chain.rows) if (/^(G|L2|R)/.test(row.type)) verdicts[row.type] = row.payload.pass;
const nPass = Object.values(verdicts).filter(Boolean).length;

const outDoc = {
  schema: 'quilt-jepa/run-receipt-v6',
  seed_u32: seedU32,
  lr_registered: LR3,
  tau_registered: TAU4,
  K4_registered: K4,
  amp_registered: AMP0,
  round6_constants: { wd_main: WD_MAIN, rlong_ckpts: RLONG_CKPTS, depths: DEPTHS6, horizon_T: T_HORIZON, contrast_cap: CONTRAST_CAP },
  operating_point_note: 'UNCHANGED from round 4/5 — round 6 adds RLONG/R3D/GWIN at the same operating point; carried claims must reproduce run4.json (29/29) AND run5.json (92/92) bit-exactly; new claims must reproduce design6.json bit-exactly',
  seal_verified_at_startup: { masked_sha: storedMasked, mtime: storedMtime },
  claims_passed: nPass,
  claims_total: Object.keys(verdicts).length,
  verdicts,
  metrics: r1.metrics,
  metrics_round6: q1.metrics,
  chain: chain.rows,
  tip: chain.tip()
};
fs.writeFileSync(path.join(RECEIPTS, 'run6.json'), JSON.stringify(outDoc, null, 1));
console.log('claims:', nPass + '/' + Object.keys(verdicts).length, JSON.stringify(verdicts));
console.log('tip:', chain.tip());
const r4row = chain.rows.find((r) => r.type === 'R4_determinism').payload;
console.log('carried cross-check vs run4.json:', r4row.carried_cross_check.shared + '/' + r4row.carried_cross_check.shared, 'mismatches:', r4row.carried_cross_check.mismatches.length);
console.log('run5 receipt cross-check (92/92):', r4row.run5_cross_check.shared + '/' + r4row.run5_cross_check.shared, 'mismatches:', r4row.run5_cross_check.mismatches.length);
console.log('probe cross-check vs design5.json:', r4row.probe_cross_check.shared + '/' + r4row.probe_cross_check.shared, 'mismatches:', r4row.probe_cross_check.mismatches.length);
console.log('probe6 cross-check vs design6.json:', r4row.probe6_cross_check.shared + '/' + r4row.probe6_cross_check.shared, 'mismatches:', r4row.probe6_cross_check.mismatches.length);
console.log('detail: G=' + r1.g_ratio.toFixed(4) + ' r2v4drift=' + r1.r2_drift_ratio.toExponential(2)
  + ' zconc=' + r1.r3v4.v1_z_ratio.toFixed(3)
  + ' R3L: z(0)=' + r1.r3l['0'].z.toFixed(4) + ' z(0.75)=' + r1.r3l['0.75'].z.toFixed(3) + ' sat=' + r1.r3l_sat_bit_exact
  + ' R2x: drift(0.15)=' + r1.r2x['0.15'].r2_drift_ratio.toExponential(2) + ' g(0.15)=' + r1.r2x['0.15'].g_ratio.toFixed(4) + ' drift(0.5)=' + r1.r2x['0.5'].r2_drift_ratio.toExponential(2)
  + ' RHOR: D=' + r1.rhor.D + ' slow=' + r1.rhor.slow_inflation_rate.toExponential(3) + ' ratio=' + r1.rhor.rate_ratio_runaway_over_slow.toFixed(1)
  + ' depth2000: drift=' + r1.rhor.drift_at_depth_2000.toExponential(2) + ' z=' + r1.rhor.z_ratio_after_depth_2000.toFixed(3));
const mA = q1.arms;
console.log('RLONG: wd0 D=' + mA['wd0_anchor'].D
  + ' | main wd3e-4: D=' + mA['wd3e-4_main'].D + ' exec=' + mA['wd3e-4_main'].executed_to + ' diverged=' + mA['wd3e-4_main'].diverged
  + ' censor_floor=' + (500000 / 30174).toFixed(4) + 'x'
  + ' | wd1e-4: D=' + mA['wd1e-4'].D + ' (1.5938x) runaway=' + mA['wd1e-4'].blowup_rate_last200.toExponential(3) + ' ratio=' + mA['wd1e-4'].rate_ratio_runaway_over_slow.toFixed(1)
  + ' | wd1e-3: D=' + mA['wd0.001'].D + ' exec=' + mA['wd0.001'].executed_to
  + ' | guards wd3e-4: g=' + mA.guards_wd3e4.g_gate_trivial_100.g_ratio.toFixed(4) + ' r1=' + mA.guards_wd3e4.r1_world2_400.r1_ratio.toFixed(4) + ' drift=' + mA.guards_wd3e4.r2_drift_200_400.r2_drift_ratio.toExponential(2));
for (const dep of DEPTHS6.map(String)) {
  const x = q1.partB.depths[dep];
  console.log('R3D depth ' + dep + ': carried z=' + x.carried.z_ratio.toFixed(4) + ' sd_sum=' + x.carried.sd_sum.toFixed(5) + ' raw_gap=' + x.carried.raw_gap.toFixed(5)
    + ' -> anchored z=' + q1.partB.candS[dep].z_ratio_corrected.toFixed(4) + ' (mult ' + q1.partB.candS[dep].multiplier.toFixed(6) + ')'
    + ' | candD ' + x.candD.z_ratio.toFixed(4) + ' candA ' + x.candA.z_ratio.toFixed(4));
}
console.log('GWIN: anchor(0.3,100)=' + q1.partC.anchor_lr0_3_w100.g_ratio.toFixed(4)
  + ' | (0.15,W=200)=' + q1.partC.lr0_15_w200.g_ratio.toFixed(4) + ' | (0.5,W=60)=' + q1.partC.lr0_5_w60.g_ratio.toFixed(4)
  + ' | pace-lock reference 0.5693 @ (0.15,W=100)');
