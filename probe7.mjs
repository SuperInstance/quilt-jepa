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

const norm64 = (W) => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i] * W[i]; return Math.sqrt(s); };
const relDisp = (W, W0) => { let d = 0, n = 0; for (let i = 0; i < W.length; i++) { const dd = W[i] - W0[i]; d += dd * dd; n += W[i] * W[i]; } return Math.sqrt(d) / Math.sqrt(n); };

// ================= ROUND 7 additions (probe7) — pipeline validation ONLY, gates nothing =====
// collectDepthAmp: collectDepth with the injection amplitude parameterized. The ONLY delta vs
// the copied collectDepth body is AMP0 -> amp. Identity (iii) proves bit-equality at amp = 0.9.
function collectDepthAmp(seedU32, depth, wLen, atOffsets, preTicks, amp) {
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
        obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + amp);
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
// horizonRun5: horizonRun4 + WEIGHT-SNAPSHOT capture at the captureAt steps (only while the
// loss is still finite, D < 0 — snapshots of a diverged state are never taken). The snapshot is
// taken at the exact same loop position as the registered checkpoint metrics (right after
// trainStep), so a continuation reconstructed from it is bit-determined by (snapshot, world
// stream, operating point). captureAt = [] must reproduce horizonRun4 bit-exactly (identity I2).
function horizonRun5(WorldCls, seedU32, lr, tau, wd, T, stopRule, ckpts, captureAt) {
  const world = new WorldCls(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const wt0 = Float32Array.from(jepa.Wt);
  const wc0 = Float32Array.from(jepa.Wc);
  const losses = [];
  const checkpoints = {};
  for (const k of ckpts) checkpoints[String(k)] = null;
  const captureSet = new Set(captureAt);
  const snapshots = {};
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
        if (captureSet.has(t)) {
          snapshots[String(t)] = { Wc: Float32Array.from(jepa.Wc), Wp: Float32Array.from(jepa.Wp), Wt: Float32Array.from(jepa.Wt) };
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
    loss_tail_400: losses.length >= 400 ? losses.slice(-400) : null,
    checkpoints,
    captured_at: Object.keys(snapshots).map(Number),
    snapshots,
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
// trivialSwitchProbe: the PLASTICITY readout machinery — a 400-step continuation on the TRIVIAL
// world from a WARM weight state (the checkpoint snapshot). The model trained on world2 to depth
// t is switched to the trivial world; last10/first10 of the continuation window measures whether
// learning still ENGAGES from that state (the carried R1/G gates do exactly this from init).
// NOTE: the trivial world stream starts at its own t=0 (fresh World) — deterministic, no
// stepping-to-depth needed; the same-world stream reconstruction is validated separately (I1b).
function trivialSwitchProbe(seedU32, lr, tau, wd, snap, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  jepa.Wc.set(snap.Wc); jepa.Wp.set(snap.Wp); jepa.Wt.set(snap.Wt);
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  return { ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), first10: mean(losses.slice(0, 10)), last10: mean(losses.slice(-10)) };
}

// ---------- identity execution ----------
const T0P = Date.now();
// design5/design6 are already loaded by the carried head block (verbatim from run6.mjs)
const run4Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run4.json'), 'utf8'));
const run6Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run6.json'), 'utf8'));
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;
const id = {};
id.seed_u32 = seedU32;

// I7 — carried fail-closed identity: Jepa4(seed, wd=0) == Jepa3(seed) bit-exact (400 steps)
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
  id.I7_jepa4_wd0_identity = { steps: 400, losses_bit_exact: lossesExact, weights_bit_exact: buf(a) === buf(b), weights_sha: buf(a) };
}
console.error('[probe7] I7 done at', Date.now() - T0P, 'ms');

// I2 — the wd0 anchor arm via horizonRun5 (captureAt=[]) reproduces design6 bit-exactly
{
  const a0 = horizonRun5(World2, seedU32, LR3, TAU4, 0, T_HORIZON, 'contrast', RLONG_CKPTS, []);
  a0.slow_inflation_rate = Math.log(a0.checkpoints['20000'].wc_norm / a0.checkpoints['400'].wc_norm) / 19600;
  const d6a0 = design6.partA_longevity.arms['wd0_anchor'];
  id.I2_wd0_anchor_via_horizonRun5 = {
    D: a0.D, D_bit_exact_vs_design6: a0.D === d6a0.D,
    executed_to: a0.executed_to, exec_bit_exact: a0.executed_to === d6a0.executed_to,
    slow: a0.slow_inflation_rate, slow_bit_exact: a0.slow_inflation_rate === d6a0.slow_inflation_rate,
    wc400: a0.checkpoints['400'].wc_norm, wc400_bit_exact: a0.checkpoints['400'].wc_norm === d6a0.checkpoints['400'].wc_norm,
    wc20000: a0.checkpoints['20000'].wc_norm, wc20000_bit_exact: a0.checkpoints['20000'].wc_norm === d6a0.checkpoints['20000'].wc_norm,
    drift_last200: a0.drift_last200, drift_bit_exact: a0.drift_last200 === d6a0.drift_last200
  };
}
console.error('[probe7] I2 done at', Date.now() - T0P, 'ms');

// I1 — reconstruction identity (the PLAST dependency), three legs:
//  (a) CAPTURE determinism: two independent executions of the same 20000-step main-arm slice
//      capture BIT-IDENTICAL weight snapshots (weights sha equal);
//  (b) SAME-WORLD reconstruction: a fresh World2 stepped 20000 times + the snapshot weights,
//      continued 400 steps, must equal the LIVE arm's own losses over steps 20001..20400
//      (arm executed to 20400, loss_tail_400) — proves snapshot == live state AND that the
//      world stream is a pure function of (seed, step count);
//  (c) TRIVIAL-WORLD reconstruction determinism: two independent reconstructions from the two
//      snapshots produce bit-identical trivial-world continuations (the registered PLAST readout
//      path — a fresh trivial world from its own t=0, warm-started weights).
{
  const arm1 = horizonRun5(World2, seedU32, LR3, TAU4, WD_MAIN, 20000, 'contrast', [20000], [20000]);
  const arm2 = horizonRun5(World2, seedU32, LR3, TAU4, WD_MAIN, 20400, 'contrast', [], [20000]);
  const snap1 = arm1.snapshots['20000'], snap2 = arm2.snapshots['20000'];
  const shaSnap = (s) => sha(Buffer.concat([Buffer.from(s.Wc.buffer, s.Wc.byteOffset, s.Wc.byteLength),
                                             Buffer.from(s.Wp.buffer, s.Wp.byteOffset, s.Wp.byteLength),
                                             Buffer.from(s.Wt.buffer, s.Wt.byteOffset, s.Wt.byteLength)]));
  // (b) same-world reconstruction vs the live arm's own tail
  const jepaB = new Jepa4(seedU32, WD_MAIN);
  jepaB.lr = LR3; jepaB.tau = TAU4;
  jepaB.Wc.set(snap1.Wc); jepaB.Wp.set(snap1.Wp); jepaB.Wt.set(snap1.Wt);
  const worldB = new World2(seedU32); let obsB = worldB.observe();
  for (let t = 0; t < 20000; t++) { worldB.step(); obsB = worldB.observe(); }
  const lossesB = [];
  for (let t = 0; t < 400; t++) { worldB.step(); const o1 = worldB.observe(); lossesB.push(jepaB.trainStep(obsB, o1)); obsB = o1; }
  let exactB = true;
  for (let i = 0; i < 400; i++) if (lossesB[i] !== arm2.loss_tail_400[i]) { exactB = false; break; }
  // (c) trivial-world reconstruction determinism from both snapshots
  const runTrivial = (snap) => {
    const jepa = new Jepa4(seedU32, WD_MAIN);
    jepa.lr = LR3; jepa.tau = TAU4;
    jepa.Wc.set(snap.Wc); jepa.Wp.set(snap.Wp); jepa.Wt.set(snap.Wt);
    const worldT = new World(seedU32);
    const losses = [];
    let obs = worldT.observe();
    for (let t = 0; t < 400; t++) { worldT.step(); const o1 = worldT.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
    return losses;
  };
  const lossesT1 = runTrivial(snap1), lossesT2 = runTrivial(snap2);
  let exactC = true;
  for (let i = 0; i < 400; i++) if (lossesT1[i] !== lossesT2[i]) { exactC = false; break; }
  id.I1_continuation_reconstruction = {
    snapshot_step: 20000, wd: WD_MAIN,
    capture_bit_exact_cross_execution: shaSnap(snap1) === shaSnap(snap2),
    snapshot_weights_sha: shaSnap(snap1),
    world2_reconstruction_vs_live_arm_400_bit_exact: exactB,
    trivial_reconstruction_deterministic_400_bit_exact: exactC,
    trivial_continuation_ratio: mean(lossesT1.slice(-10)) / mean(lossesT1.slice(0, 10)),
    snapshot_wc_norm: norm64(snap1.Wc)
  };
}
console.error('[probe7] I1 done at', Date.now() - T0P, 'ms');

// I3 — collectDepthAmp(amp = 0.9) == collectDepth BIT-IDENTICAL (S, AT, and the z study)
{
  const hard = collectDepth(seedU32, 400, 130, [29, 64, 99], 0);
  const flexA = collectDepthAmp(seedU32, 400, 130, [29, 64, 99], 0, AMP0);
  let sExact = hard.S.length === flexA.S.length;
  if (sExact) for (let t = 0; t < hard.S.length && sExact; t++)
    for (let c = 0; c < CELLS; c++) if (hard.S[t][c] !== flexA.S[t][c]) { sExact = false; break; }
  const stH = normalizerStudyFlex(hard.S, hard.AT, 401, 130, []);
  const stF = normalizerStudyFlex(flexA.S, flexA.AT, 401, 130, []);
  id.I3_collectDepthAmp_identity = {
    S_bit_exact: sExact, AT_equal: JSON.stringify(hard.AT) === JSON.stringify(flexA.AT),
    z_ratio_bit_exact: stH.v1_z_ratio === stF.v1_z_ratio,
    z_ratio: stH.v1_z_ratio
  };
}
console.error('[probe7] I3 done at', Date.now() - T0P, 'ms');

// I4 — the round-5 finding site identity: carried z at train-depth 2200 (wStart 2201, amp 0.9)
// == design5's receipted value BIT-EXACT
{
  const w = evalWindowDump(seedU32, LR3, TAU4, 2200, 2201, [2201 + 29, 2201 + 64, 2201 + 99], AMP0);
  id.I4_finding_site_2200 = {
    z: w.study.v1_z_ratio,
    z_bit_exact_vs_design5: w.study.v1_z_ratio === design5.partC_horizon.z_ratio_after_depth_2000
  };
}
console.error('[probe7] I4 done at', Date.now() - T0P, 'ms');

// I5 — GWIN grid anchor identity: gGateFlex(lr 0.3, 100) == run4.metrics.g_ratio BIT-EXACT
{
  const g = gGateFlex(seedU32, LR3, TAU4, 0, 100);
  id.I5_gwin_anchor = { g: g.g_ratio, g_bit_exact_vs_run4: g.g_ratio === run4Receipt.metrics.g_ratio };
}
// I6 — the shallow plateau anchor identity: evalWindowDump@401 amp 1.2 z == the receipted R3L
// ladder value (run6.metrics.r3l_z_1_2 == design5.partA_ladder['1.2'].v1_z_ratio)
{
  const w = evalWindowDump(seedU32, LR3, TAU4, 400, 401, ANOMALY_TICKS, 1.2);
  id.I6_shallow_plateau_amp12 = {
    z: w.study.v1_z_ratio,
    z_bit_exact_vs_run5_ladder: w.study.v1_z_ratio === run6Receipt.metrics.r3l_z_1_2,
    run5_ladder_reference: run6Receipt.metrics.r3l_z_1_2
  };
}
console.error('[probe7] I5/I6 done at', Date.now() - T0P, 'ms');

const idResults = {
  schema: 'quilt-jepa/design-probe-v7',
  note: 'PRE-SEAL pipeline validation for round 7 — GATES NOTHING. All identities are pipeline checks against already-receipted values; no round-7 claim value (dose-arm rates, PLAST ratios, plateau depth studies, GWIN grid) is measured here. The new dose arms (1.5e-4, 2e-4, 2.5e-4), the PLAST probes, the depth plateau studies at amp 1.2, and the GWIN grid points are measured for the FIRST time inside run7.',
  seed_u32: seedU32,
  identities: id,
  all_identities_pass: id.I7_jepa4_wd0_identity.losses_bit_exact && id.I7_jepa4_wd0_identity.weights_bit_exact
    && id.I2_wd0_anchor_via_horizonRun5.D_bit_exact_vs_design6 && id.I2_wd0_anchor_via_horizonRun5.slow_bit_exact
    && id.I2_wd0_anchor_via_horizonRun5.wc400_bit_exact && id.I2_wd0_anchor_via_horizonRun5.wc20000_bit_exact
    && id.I2_wd0_anchor_via_horizonRun5.drift_bit_exact
    && id.I1_continuation_reconstruction.capture_bit_exact_cross_execution
    && id.I1_continuation_reconstruction.world2_reconstruction_vs_live_arm_400_bit_exact
    && id.I1_continuation_reconstruction.trivial_reconstruction_deterministic_400_bit_exact
    && id.I3_collectDepthAmp_identity.S_bit_exact && id.I3_collectDepthAmp_identity.z_ratio_bit_exact
    && id.I4_finding_site_2200.z_bit_exact_vs_design5
    && id.I5_gwin_anchor.g_bit_exact_vs_run4
    && id.I6_shallow_plateau_amp12.z_bit_exact_vs_run5_ladder,
  wall_ms: Date.now() - T0P
};
fs.writeFileSync(path.join(RECEIPTS, 'design7.json'), JSON.stringify(idResults, null, 1));
console.log('probe7 identities:', JSON.stringify(Object.fromEntries(Object.entries(id).filter(([k]) => k !== 'seed_u32').map(([k, v]) => {
  const pass = k === 'I7_jepa4_wd0_identity' ? (v.losses_bit_exact && v.weights_bit_exact)
    : k === 'I2_wd0_anchor_via_horizonRun5' ? (v.D_bit_exact_vs_design6 && v.slow_bit_exact && v.wc400_bit_exact && v.wc20000_bit_exact && v.drift_bit_exact)
    : k === 'I1_continuation_reconstruction' ? (v.capture_bit_exact_cross_execution && v.world2_reconstruction_vs_live_arm_400_bit_exact && v.trivial_reconstruction_deterministic_400_bit_exact)
    : k === 'I3_collectDepthAmp_identity' ? (v.S_bit_exact && v.z_ratio_bit_exact)
    : k === 'I4_finding_site_2200' ? v.z_bit_exact_vs_design5
    : k === 'I5_gwin_anchor' ? v.g_bit_exact_vs_run4
    : k === 'I6_shallow_plateau_amp12' ? v.z_bit_exact_vs_run5_ladder : null;
  return [k, pass];
})), null, 1));
console.log('ALL IDENTITIES PASS:', idResults.all_identities_pass);
