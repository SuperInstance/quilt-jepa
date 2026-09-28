// jepa.js — tiny JEPA world model in latent space (no pixel reconstruction).
// Per-cell 4-dim latent: context encoder W_c (4x4 per cell), predictor W_p (4x4 per cell),
// target encoder = EMA of context encoder (tau=0.999, stop-gradient).
// The mesh IS the latent space: each grid cell holds its own 4-dim latent vector.
'use strict';
const { GRID, xorshift32 } = require('./world');
const CELLS = GRID * GRID;
const LAT = 4;

function mat4(rnd, scale) {
  const m = new Float32Array(LAT * LAT);
  for (let i = 0; i < m.length; i++) m[i] = (rnd() - 0.5) * scale;
  return m;
}
// encode one cell's observation features -> latent
function features(obs, i) {
  // local 4-dim feature: [luminance, right-diff, down-diff, ball-presence proxy (deviation from wave mean)]
  const x = i % GRID, y = (i / GRID) | 0;
  const l = obs[i];
  const r = obs[y * GRID + Math.min(GRID - 1, x + 1)] - l;
  const d = obs[Math.min(GRID - 1, y + 1) * GRID + x] - l;
  return [l, r, d, l - 0.5];
}
function mv(m, v) { // 4x4 * 4
  const o = new Float32Array(LAT);
  for (let r = 0; r < LAT; r++) {
    let s = 0;
    for (let c = 0; c < LAT; c++) s += m[r * LAT + c] * v[c];
    o[r] = s;
  }
  return o;
}

class Jepa {
  constructor(seed) {
    const rnd = xorshift32(seed);
    this.Wc = new Float32Array(CELLS * LAT * LAT);
    this.Wp = new Float32Array(CELLS * LAT * LAT);
    this.Wt = new Float32Array(CELLS * LAT * LAT); // target (EMA of Wc)
    for (let c = 0; c < CELLS; c++) {
      this.Wc.set(mat4(rnd, 0.5), c * LAT * LAT);
      this.Wp.set(mat4(rnd, 0.5), c * LAT * LAT);
      this.Wt.set(this.Wc.subarray(c * LAT * LAT, (c + 1) * LAT * LAT), c * LAT * LAT);
    }
    this.tau = 0.999;
    this.lr = 0.02;
  }
  encode(obs) { // -> Float32Array CELLS*LAT (context latents)
    const z = new Float32Array(CELLS * LAT);
    for (let c = 0; c < CELLS; c++) {
      const f = features(obs, c);
      const m = mv(this.Wc.subarray(c * LAT * LAT, (c + 1) * LAT * LAT), f);
      z.set(m, c * LAT);
    }
    return z;
  }
  encodeTarget(obs) {
    const z = new Float32Array(CELLS * LAT);
    for (let c = 0; c < CELLS; c++) {
      const f = features(obs, c);
      const m = mv(this.Wt.subarray(c * LAT * LAT, (c + 1) * LAT * LAT), f);
      z.set(m, c * LAT);
    }
    return z;
  }
  predict(zCtx) {
    const z = new Float32Array(CELLS * LAT);
    for (let c = 0; c < CELLS; c++) {
      const m = mv(this.Wp.subarray(c * LAT * LAT, (c + 1) * LAT * LAT), zCtx.subarray(c * LAT, c * LAT + LAT));
      z.set(m, c * LAT);
    }
    return z;
  }
  loss(zPred, zTgt) {
    let s = 0;
    for (let i = 0; i < zPred.length; i++) { const d = zPred[i] - zTgt[i]; s += d * d; }
    return s / zPred.length;
  }
  // one SGD step on Wc, Wp against frozen target latents
  trainStep(obsT, obsT1) {
    const zCtx = this.encode(obsT);
    const zPred = this.predict(zCtx);
    const zTgt = this.encodeTarget(obsT1);
    const L = this.loss(zPred, zTgt);
    // gradients: dL/dzPred = 2*(zPred - zTgt)/N ; backprop through predict (Wp) and encode (Wc)
    const N = zPred.length;
    for (let c = 0; c < CELLS; c++) {
      const f = features(obsT, c);
      const g = new Float32Array(LAT);
      for (let r = 0; r < LAT; r++) {
        const d = 2 * (zPred[c * LAT + r] - zTgt[c * LAT + r]) / N;
        // clip
        const gc = Math.max(-1, Math.min(1, d));
        g[r] = gc;
        // Wp grad: g_r * zCtx
        for (let k = 0; k < LAT; k++) {
          this.Wp[(c * LAT + r) * LAT + k] -= this.lr * gc * zCtx[c * LAT + k];
        }
      }
      // Wc grad: Wp^T g  outer f
      const Wp_c = this.Wp.subarray(c * LAT * LAT, (c + 1) * LAT * LAT);
      for (let k = 0; k < LAT; k++) {
        let bp = 0;
        for (let r = 0; r < LAT; r++) bp += Wp_c[r * LAT + k] * g[r];
        for (let j = 0; j < LAT; j++) {
          this.Wc[(c * LAT + j) * LAT + k] -= this.lr * bp * f[j];
        }
      }
    }
    // EMA target update (the WGSL emaUpdateKernel law, tau=0.999)
    for (let i = 0; i < this.Wt.length; i++) {
      this.Wt[i] = this.tau * this.Wt[i] + (1 - this.tau) * this.Wc[i];
    }
    return L;
  }
  normWt() {
    let s = 0; for (let i = 0; i < this.Wt.length; i++) s += this.Wt[i] * this.Wt[i];
    return Math.sqrt(s);
  }
  driftWtOver(fn) { // apply fn snapshot-diff helper externally
    return fn();
  }
  corruptWc(fraction, seed) { // flip sign of a fraction of Wc weights (deterministic)
    const rnd = xorshift32(seed);
    let n = 0;
    for (let i = 0; i < this.Wc.length; i++) {
      if (rnd() < fraction) { this.Wc[i] = -this.Wc[i]; n++; }
    }
    return n;
  }
}
module.exports = { Jepa, CELLS, LAT, GRID };
