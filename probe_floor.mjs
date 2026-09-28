// probe_floor.mjs — DESIGN-TIME: measure the linear-predictable loss floor per world.
// For each cell, with Wc and Wt frozen at INIT (Wt=Wc), the best composite predictor is
// min_Wp E|Wp·(Wc·f) - Wc·f1|² — a 4x4 linear least-squares (closed form, normal equations,
// deterministic). floor/init answers: is the verdict-v2 L1 gate ("loss drops >= 2x within
// 100 steps") ARCHITECTURALLY reachable, or does the floor sit above 0.5x init?
// Receipted in design3.json BEFORE the v3 seal.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GRID } = require('./core/world.js');
const { CELLS, LAT } = require('./core/jepa.js');
const { Jepa3 } = require('./core/jepa3.js');
const { World } = require('./core/world.js');
const { World2 } = require('./core/world2.js');

function cellFeatures(o, c) {
  const x = c % GRID, y = (c / GRID) | 0;
  const l = o[c];
  const r = o[y * GRID + Math.min(GRID - 1, x + 1)] - l;
  const d = o[Math.min(GRID - 1, y + 1) * GRID + x] - l;
  return [l, r, d, l - 0.5];
}

function floor(WorldCls, seed, windowTicks) {
  const world = new WorldCls(seed);
  const jepa = new Jepa3(seed); // untouched init state: Wc, Wt=Wc
  // collect registered window
  const xs = [], ys = []; // per call: zCtx(4), zTgt(4) — ALL cells flattened per tick
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
  // init-loss reference on the same window (Wp at init)
  const WpInit = Float32Array.from(jepa.Wp);
  let initS = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const cell = i % CELLS; // samples are tick-major: (tick, cell) pairs
    for (let k = 0; k < LAT; k++) {
      let z = 0;
      for (let j = 0; j < LAT; j++) z += WpInit[cell * LAT * LAT + k * LAT + j] * x[j];
      const dv = z - ys[i][k];
      initS += dv * dv;
    }
  }
  const initLoss = initS / xs.length / LAT; // mean over all (sample,latent) pairs
  // per-cell normal equations: A = Σ x xᵀ (4x4), B = Σ x yᵀ (4x4); solve A Wpᵀ = Bᵀ per cell
  let floorS = 0;
  for (let c = 0; c < CELLS; c++) {
    const A = Array.from({ length: LAT }, () => new Float64Array(LAT));
    const B = Array.from({ length: LAT }, () => new Float64Array(LAT));
    for (let i = 0; i < xs.length; i++) {
      const cell = i % CELLS; // same tick-major indexing
      if (cell !== c) continue;
      const x = xs[i], y = ys[i];
      for (let a = 0; a < LAT; a++) {
        for (let b = 0; b < LAT; b++) { A[a][b] += x[a] * x[b]; B[a][b] += x[a] * y[b]; }
      }
    }
    // solve A·M = B for M (row-major Gauss-Jordan, 4x4)
    const M = solve4(A, B);
    // residual with optimal M: E|Wp x - y|², Wp = Mᵀ (M[a][b] = Wp row? define Wp x = z: z[k] = Σ_j Wp[k][j] x[j] → Wp = Mᵀ)
    for (let i = 0; i < xs.length; i++) {
      const cell = i % CELLS;
      if (cell !== c) continue;
      const x = xs[i], y = ys[i];
      for (let k = 0; k < LAT; k++) {
        let z = 0;
        for (let j = 0; j < LAT; j++) z += M[j][k] * x[j]; // Wp = Mᵀ (Wp = C·A⁻¹, C = Bᵀ)
        const dv = z - y[k];
        floorS += dv * dv;
      }
    }
  }
  const floorLoss = floorS / xs.length / LAT; // mean over (sample, latent)
  return { initLoss, floorLoss, ratio: floorLoss / initLoss };
}

function solve4(A, B) {
  // Gauss-Jordan: [A | B] -> [I | M], M solves A M = B (A row=a, col=b; B, M row=a, col=b)
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

const rows = [];
for (const [wname, W] of [['trivial(world.js)', World], ['hard(world2)', World2]]) {
  const r = floor(W, 12345, 2000);
  rows.push({ world: wname, window: 2000, ...r });
  console.log(`${wname}: initLoss=${r.initLoss.toExponential(4)} floorLoss=${r.floorLoss.toExponential(4)} floor/init=${r.ratio.toFixed(4)}`);
}
const doc = { schema: 'quilt-jepa/design-probe-v3/floor', purpose: 'design-time reachability of the L1 2x gate; receipted before v3 seal', rows };
const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'receipts', 'design3_floor.json');
fs.writeFileSync(out, JSON.stringify(doc, null, 1));
