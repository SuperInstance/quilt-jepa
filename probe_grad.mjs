// probe_grad.mjs v2 — DESIGN-TIME finite-difference gradient check (receipted in design3.json).
// Clean version: analytic gradient of the EXACT loss (mean over N, UNCLIPPED — clipping is an
// update-space op, not part of L) vs central differences, under both index conventions:
//   convention A (as implemented): dL/dWc[j][k] ∝ bp[k]*f[j]
//   convention B (chain rule):     dL/dWc[j][k] ∝ bp[j]*f[k]   with bp = Wp^T * err
'use strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const require2 = createRequire(import.meta.url);
const { GRID } = require('./core/world.js');
const { CELLS, LAT } = require('./core/jepa.js');
const { Jepa3 } = require('./core/jepa3.js');

const seed = 777;
const jepa = new Jepa3(seed);
const { World } = require('./core/world.js');
const world = new World(seed);
let obs = world.observe(); world.step(); const obs1 = world.observe();
const WtFrozen = Float32Array.from(jepa.Wt);

function cellFeatures(o, c) {
  const x = c % GRID, y = (c / GRID) | 0;
  const l = o[c];
  const r = o[y * GRID + Math.min(GRID - 1, x + 1)] - l;
  const d = o[Math.min(GRID - 1, y + 1) * GRID + x] - l;
  return [l, r, d, l - 0.5];
}
function lossAt() { // exact L (mean over N) with frozen target encoder
  const zCtx = jepa.encode(obs);
  const zPred = jepa.predict(zCtx);
  let s = 0;
  for (let c = 0; c < CELLS; c++) {
    const f = cellFeatures(obs1, c);
    for (let k = 0; k < LAT; k++) {
      let z = 0;
      for (let j = 0; j < LAT; j++) z += WtFrozen[c * LAT * LAT + k * LAT + j] * f[j];
      const dv = zPred[c * LAT + k] - z;
      s += dv * dv;
    }
  }
  return s / (CELLS * LAT);
}

// cell under test
const c = 3, eps = 1e-5;
const fT = cellFeatures(obs, c);
// err[r] = zPred[r] - zTgt[r] for cell c (unperturbed)
const zCtx = jepa.encode(obs);
const zPred = jepa.predict(zCtx);
const f1 = cellFeatures(obs1, c);
const err = new Float32Array(LAT);
for (let k = 0; k < LAT; k++) {
  let z = 0;
  for (let j = 0; j < LAT; j++) z += WtFrozen[c * LAT * LAT + k * LAT + j] * f1[j];
  err[k] = zPred[c * LAT + k] - z;
}
const Wp_c = jepa.Wp.subarray(c * LAT * LAT, (c + 1) * LAT * LAT);
// bp[k] = sum_r Wp[r][k] * err[r]  (unclipped, NO 2/N factor — folded into comparisons)
const bp = new Float32Array(LAT);
for (let k = 0; k < LAT; k++) { let s = 0; for (let r = 0; r < LAT; r++) s += Wp_c[r * LAT + k] * err[r]; bp[k] = s; }
// NOTE: dL/dzPred[r] = 2*err[r]/N ; dL/dWc[j][k] via zPred = Wp*(Wc*f):
//   = (2/N) * sum_r err[r]*Wp[r][j]*f[k] = (2/N)*bp[j]*f[k]   (convention B)
// Implemented update applies bp[k]*f[j] (convention A) with its own 2/LAT scale.

console.log('cell', c);
for (const [j, k] of [[0, 2], [2, 1], [1, 3], [3, 0]]) {
  const idx = c * LAT * LAT + j * LAT + k;
  const orig = jepa.Wc[idx];
  jepa.Wc[idx] = orig + eps; const Lp = lossAt();
  jepa.Wc[idx] = orig - eps; const Lm = lossAt();
  jepa.Wc[idx] = orig;
  const fd = (Lp - Lm) / (2 * eps);
  const convA = (2 / (CELLS * LAT)) * bp[k] * fT[j];
  const convB = (2 / (CELLS * LAT)) * bp[j] * fT[k];
  console.log(`Wc[${j}][${k}] fd=${fd.toExponential(6)} A_impl=${convA.toExponential(6)} (errA=${Math.abs(fd - convA).toExponential(2)}) B_chain=${convB.toExponential(6)} (errB=${Math.abs(fd - convB).toExponential(2)})`);
}
