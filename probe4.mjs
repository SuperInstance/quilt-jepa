// probe4.mjs — quilt-jepa ROUND 4 DESIGN PROBE (receipted pre-seal, GATES NOTHING — same
// discipline as design3.json in round 3). Two registered round-4 laws need concrete constants:
//
//   LAW 1 (R2-v4, pace-aware EMA): run3 receipts imply drift(Wt) ∝ (1-tau)·pace:
//     round-2 (starved pace lr/N=1.95e-5, tau=0.999): drift/norm 1.08e-4 PASS
//     round-3 (working pace lr/LAT=0.075,  tau=0.999): drift/norm 1.06e-1 FAIL
//     same tau, pace ratio 3840x, drift ratio 982x — the EMA WINDOW must grow with pace.
//     This sweep measures the actual drift-vs-tau curve at the working pace and the Wc churn
//     floor (no tau can make Wt more stationary than Wc's own trend).
//
//   LAW 2 (R3-v4, percentile-normalized surprise): round-3 raw top-4 concentration ratio 1.919
//     < 3.0 because the baseline top-4 tracks the ball's own surprise. This study normalizes
//     per-cell surprise against each cell's OWN empirical distribution over the eval window
//     (124 baseline ticks) BEFORE computing concentration, and compares normalizer variants:
//     raw / per-cell z / per-cell ECDF rank / per-cell MAD / excess-rank difference.
//     Cross-check: at tau=0.999 the raw ratio MUST reproduce run3's 1.919183406560624 exactly.
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
const LR = 0.3; // registered round-3 lr, carried unchanged into round 4

const seedReceipt = JSON.parse(fs.readFileSync(path.join(HERE, 'receipts/certified-seed.json'), 'utf8'));
const seedU32 = parseInt(sha(JSON.stringify(seedReceipt.chosen.selected)).slice(0, 8), 16) >>> 0;
console.log('probe4 seed_u32:', seedU32, '(same derivation as rounds 1-3)');

function perCellSurprise(zPred, zTgt) {
  const out = new Float32Array(CELLS);
  for (let c = 0; c < CELLS; c++) {
    let s = 0;
    for (let k = 0; k < LAT; k++) { const d = zPred[c * LAT + k] - zTgt[c * LAT + k]; s += d * d; }
    out[c] = s;
  }
  return out;
}
const topK = (arr, k) => mean(Array.from(arr).sort((a, b) => b - a).slice(0, k));

// ---------- PART A: tau sweep on world2 (drift curve + learning guards) ----------
const TAUS = [0.99, 0.999, 0.9993, 0.9995, 0.9999, 0.99998];
const partA = {};
for (const tau of TAUS) {
  // run A: 400-step training trajectory (R1 protocol) + Wt total movement
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = LR; jepa.tau = tau;
  const wt0 = Float32Array.from(jepa.Wt);
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  const r1Ratio = mean(losses.slice(-10)) / mean(losses.slice(0, 10));
  let wtMove = 0; let wtN = 0;
  for (let i = 0; i < jepa.Wt.length; i++) { const d = jepa.Wt[i] - wt0[i]; wtMove += d * d; wtN += jepa.Wt[i] * jepa.Wt[i]; }
  const wtMoveRel = Math.sqrt(wtMove) / Math.sqrt(wtN);

  // run B: R2 protocol (fresh trajectory, snapshot at 200, drift over 200) + Wc churn floor
  const w2 = new World2(seedU32);
  const j2 = new Jepa3(seedU32);
  j2.lr = LR; j2.tau = tau;
  let ob = w2.observe();
  for (let t = 0; t < 200; t++) { w2.step(); const o1 = w2.observe(); j2.trainStep(ob, o1); ob = o1; }
  const snapWt = Float32Array.from(j2.Wt);
  const snapWc = Float32Array.from(j2.Wc);
  for (let t = 0; t < 200; t++) { w2.step(); const o1 = w2.observe(); j2.trainStep(ob, o1); ob = o1; }
  let drift = 0, wcDisp = 0, wtNorm2 = 0, wcNorm2 = 0;
  for (let i = 0; i < snapWt.length; i++) {
    const dW = j2.Wt[i] - snapWt[i], dC = j2.Wc[i] - snapWc[i];
    drift += dW * dW; wcDisp += dC * dC;
    wtNorm2 += j2.Wt[i] * j2.Wt[i]; wcNorm2 += j2.Wc[i] * j2.Wc[i];
  }
  partA[String(tau)] = {
    r2_drift_ratio: Math.sqrt(drift) / Math.sqrt(wtNorm2),
    wc_disp_200_400_rel: Math.sqrt(wcDisp) / Math.sqrt(wcNorm2), // churn floor: Wc's own 200-step movement
    r1_ratio: r1Ratio,
    r1_last10: mean(losses.slice(-10)),
    wt_total_move_rel_400: wtMoveRel, // plasticity cost receipt
    wt_norm_final: Math.sqrt(wtNorm2)
  };
  console.log(`tau=${tau} drift=${partA[String(tau)].r2_drift_ratio.toExponential(3)} wcDisp=${partA[String(tau)].wc_disp_200_400_rel.toExponential(3)} r1=${r1Ratio.toFixed(4)} last10=${partA[String(tau)].r1_last10.toExponential(3)} wtMove400=${wtMoveRel.toExponential(3)}`);
}

// ---------- PART B: R3 window + normalizer variants ----------
const ANOMALY_TICKS = [430, 465, 500];
function r3WindowDump(tau) {
  const world = new World2(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = LR; jepa.tau = tau;
  let obs = world.observe();
  for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  // init-encoder reference for the variance guard (fresh same-seed jepa, untouched)
  const jInit = new Jepa3(seedU32);
  const S = []; const T = []; const T0 = []; // per-tick surprise rows, target latents, init-target latents
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
    obsPrev = obsNew;
  }
  return { S, T, T0 };
}
function varRatio(T, T0) { // pooled per-dim variance trained-target / init-target over the window
  const nT = T.length, D = T[0].length;
  const v = (rows) => { let s = 0; for (let d = 0; d < D; d++) { let m = 0, m2 = 0; for (let t = 0; t < nT; t++) { m += rows[t][d]; m2 += rows[t][d] * rows[t][d]; } m /= nT; s += m2 / nT - m * m; } return s; };
  return v(T) / Math.max(1e-30, v(T0));
}
function normalizerStudy(S) {
  const nT = S.length; // 130 ticks, index 0 = tick 401
  const idx = (t) => t - 401;
  const isAnom = (t) => ANOMALY_TICKS.includes(t) || ANOMALY_TICKS.includes(t + 1);
  const B124 = []; for (let t = 401; t <= 530; t++) if (!isAnom(t)) B124.push(t);
  const sampleTicks = []; for (const t of B124) { if (sampleTicks.length < 30) sampleTicks.push(t); }
  // per-cell distribution over B124
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
  // transforms
  const Z = S.map((row) => row.map((x, c) => (sd[c] > 0 ? (x - mu[c]) / sd[c] : 0)));
  const MD = S.map((row) => row.map((x, c) => (mad[c] > 0 ? (x - med[c]) / mad[c] : 0)));
  const U = S.map((row) => row.map((x, c) => {
    const v = sortedCols[c];
    let lo = 0; for (const b of v) if (b <= x) lo++; // rank (ties counted le) — ECDF map
    return lo / v.length;
  }));
  const UR = S.map((row) => row.map((x, c) => { // rank VALUE, RAW selection partner
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
  const ratio = (fn) => mean(ANOMALY_TICKS.map(fn)) / mean(sampleTicks.map(fn));
  const res = {
    baseline_n: B124.length, sample_n: sampleTicks.length,
    v0_raw_ratio: ratio(statTop(S, 'self')),
    v1_z_ratio: ratio(statTop(Z, 'self')),
    v2_rank_ratio_selfsel: ratio(statTop(U, 'self')),
    v2b_rank_ratio_rawsel: ratio(statTop(UR, 'raw')),
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
  // excess-rank difference (V4): mean top-4-by-raw of U, anomaly minus baseline
  const fnUR = statTop(U, 'raw');
  res.v4_rank_excess_diff = mean(ANOMALY_TICKS.map(fnUR)) - mean(sampleTicks.map(fnUR));
  // own-history-max counts: cells with u >= 1 - 1/(2*124) i.e. at/above all 124 baseline values
  const cntU1 = (t) => { let n = 0; for (let c = 0; c < CELLS; c++) if (U[idx(t)][c] >= 1 - 1e-12) n++; return n; };
  res.own_max_cells_anomaly_mean = mean(ANOMALY_TICKS.map(cntU1));
  res.own_max_cells_sample_mean = mean(sampleTicks.map(cntU1));
  res.own_max_cells_b124_mean = mean(B124.map(cntU1));
  // detail at anomaly ticks: top-4 by raw with their z and u
  res.anomaly_detail = ANOMALY_TICKS.map((t) => {
    const pairs = [];
    for (let c = 0; c < CELLS; c++) pairs.push([S[idx(t)][c], c]);
    pairs.sort((a, b) => b[0] - a[0]);
    return { tick: t, top4: pairs.slice(0, 4).map(([s2, c]) => ({ cell: c, s: s2, z: Z[idx(t)][c], u: U[idx(t)][c] })) };
  });
  return res;
}

const partB = {};
for (const tau of [0.999, 0.9993, 0.9995, 0.9999, 0.99998]) {
  const { S, T, T0 } = r3WindowDump(tau);
  const study = normalizerStudy(S);
  study.var_ratio_trained_over_init_target = varRatio(T, T0);
  partB[String(tau)] = study;
  console.log(`tau=${tau} raw=${study.v0_raw_ratio.toFixed(3)} z=${study.v1_z_ratio.toFixed(3)} rankSelf=${study.v2_rank_ratio_selfsel.toFixed(3)} rankRaw=${study.v2b_rank_ratio_rawsel.toFixed(3)} mad=${study.v3_mad_ratio.toFixed(3)} ownMax anom=${study.own_max_cells_anomaly_mean.toFixed(2)} sample=${study.own_max_cells_sample_mean.toFixed(2)} varRatio=${study.var_ratio_trained_over_init_target.toFixed(3)}`);
}

// cross-check: tau=0.999 raw ratio must equal run3's receipted value bit-exactly
const run3 = JSON.parse(fs.readFileSync(path.join(HERE, 'receipts/run3.json'), 'utf8'));
const r3raw = run3.chain.find((r) => r.type === 'R3_concentration').payload.conc_ratio;
const crossOk = partB['0.999'].v0_raw_ratio === r3raw;
console.log('cross-check vs run3 R3 raw ratio:', partB['0.999'].v0_raw_ratio, 'vs', r3raw, crossOk ? 'EXACT' : 'MISMATCH');
if (!crossOk) { console.error('PIPELINE DIVERGENCE from run3 — fix probe before any registration.'); process.exit(2); }

// ---------- PART C: trivial-world G gate at candidate taus ----------
const partC = {};
for (const tau of [0.999, 0.9993, 0.99998]) {
  const world = new World(seedU32);
  const jepa = new Jepa3(seedU32);
  jepa.lr = LR; jepa.tau = tau;
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < 100; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  partC[String(tau)] = { g_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), first10: mean(losses.slice(0, 10)), last10: mean(losses.slice(-10)) };
  console.log(`trivial G tau=${tau}: ratio=${partC[String(tau)].g_ratio.toFixed(4)}`);
}

const doc = {
  schema: 'quilt-jepa/design4-probe',
  seed_u32: seedU32, lr: LR,
  purpose: 'round-4 design probe for the two registered laws (pace-aware EMA window; percentile-normalized surprise). Gates nothing.',
  partA_tau_sweep: partA,
  partB_normalizer_study: partB,
  partC_trivial_G: partC,
  cross_check_run3_raw_ratio: { value: r3raw, reproduced: crossOk }
};
fs.mkdirSync(path.join(HERE, 'receipts'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'receipts/design4.json'), JSON.stringify(doc, null, 1));
console.log('wrote receipts/design4.json');
