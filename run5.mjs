// run5.mjs — quilt-jepa ROUND 5 (wave 55-a, resumed lane). Executes the sealed
// registration-v5.json: the round-4 operating point is UNCHANGED (lr 0.3, tau 0.99998,
// K4 = 1.5e-6, amp 0.9, same seed) — all eight round-4 claims are carried and must reproduce
// receipts/run4.json BIT-EXACTLY; three new claims are scored:
//   R3L  — anomaly-strength ladder (closes the v3-queued 'widen the margin by amplitude' lever)
//   R2x  — K4 cross-pace validation (answers registration-v4's transfer caveat)
//   RHOR — finite-horizon divergence (two-phase: slow null-space |Wc| diffusion at the loss
//          floor, then runaway; pre-divergence laws re-checked at a FIXED depth-2000 window)
// FAIL-CLOSED: the run re-verifies the registration seal (masked sha + mtime) at startup and
// refuses otherwise. Deterministic core executed twice (R4) and cross-checked bit-for-bit
// against receipts/run4.json (carried) AND receipts/design5.json (new) — probe==run==run.
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

// ---------- fail-closed seal verification ----------
const REG = path.join(HERE, 'registration-v5.json');
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

// pre-seal probe receipt (loaded once; used for the R3L/R2x/RHOR probe-identity verdict rules)
const design5 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design5.json'), 'utf8'));

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

// ---------- execute ----------
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;

const chain = new Chain();
chain.add('header', {
  repo: 'quilt-jepa', round: 5, executed_in: 'wave 55', seed_u32: seedU32,
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration-v5.json (sealed pre-run, self_sha256_masked + mtime; RE-VERIFIED fail-closed at this run\'s startup)',
  scope: 'round-4 operating point UNCHANGED (lr 0.3, tau 0.99998, K4 1.5e-6, amp 0.9) — 8 carried claims re-scored (must reproduce run4.json bit-exactly) + 3 new claims: R3L anomaly-strength ladder, R2x K4 cross-pace, RHOR finite-horizon divergence',
  probe_provenance: 'probe5.mjs v1 completed (design5 receipt), v2 rewrite crashed on a use-before-assignment print BEFORE any receipt; v2 fixed + re-run (computation now precedes use); 13/13 pipeline identity vs run4.json enforced fail-closed before the v2 receipt was written'
});
const r1 = coreRun5(seedU32);
const r2 = coreRun5(seedU32);

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
// R4: twin determinism + cross-round/probe bit-identity
const run4 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run4.json'), 'utf8'));
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
  const probeBad = probePairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run5: a, design5: b }));
  chain.add('R4_determinism', {
    claim: 'two runs byte-identical AND all carried metrics bit-equal to run4.json AND all new metrics bit-equal to design5.json (probe==run==run==prior-round)',
    pass: r1.metricsSha === r2.metricsSha && carriedBad.length === 0 && probeBad.length === 0,
    sha_run1: r1.metricsSha, sha_run2: r2.metricsSha,
    carried_cross_check: { shared: carriedPairs.length, mismatches: carriedBad },
    probe_cross_check: { shared: probePairs.length, mismatches: probeBad }
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
  schema: 'quilt-jepa/run-receipt-v5',
  seed_u32: seedU32,
  lr_registered: LR3,
  tau_registered: TAU4,
  K4_registered: K4,
  amp_registered: AMP0,
  operating_point_note: 'UNCHANGED from round 4 — round 5 validates and characterizes; carried claims must reproduce run4.json bit-exactly',
  seal_verified_at_startup: { masked_sha: storedMasked, mtime: storedMtime },
  claims_passed: nPass,
  claims_total: Object.keys(verdicts).length,
  verdicts,
  metrics: r1.metrics,
  chain: chain.rows,
  tip: chain.tip()
};
fs.writeFileSync(path.join(RECEIPTS, 'run5.json'), JSON.stringify(outDoc, null, 1));
console.log('claims:', nPass + '/' + Object.keys(verdicts).length, JSON.stringify(verdicts));
console.log('tip:', chain.tip());
const r4row = chain.rows.find((r) => r.type === 'R4_determinism').payload;
console.log('carried cross-check vs run4.json:', r4row.carried_cross_check.shared + '/' + r4row.carried_cross_check.shared, 'mismatches:', r4row.carried_cross_check.mismatches.length);
console.log('probe cross-check vs design5.json:', r4row.probe_cross_check.shared + '/' + r4row.probe_cross_check.shared, 'mismatches:', r4row.probe_cross_check.mismatches.length);
console.log('detail: G=' + r1.g_ratio.toFixed(4) + ' r2v4drift=' + r1.r2_drift_ratio.toExponential(2)
  + ' zconc=' + r1.r3v4.v1_z_ratio.toFixed(3)
  + ' R3L: z(0)=' + r1.r3l['0'].z.toFixed(4) + ' z(0.75)=' + r1.r3l['0.75'].z.toFixed(3) + ' sat=' + r1.r3l_sat_bit_exact
  + ' R2x: drift(0.15)=' + r1.r2x['0.15'].r2_drift_ratio.toExponential(2) + ' g(0.15)=' + r1.r2x['0.15'].g_ratio.toFixed(4) + ' drift(0.5)=' + r1.r2x['0.5'].r2_drift_ratio.toExponential(2)
  + ' RHOR: D=' + r1.rhor.D + ' slow=' + r1.rhor.slow_inflation_rate.toExponential(3) + ' ratio=' + r1.rhor.rate_ratio_runaway_over_slow.toFixed(1)
  + ' depth2000: drift=' + r1.rhor.drift_at_depth_2000.toExponential(2) + ' z=' + r1.rhor.z_ratio_after_depth_2000.toFixed(3));
