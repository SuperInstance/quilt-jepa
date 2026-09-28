// probe5.mjs — quilt-jepa ROUND 5 DESIGN PROBE v2 (receipted pre-seal, GATES NOTHING — same
// discipline as design3.json / design4.json). The three registered round-5 probes:
//
//   PROBE A (R3L, anomaly-strength ladder): sweep the injected amplitude over the fixed ladder
//     [0.0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9, 1.2] (0.9 = rounds-2/3/4 registered anchor;
//     0.0 = null anchor; 1.2 = clamp-saturation probe). Statistic: R3v4 z-concentration ratio.
//
//   PROBE B (R2x, K4 cross-pace validation): re-derive tau from the SAME law 1-tau = K4*LAT/lr
//     (K4 = 1.5e-6 UNCHANGED) at registered second lrs {0.15, 0.5} -> tau 0.99996 / 0.999988;
//     measure the R2 drift protocol + no-collapse + learning ratios there. lr=0.3 = pipeline anchor.
//
//   PROBE C (RHOR, horizon scaling): one world2 trajectory at the registered operating point.
//     v1 of this probe found the trajectory DIVERGES (float32 overflow -> NaN) between 5e3 and
//     5e4 steps; scratch diagnosis (5 configs) says: slow |Wc| inflation (un-regularized churn
//     diffusion), then a self-exciting runaway at ~1.3e-2/step, in EVERY configuration including
//     the trivial world. v2 receipts the divergence precisely: first non-finite loss step D,
//     runaway rate, |Wc| at last finite step, fixed pre-divergence scoring depths (drift and
//     no-collapse windows at depth 2000), plasticity re-engagement curve, and four registered
//     contrast runs (tau=0.999; lr=0.15; lr=0.5; trivial world) with a 1e5-step cap.
//     Main trajectory stop rule (registered pre-seal): execute to min(5e5, D+2000) — the
//     registered horizon exceeds the finite lifetime; post-divergence steps are NaN-inert and
//     all post-divergence aggregates receipt null (JSON NaN -> null).
//
// PIPELINE IDENTITY (fail-closed, must be EXACT before any registration): the amp=0.9 ladder
// rung, the lr=0.3 cross-pace arm, and the horizon trajectory's first 400 steps re-derive
// run4.json's receipted metrics bit-exactly (cross-ROUND probe==run determinism).
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

const HERE = path.dirname(new URL(import.meta.url).pathname);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const LR3 = 0.3;      // registered lr (carried, registration-v3/v4)
const TAU4 = 0.99998; // registered round-4 tau (carried)
const K4 = 1.5e-6;    // registered pace-law constant (carried, registration-v4 law_R2v4)
const LADDER = [0.0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9, 1.2];
const XPACES = [0.15, 0.3, 0.5];
const T_HORIZON = 500000; // registered horizon (10x the EMA window 5e4)
const HORIZON_CKPTS = [400, 1000, 5000, 10000, 20000, 30000];
const CONTRAST_CAP = 100000;

const seedReceipt = JSON.parse(fs.readFileSync(path.join(HERE, 'receipts/certified-seed.json'), 'utf8'));
const seedU32 = parseInt(sha(JSON.stringify(seedReceipt.chosen.selected)).slice(0, 8), 16) >>> 0;
console.log('probe5 seed_u32:', seedU32, '(same derivation as rounds 1-4)');

function perCellSurprise(zPred, zTgt) {  // VERBATIM run4.mjs arithmetic
  const out = new Float32Array(CELLS);
  for (let c = 0; c < CELLS; c++) {
    let s = 0;
    for (let k = 0; k < LAT; k++) { const d = zPred[c * LAT + k] - zTgt[c * LAT + k]; s += d * d; }
    out[c] = s;
  }
  return out;
}
function varRatio(T, T0) { // VERBATIM run4.mjs arithmetic
  const nT = T.length, D = T[0].length;
  const v = (rows) => { let s = 0; for (let d = 0; d < D; d++) { let m = 0, m2 = 0; for (let t = 0; t < nT; t++) { m += rows[t][d]; m2 += rows[t][d] * rows[t][d]; } m /= nT; s += m2 / nT - m * m; } return s; };
  return v(T) / Math.max(1e-30, v(T0));
}
// VERBATIM run4.mjs normalizerStudy arithmetic, tick-base parameterized (windowStart/AT):
// for windowStart=401, AT=[430,465,500] it is ARITHMETICALLY IDENTICAL to run4's R3v4 study.
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
    let lo = 0; for (const b of v) if (b <= x) lo++; // ECDF map: rank (ties le) over own 124-tick baseline
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
  // ADDITIVE mechanism receipt (gates nothing): top-4-by-z cell identities at anomaly ticks
  res.anomaly_detail = AT.map((t) => {
    const pairs = [];
    for (let c = 0; c < CELLS; c++) pairs.push([Z[idx(t)][c], c]);
    pairs.sort((a, b) => b[0] - a[0]);
    return { tick: t, top4: pairs.slice(0, 4).map(([z, c]) => ({ cell: c, z })) };
  });
  return res;
}
// The R3v4 eval window EXACTLY as run4.mjs runs it: train `trainSteps` on a fresh world2/jepa,
// then 130 ticks; injection (+amp on the 2x2 block at (bx+8, by+8) mod (GRID-2)) applied to
// obsNew BEFORE scoring; the injected frame propagates one tick forward as the next context.
function evalWindowDump(seedU32, lr, tau, trainSteps, wStart, AT, amp) {
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const jInit = new Jepa3(seedU32); // untouched init encoder (no-collapse variance guard)
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

// ---------- PROBE A: anomaly-strength ladder (registered operating point) ----------
const partA = {};
for (const amp of LADDER) {
  const { study, var_ratio } = evalWindowDump(seedU32, LR3, TAU4, 400, 401, [430, 465, 500], amp);
  study.var_ratio_trained_over_init_target = var_ratio;
  partA[String(amp)] = study;
  console.log(`ladder A=${amp}: z=${study.v1_z_ratio.toFixed(6)} raw=${study.v0_raw_ratio.toFixed(4)} mad=${study.v3_mad_ratio.toFixed(3)} zAnom=${study.anomaly_vs_sample.z.anomaly_mean.toFixed(4)} var=${var_ratio.toFixed(5)}`);
}
// saturation receipt: clamp makes A=1.2's injected frames identical to A=0.9's
const satExact = partA['1.2'].v1_z_ratio === partA['0.9'].v1_z_ratio
  && partA['1.2'].v0_raw_ratio === partA['0.9'].v0_raw_ratio
  && partA['1.2'].v3_mad_ratio === partA['0.9'].v3_mad_ratio;
console.log('ladder saturation (A=1.2 == A=0.9 bit-exact):', satExact);

// ---------- PROBE B: K4 cross-pace validation ----------
const partB = {};
for (const lr of XPACES) {
  const tau = 1 - K4 * LAT / lr;
  const g = gGate(seedU32, lr, tau);
  const r1 = r1protocol(seedU32, lr, tau);
  const r2 = r2protocol(World2, seedU32, lr, tau);
  const win = evalWindowDump(seedU32, lr, tau, 400, 401, [430, 465, 500], 0.9);
  partB[String(lr)] = {
    tau, pace: lr / LAT,
    g_ratio: g.g_ratio, g_first10: g.g_first10, g_last10: g.g_last10,
    r1_ratio: r1.r1_ratio, r1_first10: r1.r1_first10, r1_last10: r1.r1_last10,
    wt_total_move_rel_400: r1.wt_total_move_rel_400,
    r2_drift_ratio: r2.r2_drift_ratio, wc_disp_200_400_rel: r2.wc_disp_200_400_rel,
    z_ratio_at_registered_amp: win.study.v1_z_ratio,
    var_ratio: win.var_ratio
  };
  console.log(`xpace lr=${lr} tau=${tau} pace=${(lr / LAT).toFixed(4)}: drift=${r2.r2_drift_ratio.toExponential(3)} wcDisp=${r2.wc_disp_200_400_rel.toExponential(3)} g=${g.g_ratio.toFixed(4)} r1=${r1.r1_ratio.toFixed(4)} wtMove=${r1.wt_total_move_rel_400.toExponential(3)} z=${win.study.v1_z_ratio.toFixed(4)} var=${win.var_ratio.toFixed(5)}`);
}

// ---------- PROBE C: horizon scaling + finite-horizon divergence ----------
const finOrNull = (x) => (Number.isFinite(x) ? x : null);
function horizonRun(WorldCls, seedU32, lr, tau, T, stopRule, ckpts) {
  // stopRule 'registered': run to min(T, D+1000) where D = first non-finite loss step
  const world = new WorldCls(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const jInit = new Jepa3(seedU32);
  const wt0 = Float32Array.from(jepa.Wt);
  const wc0 = Float32Array.from(jepa.Wc);
  const losses = [];
  const checkpoints = {};
  for (const k of ckpts) checkpoints[String(k)] = null;
  const ringWt = []; const ringWc = []; // last 201 finite-step snapshots (pre-divergence receipts)
  let D = -1, executedTo = 0;
  let allNanStep = -1, weightsAbsorbing = true, lossFiniteAgain = 0;
  let obs = world.observe();
  const limit = stopRule === 'registered' ? T : Math.min(T, CONTRAST_CAP);
  const postDWindow = stopRule === 'registered' ? 2000 : 0;
  const weightState = () => {
    let anyFin = false, allNan = true;
    for (const W of [jepa.Wc, jepa.Wp, jepa.Wt]) {
      let wFin = false, wAllNan = true;
      for (let i = 0; i < W.length; i++) {
        if (Number.isFinite(W[i])) { wFin = true; wAllNan = false; }
      }
      if (wFin) anyFin = true;
      if (!wAllNan) allNan = false;
    }
    return { anyFin, allNan };
  };
  for (let t = 1; t <= limit; t++) {
    world.step();
    const o1 = world.observe();
    const L = jepa.trainStep(obs, o1);
    obs = o1;
    losses.push(L);
    executedTo = t;
    if (Number.isFinite(L)) {
      if (D > 0) lossFiniteAgain++; // the loss oscillates Inf<->finite-huge during the runaway
      else {
        ringWt.push(Float32Array.from(jepa.Wt)); ringWc.push(Float32Array.from(jepa.Wc));
        if (ringWt.length > 201) { ringWt.shift(); ringWc.shift(); }
      }
      if (ckpts.includes(t)) {
        checkpoints[String(t)] = {
          wt_move_rel: relDisp(jepa.Wt, wt0), wc_move_rel: relDisp(jepa.Wc, wc0),
          wt_norm: norm64(jepa.Wt), wc_norm: norm64(jepa.Wc),
          loss_mean_500: mean(losses.slice(Math.max(0, t - 500), t))
        };
      }
    } else if (D < 0) {
      D = t;
      if (stopRule !== 'registered') break;
    }
    if (D > 0 && t > D && t <= D + postDWindow) { // post-divergence weight-death receipts
      const ws = weightState(); // anyFin===false <=> ALL entries of Wc/Wp/Wt non-finite
      if (ws.anyFin) {
        if (allNanStep > 0) weightsAbsorbing = false;
      } else {
        if (allNanStep < 0) allNanStep = t;
      }
      if (t >= D + postDWindow) break;
    }
  }
  const finite = losses.filter(Number.isFinite);
  const out = {
    lr, tau, world: WorldCls === World ? 'trivial' : 'world2',
    T_registered: T, stop_rule: stopRule, cap: stopRule === 'registered' ? null : CONTRAST_CAP,
    executed_to: executedTo,
    D: D > 0 ? D : null, diverged: D > 0,
    D_mod80: D > 0 ? D % 80 : null,
    // post-divergence receipts: the loss oscillates Inf<->finite-huge before the weights die;
    // weight death (ALL entries of Wc/Wp/Wt non-finite) is the absorbing state
    all_weights_nan_step: D > 0 ? (allNanStep > 0 ? allNanStep : null) : null,
    weights_all_nan_at_end: D > 0 ? !weightState().anyFin : null,
    weights_nan_absorbing: D > 0 ? (allNanStep > 0 && weightsAbsorbing) : null,
    loss_finite_again_count: D > 0 ? lossFiniteAgain : null,
    first10: mean(losses.slice(0, 10)),
    last_finite10_tail: finite.length >= 10 ? mean(finite.slice(-10)) : null,
    loss_ratio_finite_tail: finite.length >= 10 ? mean(finite.slice(-10)) / mean(losses.slice(0, 10)) : null,
    loss_ratio_at_20000: finite.length >= 20000 ? mean(finite.slice(19990, 20000)) / mean(losses.slice(0, 10)) : null,
    checkpoints,
    // fixed pre-divergence scoring depth (registered): filled by depth2000Window for the main arm
    drift_at_depth_2000: null, wc_disp_at_depth_2000: null,
    var_ratio_after_depth_2000: null, z_ratio_after_depth_2000: null,
    // last-200-finite receipts (adaptive but deterministic; null if poisoned)
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
  return { out, state: { world, jepa, jInit, obs, D, losses } };
}
// main trajectory: after the run, evaluate the depth-2000 window from a FRESH arm that replays
// the identical first 2200 steps (bit-identical arithmetic; the main arm's post-D state is NaN).
function depth2000Window(seedU32, lr, tau) {
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = lr; jepa.tau = tau;
  const jInit = new Jepa3(seedU32);
  let obs = world.observe();
  for (let t = 0; t < 2000; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  // drift protocol at depth: snapshot AT 2000, 200 further steps (to 2200)
  const snap = Float32Array.from(jepa.Wt);
  const snapWc = Float32Array.from(jepa.Wc);
  for (let t = 0; t < 200; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  let drift = 0, wcDisp = 0, wtN2 = 0, wcN2 = 0;
  for (let i = 0; i < snap.length; i++) {
    const dW = jepa.Wt[i] - snap[i], dC = jepa.Wc[i] - snapWc[i];
    drift += dW * dW; wcDisp += dC * dC;
    wtN2 += jepa.Wt[i] * jepa.Wt[i]; wcN2 += jepa.Wc[i] * jepa.Wc[i];
  }
  // 130-tick eval window (window law identical: injections at offsets 29/64/99), A=0.9
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

const mainRun = horizonRun(World2, seedU32, LR3, TAU4, T_HORIZON, 'registered', HORIZON_CKPTS);
const partC = mainRun.out;
// derived shape receipts FIRST (slow-inflation rate vs runaway rate: pure post-processing of
// checkpoints) — v2 note: the first draft of this probe printed these before computing them
// (use-before-assignment crash, caught before any receipt was written); computation now precedes use.
partC.slow_inflation_rate = Math.log(partC.checkpoints['20000'].wc_norm / partC.checkpoints['400'].wc_norm) / (20000 - 400);
partC.rate_ratio_runaway_over_slow = partC.blowup_rate_last200 / partC.slow_inflation_rate;
console.log(`horizon MAIN: D=${partC.D} (mod80=${partC.D_mod80}) executed_to=${partC.executed_to} lossFiniteAgain=${partC.loss_finite_again_count} allNan@${partC.all_weights_nan_step} absorbing=${partC.weights_nan_absorbing}`);
for (const k of Object.keys(partC.checkpoints)) {
  const c = partC.checkpoints[k];
  console.log(`  ckpt ${k}: wt=${c.wt_move_rel.toExponential(3)} wc=${c.wc_move_rel.toExponential(3)} |Wc|=${c.wc_norm.toExponential(3)} loss500=${c.loss_mean_500.toExponential(3)}`);
}
console.log(`  first10=${partC.first10.toExponential(3)} lastFin10tail=${partC.last_finite10_tail.toExponential(3)} ratio20000=${partC.loss_ratio_at_20000.toFixed(5)} drift_last200=${partC.drift_last200.toExponential(3)} rate=${partC.blowup_rate_last200.toExponential(3)} slow=${partC.slow_inflation_rate.toExponential(3)} rateRatio=${partC.rate_ratio_runaway_over_slow.toExponential(2)} |Wc|last=${partC.wc_norm_at_last_finite.toExponential(3)}`);
const depth2000 = depth2000Window(seedU32, LR3, TAU4);
Object.assign(partC, depth2000);
console.log(`  depth2000: drift=${depth2000.drift_at_depth_2000.toExponential(3)} wcDisp=${depth2000.wc_disp_at_depth_2000.toExponential(3)} var=${depth2000.var_ratio_after_depth_2000.toFixed(5)} z=${depth2000.z_ratio_after_depth_2000.toFixed(4)}`);

// registered contrast runs (cap 1e5)
partC.contrasts = {};
for (const [name, WorldCls, lr, tau] of [
  ['tau0.999_lr0.3', World2, 0.3, 0.999],
  ['lr0.15_tau_law', World2, 0.15, 1 - K4 * LAT / 0.15],
  ['lr0.5_tau_law', World2, 0.5, 1 - K4 * LAT / 0.5],
  ['trivial_lr0.3', World, 0.3, TAU4]
]) {
  const r = horizonRun(WorldCls, seedU32, lr, tau, T_HORIZON, 'contrast', HORIZON_CKPTS);
  partC.contrasts[name] = r.out;
  r.out.slow_inflation_rate = r.out.checkpoints['20000'] ? Math.log(r.out.checkpoints['20000'].wc_norm / (r.out.checkpoints['400'] ? r.out.checkpoints['400'].wc_norm : 9.27)) / 19600 : null;
  console.log(`contrast ${name}: D=${r.out.D} rate=${r.out.blowup_rate_last200 ? r.out.blowup_rate_last200.toExponential(3) : 'null'} |Wc|last=${r.out.wc_norm_at_last_finite ? r.out.wc_norm_at_last_finite.toExponential(3) : 'null'} mod80=${r.out.D_mod80} allNan@${r.out.all_weights_nan_step} absorbing=${r.out.weights_nan_absorbing} lossFinAgain=${r.out.loss_finite_again_count}`);
}

// ---------- PIPELINE IDENTITY (fail-closed, EXACT or exit 2 before any receipt) ----------
const run4 = JSON.parse(fs.readFileSync(path.join(HERE, 'receipts/run4.json'), 'utf8'));
const M = run4.metrics;
const checks = [
  ['ladder[0.9].v1_z_ratio', partA['0.9'].v1_z_ratio, M.r3v4_z_ratio],
  ['ladder[0.9].v0_raw_ratio', partA['0.9'].v0_raw_ratio, M.r3v4_raw_ratio],
  ['ladder[0.9].z_anomaly_mean', partA['0.9'].anomaly_vs_sample.z.anomaly_mean, M.r3v4_z_anomaly_mean],
  ['ladder[0.9].z_sample_mean', partA['0.9'].anomaly_vs_sample.z.sample_mean, M.r3v4_z_sample_mean],
  ['ladder[0.9].var_ratio', partA['0.9'].var_ratio_trained_over_init_target, M.r2v4_var_ratio],
  ['ladder[0.9].mad_ratio', partA['0.9'].v3_mad_ratio, M.r3v4_mad_ratio],
  ['xpace[0.3].r2_drift_ratio', partB['0.3'].r2_drift_ratio, M.r2_drift_ratio],
  ['xpace[0.3].wc_disp', partB['0.3'].wc_disp_200_400_rel, M.r2v4_wc_disp_200_400_rel],
  ['xpace[0.3].r1_ratio', partB['0.3'].r1_ratio, M.r1_ratio],
  ['xpace[0.3].g_ratio', partB['0.3'].g_ratio, M.g_ratio],
  ['xpace[0.3].z_ratio', partB['0.3'].z_ratio_at_registered_amp, M.r3v4_z_ratio],
  ['horizon.first10', partC.first10, M.r1_first10],
  ['horizon.ckpt400.wt_move', partC.checkpoints['400'].wt_move_rel, M.r2v4_wt_total_move_rel_400]
];
const bad = checks.filter(([k, a, b]) => a !== b);
for (const [k, a, b] of checks) console.log(`identity ${k}: ${a === b ? 'EXACT' : 'MISMATCH ' + a + ' vs ' + b}`);
if (bad.length || !satExact) { console.error('PIPELINE DIVERGENCE from run4 receipts — fix probe before any registration.'); process.exit(2); }

const doc = {
  schema: 'quilt-jepa/design5-probe',
  seed_u32: seedU32, lr: LR3, tau: TAU4, K4,
  purpose: 'round-5 design probe (v2) for the three registered probes: anomaly-strength ladder; K4 cross-pace validation; horizon scaling + finite-horizon divergence law. Gates nothing.',
  ladder_saturation_bit_exact: satExact,
  partA_ladder: partA,
  partB_xpace: partB,
  partC_horizon: partC,
  pipeline_identity_vs_run4: { checked: checks.length, all_exact: true }
};
fs.mkdirSync(path.join(HERE, 'receipts'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'receipts/design5.json'), JSON.stringify(doc, null, 1));
console.log('wrote receipts/design5.json (pipeline identity ' + checks.length + '/' + checks.length + ' EXACT vs run4.json; saturation ' + satExact + ')');
