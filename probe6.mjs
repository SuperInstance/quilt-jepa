// probe6.mjs — quilt-jepa ROUND 6 design probe (gates nothing; receipted pre-seal as
// receipts/design6.json). Measures the landscape for the three round-6 agenda items priced by
// round-5 (verdict-v5 "What stands"):
//   partA LONGEVITY  — weight decay on Wc (registered value 1e-4, the house WGSL recipe order)
//                      against the two-phase divergence: D(wd) ladder 0 / 1e-4 / 3e-4 / 1e-3,
//                      phase rates, learning guards in the decayed arm.
//   partB DEPTH/WINDOW — why z-conc fails its 3.0 gate at depth-2000 (2.548 < 3.0): mechanism
//                      decomposition (residual-scale vs novelty-gap) + three candidate laws:
//                      D-window ∝ depth (candD), extended preceding baseline (candA),
//                      scale-anchored z (candS). Shallow anchor must stay bit-exact.
//   partC G-WINDOW   — the pace-locked G gate (g=0.5693 > 0.5 @lr 0.15 with the fixed 100-step
//                      window): candidate law W(lr) = round(30/lr) steps.
// This probe gates NOTHING — it exists so registration-v6.json can pre-register honest bands and
// bit-exact anchors BEFORE run6.mjs executes (round-5 discipline: design5 receipted pre-seal).
// Fail-closed pipeline identities enforced inside this probe:
//   (i)   Jepa4(seed, wd=0) == Jepa3(seed) bit-exact (losses + all three weight matrices);
//   (ii)  normalizerStudyFlex(wLen=130) == run5's hardwired normalizerStudy bit-exact;
//   (iii) carried-form depth-2000 window reproduces design5's z 2.5480705541027127 bit-exact;
//   (iv)  wd=0 horizon (cap 1e5) reproduces design5's D=30174 bit-exact;
//   (v)   gFlex(lr 0.3, 100 steps, wd=0) reproduces run5's g_ratio bit-exact.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GRID } = require('./core/world2.js');
const { World } = require('./core/world.js');
const { World2 } = require('./core/world2.js');
const { CELLS, LAT } = require('./core/jepa.js');
const { Jepa3 } = require('./core/jepa3.js');
const { Jepa4 } = require('./core/jepa4.js');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RECEIPTS = path.join(HERE, 'receipts');
fs.mkdirSync(RECEIPTS, { recursive: true });
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }

const LR3 = 0.3, TAU4 = 0.99998, K4 = 1.5e-6, AMP0 = 0.9;
const WD_MAIN = 3e-4;                 // registered longevity main dose (see dose-response below)
const WD_LADDER = [0, 1e-4, 3e-4, 1e-3];
const T_HORIZON = 500000, CONTRAST_CAP = 100000;
const CKPTS = [400, 1000, 5000, 10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000];
const DEPTHS = [400, 1200, 2000, 2200]; // k = depth/400 in {1, 3, 5, 5.5}; 2200 = the round-5 finding site

// ---------- seed derivation (identical to run.mjs family) ----------
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;

// ---------- shared helpers (verbatim from run5.mjs) ----------
function perCellSurprise(zPred, zTgt) {
  const out = new Float32Array(CELLS);
  for (let c = 0; c < CELLS; c++) {
    let s = 0;
    for (let k = 0; k < LAT; k++) { const d = zPred[c * LAT + k] - zTgt[c * LAT + k]; s += d * d; }
    out[c] = s;
  }
  return out;
}
function varRatio(T, T0) {
  const nT = T.length, D = T[0].length;
  const v = (rows) => { let s = 0; for (let d = 0; d < D; d++) { let m = 0, m2 = 0; for (let t = 0; t < nT; t++) { m += rows[t][d]; m2 += rows[t][d] * rows[t][d]; } m /= nT; s += m2 / nT - m * m; } return s; };
  return v(T) / Math.max(1e-30, v(T0));
}
const norm64 = (W) => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i] * W[i]; return Math.sqrt(s); };
const relDisp = (W, W0) => { let d = 0, n = 0; for (let i = 0; i < W.length; i++) { const dd = W[i] - W0[i]; d += dd * dd; n += W[i] * W[i]; } return Math.sqrt(d) / Math.sqrt(n); };

// run5.mjs hardwired normalizerStudy (VERBATIM) — the flex variant must reproduce it bit-exactly
// at wLen=130 (identity ii).
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
    res.anomaly_vs_sample[name] = { anomaly_mean: mean(AT.map(fn)), sample_mean: mean(sampleTicks.map(fn)) };
  }
  const fnUR = statTop(U, 'raw');
  res.v4_rank_excess_diff = mean(AT.map(fnUR)) - mean(sampleTicks.map(fnUR));
  const cntU1 = (t) => { let n = 0; for (let c = 0; c < CELLS; c++) if (U[idx(t)][c] >= 1 - 1e-12) n++; return n; };
  res.own_max_cells_anomaly_mean = mean(AT.map(cntU1));
  res.own_max_cells_sample_mean = mean(sampleTicks.map(cntU1));
  res.own_max_cells_b124_mean = mean(B124.map(cntU1));
  return res;
}

// FLEX study: identical arithmetic, parameterized window length wLen; optional EXTRA preceding
// baseline ticks (preRows: array of per-cell surprise rows collected before the window) merged
// into the mu/sd/med/mad basis WITHOUT changing the scoring rows, the anomaly rule, or the
// first-30 sample rule. With wLen=130 and preRows=[] this must equal normalizerStudy bit-exactly.
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

// carried-form eval window (run5.mjs evalWindowDump VERBATIM; used for the depth decomposition
// and the candS correction basis)
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

// ---------- partA: decayed optimizer runs ----------
// horizon with Jepa4 (wd parameter); run5.mjs horizonRun body with the decayed model class and
// wp_norm added to checkpoints. With wd=0 this must reproduce design5 bit-exactly (identity iv).
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
  return { out };
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

// ---------- identity (i): Jepa4(wd=0) == Jepa3 bit-exact ----------
const id = (() => {
  const world = new World2(seedU32);
  const a = new Jepa3(seedU32); a.lr = LR3; a.tau = TAU4;
  const b = new Jepa4(seedU32, 0); b.lr = LR3; b.tau = TAU4;
  const la = [], lb = [];
  let obs = world.observe();
  for (let t = 0; t < 400; t++) {
    world.step(); const o1 = world.observe();
    la.push(a.trainStep(obs, o1)); lb.push(b.trainStep(obs, o1)); obs = o1;
  }
  const buf = (je) => sha(Buffer.concat([Buffer.from(je.Wc.buffer, je.Wc.byteOffset, je.Wc.byteLength),
                                          Buffer.from(je.Wp.buffer, je.Wp.byteOffset, je.Wp.byteLength),
                                          Buffer.from(je.Wt.buffer, je.Wt.byteOffset, je.Wt.byteLength)]));
  let lossesExact = true;
  for (let i = 0; i < la.length; i++) if (la[i] !== lb[i]) { lossesExact = false; break; }
  return { steps: 400, losses_bit_exact: lossesExact, weights_sha_jepa3: buf(a), weights_sha_jepa4_wd0: buf(b), weights_bit_exact: buf(a) === buf(b) };
})();

// ---------- identity (ii): normalizerStudyFlex(wLen=130, no pre) == normalizerStudy ----------
// built on the carried anchor window (depth 400)
const AT_ANCHOR = [430, 465, 500];
const anchorWin = evalWindowDump(seedU32, LR3, TAU4, 400, 401, AT_ANCHOR, AMP0);
const flexSame = normalizerStudyFlex(
  (() => { // rebuild the same S rows by re-running the window (deterministic)
    const world = new World2(seedU32);
    const jepa = new Jepa3(seedU32);
    jepa.lr = LR3; jepa.tau = TAU4;
    let obs = world.observe();
    for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
    const S = []; let obsPrev = obs;
    for (let t = 401; t <= 530; t++) {
      world.step();
      const obsNew = world.observe();
      if (AT_ANCHOR.includes(t)) {
        const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + AMP0);
        }
      }
      const zCtx = jepa.encode(obsPrev);
      const zPred = jepa.predict(zCtx);
      const zTgt = jepa.encodeTarget(obsNew);
      S.push(Array.from(perCellSurprise(zPred, zTgt)));
      obsPrev = obsNew;
    }
    return S;
  })(), AT_ANCHOR, 401, 130, []);
const flexFields = ['baseline_n', 'sample_n', 'v0_raw_ratio', 'v1_z_ratio', 'v2_rank_ratio_selfsel', 'v2b_rank_ratio_rawsel', 'v3_mad_ratio', 'v4_rank_excess_diff', 'own_max_cells_anomaly_mean', 'own_max_cells_sample_mean'];
const idFlex = { all_exact: flexFields.every((f) => flexSame[f] === anchorWin.study[f]), carried_z: anchorWin.study.v1_z_ratio };

// ---------- partB: depth/window study ----------
function collectDepth(seedU32, depth, wLen, atOffsets, preTicks) {
  // one trajectory: train `depth` steps, then collect surprise rows from
  // [depth + 1 - preTicks, depth + wLen] with injections at wStart+atOffsets (in-window only).
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = LR3; jepa.tau = TAU4;
  const jInit = new Jepa3(seedU32);
  let obs = world.observe();
  for (let t = 0; t < depth; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  const wStart = depth + 1;
  const AT = atOffsets.map((o) => wStart + o);
  const S = []; const T = []; const T0 = []; const Spre = [];
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

const partB = { depths: {}, mechanism_law: {}, assertions: {} };
let carried_z_2200 = null;
for (const depth of DEPTHS) {
  const k = depth / 400;
  const wStart = depth + 1;
  const AT_depth = [wStart + 29, wStart + 64, wStart + 99];
  // (1) carried-form window (the round-4 statistic, 130 ticks) — deficit basis + candS basis
  const carried = evalWindowDump(seedU32, LR3, TAU4, depth, wStart, AT_depth, AMP0);
  const carriedFlex = normalizerStudyFlex(
    collectDepth(seedU32, depth, 130, [29, 64, 99], 0).S, AT_depth, wStart, 130, []);
  if (depth === 2200) carried_z_2200 = carried.study.v1_z_ratio;
  // (2) candD: whole eval window ∝ depth (wLen = 130k, AT offsets floor(29k)/floor(64k)/floor(99k))
  const offF = [Math.floor(29 * k), Math.floor(64 * k), Math.floor(99 * k)];
  const cd = collectDepth(seedU32, depth, 130 * k, offF, 0);
  const studyD = normalizerStudyFlex(cd.S, cd.AT, wStart, 130 * k, []);
  const varD = varRatio(cd.T, cd.T0);
  // (2b) round-rule contrast at non-integer k (gate nothing)
  const offR = [Math.round(29 * k), Math.round(64 * k), Math.round(99 * k)];
  let studyDr = null;
  if (offR.some((o, i) => o !== offF[i])) {
    const cdr = collectDepth(seedU32, depth, 130 * k, offR, 0);
    studyDr = normalizerStudyFlex(cdr.S, cdr.AT, wStart, 130 * k, []);
  }
  // (3) candA: scoring window unchanged (130), baseline extended with 124*(k-1) PRECEDING ticks
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
  // mechanism decomposition from the carried form
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
// candS: scale-anchored z — z_ratio(depth) x (sd_sum(400) / sd_sum(depth)); anchored to identity
// at depth 400 (multiplier exactly 1.0). Deficit-law decomposition receipted per depth.
{
  const s4 = partB.depths['400'].carried.sd_sum;
  partB.candS = {};
  for (const depth of DEPTHS) {
    const c = partB.depths[String(depth)].carried;
    partB.candS[String(depth)] = {
      sd_sum: c.sd_sum, multiplier: s4 / c.sd_sum,
      z_ratio_corrected: c.z_ratio * (s4 / c.sd_sum)
    };
  }
  partB.mechanism_law = {
    statement: 'z_ratio(depth) = (novelty gap in sd units)/(baseline top-4 z, scale-free); the depth deficit factor is carried.z_ratio(depth)/carried.z_ratio(400)',
    deficit_factor: {},
    sd_collapse_factor: {},
    raw_gap_collapse_factor: {}
  };
  const base = partB.depths['400'].carried;
  for (const depth of DEPTHS) {
    const c = partB.depths[String(depth)].carried;
    partB.mechanism_law.deficit_factor[String(depth)] = c.z_ratio / base.z_ratio;
    partB.mechanism_law.sd_collapse_factor[String(depth)] = c.sd_sum / base.sd_sum;
    partB.mechanism_law.raw_gap_collapse_factor[String(depth)] = c.raw_gap / base.raw_gap;
  }
}

// ---------- partA: longevity ladder ----------
const partA = { identity_jepa4_wd0: id, arms: {} };
{
  // wd=0 anchor at cap 1e5 (identity iv vs design5 D)
  const a0 = horizonRun4(World2, seedU32, LR3, TAU4, 0, T_HORIZON, 'contrast', CKPTS);
  partA.arms['wd0_anchor'] = a0.out;
  a0.out.slow_inflation_rate = Math.log(a0.out.checkpoints['20000'].wc_norm / a0.out.checkpoints['400'].wc_norm) / 19600;
  // MAIN arm wd=3e-4 (registered dose — see dose-response below), registered stop rule min(5e5, D+2000)
  const am = horizonRun4(World2, seedU32, LR3, TAU4, WD_MAIN, T_HORIZON, 'registered', CKPTS);
  partA.arms['wd3e-4_main'] = am.out;
  am.out.slow_inflation_rate = am.out.checkpoints['20000'] ? Math.log(am.out.checkpoints['20000'].wc_norm / am.out.checkpoints['400'].wc_norm) / 19600 : null;
  if (am.out.checkpoints['100000']) {
    am.out.slow_inflation_rate_100k = Math.log(am.out.checkpoints['100000'].wc_norm / am.out.checkpoints['400'].wc_norm) / 99600;
  }
  am.out.rate_ratio_runaway_over_slow = (am.out.blowup_rate_last200 != null && am.out.slow_inflation_rate != null) ? am.out.blowup_rate_last200 / am.out.slow_inflation_rate : null;
  // dose-response arm at the house-recipe order 1e-4 (task-suggested value), registered stop rule
  const ah = horizonRun4(World2, seedU32, LR3, TAU4, 1e-4, T_HORIZON, 'registered', CKPTS);
  partA.arms['wd1e-4'] = ah.out;
  ah.out.slow_inflation_rate = ah.out.checkpoints['20000'] ? Math.log(ah.out.checkpoints['20000'].wc_norm / ah.out.checkpoints['400'].wc_norm) / 19600 : null;
  ah.out.rate_ratio_runaway_over_slow = (ah.out.blowup_rate_last200 != null && ah.out.slow_inflation_rate != null) ? ah.out.blowup_rate_last200 / ah.out.slow_inflation_rate : null;
  // mechanism ladder contrast (cap 1e5, gate nothing)
  const ac = horizonRun4(World2, seedU32, LR3, TAU4, 1e-3, T_HORIZON, 'contrast', CKPTS);
  partA.arms['wd0.001'] = ac.out;
  ac.out.slow_inflation_rate = ac.out.checkpoints['20000'] ? Math.log(ac.out.checkpoints['20000'].wc_norm / ac.out.checkpoints['400'].wc_norm) / 19600 : null;
  // learning guards in the MAIN decayed arm (wd=3e-4) + the 1e-4 dose + the wd=0 anchor
  partA.guards_wd3e4 = {
    g_gate_trivial_100: gGateFlex(seedU32, LR3, TAU4, WD_MAIN, 100),
    r1_world2_400: r1Flex(seedU32, LR3, TAU4, WD_MAIN, 400),
    r2_drift_200_400: r2Flex(seedU32, LR3, TAU4, WD_MAIN)
  };
  partA.guards_wd1e4 = {
    g_gate_trivial_100: gGateFlex(seedU32, LR3, TAU4, 1e-4, 100),
    r1_world2_400: r1Flex(seedU32, LR3, TAU4, 1e-4, 400),
    r2_drift_200_400: r2Flex(seedU32, LR3, TAU4, 1e-4)
  };
  partA.guards_wd0 = {
    g_gate_trivial_100: gGateFlex(seedU32, LR3, TAU4, 0, 100),
    r1_world2_400: r1Flex(seedU32, LR3, TAU4, 0, 400),
    r2_drift_200_400: r2Flex(seedU32, LR3, TAU4, 0)
  };
}

// ---------- partC: G-window law ----------
const partC = {
  law: 'W(lr) = round(30/lr) steps (G window proportional to 1/pace, anchored at lr 0.3 -> 100)',
  anchor_lr0_3_w100: gGateFlex(seedU32, LR3, TAU4, 0, 100),
  lr0_15_w200: gGateFlex(seedU32, 0.15, 1 - K4 * LAT / 0.15, 0, 200),
  lr0_5_w60: gGateFlex(seedU32, 0.5, 1 - K4 * LAT / 0.5, 0, 60),
  pace_lock_reference: { lr: 0.15, window: 100, g_ratio: 0.5692660186806099, source: 'registration-v5 P-R2x finding of record' }
};

// ---------- identity (iii): carried-form depth-2000 z vs design5 ----------
const design5 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design5.json'), 'utf8'));
const run5 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run5.json'), 'utf8'));
const idDepth = {
  probe_z_2200: carried_z_2200, design5_z: design5.partC_horizon.z_ratio_after_depth_2000,
  bit_exact: carried_z_2200 === design5.partC_horizon.z_ratio_after_depth_2000
};
const idHorizonD = {
  probe_D: partA.arms['wd0_anchor'].D, design5_D: design5.partC_horizon.D,
  bit_exact: partA.arms['wd0_anchor'].D === design5.partC_horizon.D
};
const idG = {
  probe_g: partC.anchor_lr0_3_w100.g_ratio, run5_g: run5.metrics.g_ratio,
  bit_exact: partC.anchor_lr0_3_w100.g_ratio === run5.metrics.g_ratio
};

const outDoc = {
  schema: 'quilt-jepa/design-probe-v6',
  seed_u32: seedU32, lr: LR3, tau: TAU4, K4, amp: AMP0,
  purpose: 'round-6 design probe — gates nothing; receipted pre-seal so registration-v6 can bind honest bands + bit-exact anchors before run6 executes (round-5 discipline)',
  pipeline_identity: { jepa4_wd0_vs_jepa3: id, normalizer_flex_vs_hardwired: idFlex, depth2200_carried_z_vs_design5: idDepth, wd0_horizon_D_vs_design5: idHorizonD, g_anchor_vs_run5: idG },
  partA_longevity: partA,
  partB_depth_window: partB,
  partC_gwindow: partC
};
fs.writeFileSync(path.join(RECEIPTS, 'design6.json'), JSON.stringify(outDoc, null, 1));
console.log('identity (i) jepa4wd0==jepa3:', id.losses_bit_exact && id.weights_bit_exact);
console.log('identity (ii) flex==hardwired:', idFlex.all_exact, 'carried z:', idFlex.carried_z.toFixed(4));
console.log('identity (iii) depth2200 (round-5 site) z vs design5:', idDepth.bit_exact, carried_z_2200);
console.log('identity (iv) wd0 D vs design5:', idHorizonD.bit_exact, partA.arms['wd0_anchor'].D);
console.log('identity (v) g anchor vs run5:', idG.bit_exact, partC.anchor_lr0_3_w100.g_ratio);
for (const key of Object.keys(partA.arms)) {
  const a = partA.arms[key];
  console.log('A', key, 'D=' + a.D, 'exec=' + a.executed_to, 'slow=' + (a.slow_inflation_rate != null ? a.slow_inflation_rate.toExponential(3) : 'null'),
    'runaway=' + (a.blowup_rate_last200 != null ? a.blowup_rate_last200.toExponential(3) : 'null'),
    'wc@400=' + (a.checkpoints['400'] ? a.checkpoints['400'].wc_norm.toFixed(3) : '-'));
}
console.log('A guards wd3e-4: g=' + partA.guards_wd3e4.g_gate_trivial_100.g_ratio.toFixed(4) + ' r1=' + partA.guards_wd3e4.r1_world2_400.r1_ratio.toFixed(4) + ' drift=' + partA.guards_wd3e4.r2_drift_200_400.r2_drift_ratio.toExponential(2));
console.log('A guards wd1e-4: g=' + partA.guards_wd1e4.g_gate_trivial_100.g_ratio.toFixed(4) + ' r1=' + partA.guards_wd1e4.r1_world2_400.r1_ratio.toFixed(4) + ' drift=' + partA.guards_wd1e4.r2_drift_200_400.r2_drift_ratio.toExponential(2));
console.log('A guards wd0   : g=' + partA.guards_wd0.g_gate_trivial_100.g_ratio.toFixed(4) + ' r1=' + partA.guards_wd0.r1_world2_400.r1_ratio.toFixed(4) + ' drift=' + partA.guards_wd0.r2_drift_200_400.r2_drift_ratio.toExponential(2));
for (const depth of DEPTHS) {
  const d = partB.depths[String(depth)];
  console.log('B depth', depth, 'k=' + d.k, 'carried z=' + d.carried.z_ratio.toFixed(4), 'sd_sum=' + d.carried.sd_sum.toFixed(5), 'raw_gap=' + d.carried.raw_gap.toFixed(5),
    '| candD z=' + d.candD.z_ratio.toFixed(4), '(n=' + d.candD.baseline_n + ')', '| candA z=' + d.candA.z_ratio.toFixed(4), '| candS z=' + partB.candS[String(depth)].z_ratio_corrected.toFixed(4),
    d.candD_round_rule ? '| candD-round z=' + d.candD_round_rule.z_ratio.toFixed(4) : '');
}
console.log('B assertion candD@400 bit-exact vs carried:', partB.assertions.candD_400_bit_exact_vs_carried);
console.log('C gwin: anchor(0.3,100)=' + partC.anchor_lr0_3_w100.g_ratio.toFixed(4),
  '0.15/200=' + partC.lr0_15_w200.g_ratio.toFixed(4), '0.5/60=' + partC.lr0_5_w60.g_ratio.toFixed(4));
