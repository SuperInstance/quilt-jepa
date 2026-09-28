// jepa3.js — ROUND 3 repaired optimizer (L1 law, verdict-v2). New file; core/jepa.js is
// untouched history (rounds 1-2 receipts reference it as-was; byte-provenance preserved).
//
// ROOT CAUSE (receipted in verdict-v2 D1): round-1/2 trainStep divided each latent gradient
// by N = CELLS*LAT = 1024 BEFORE clipping, so the effective per-weight step was ~1/500 of the
// intended scale — 400 steps moved weights ~3% of their init range and the model learned
// nothing on ANY world (entry loss = init mismatch, world-independent).
//
// REPAIR (registered law, verdict-v2 "Design laws for round 3" L1): per-latent normalization —
// each latent's gradient is normalized per-cell-latent (divide by LAT = 4), NOT across the whole
// 1024-dim vector. lr stays 0.02 (unchanged law constant).
//
// REPAIR 2 (D4, design-time finite-difference discovery, receipts/design3.json — found BEFORE
// the v3 seal): jepa.js's Wc update was TRANSPOSED — forward computes zCtx = Wc·f but the
// backward applied d(Wcᵀ·f)/dWc, i.e. Wc[j][k] -= bp[k]·f[j] where the chain rule requires
// Wc[j][k] -= bp[j]·f[k] (bp = Wpᵀ·g). Finite-difference check: convention-B matches the true
// gradient to <=7.5e-9 on every probed entry; the implemented form errs up to 5.7e-5 (sign
// flips included). With only the scale fix (jepa3-v1) the trivial-world gate was still
// unreachable (ratio >= 0.86) — the transposition, not the scale, was the binding constraint.
//
// Everything else is the SAME JEPA law: loss = mean squared latent error, target encoder EMA
// tau=0.999 stop-gradient, clipped SGD, 16x16 cells, per-cell 4-dim latents.
'use strict';
const { Jepa, CELLS, LAT, GRID } = require('./jepa.js');

class Jepa3 extends Jepa {
  constructor(seed) {
    super(seed);
    this.gradScale = 'per-latent (1/LAT)'; // receipted repair marker; jepa.js used 1/N
    this.wcIndexing = 'chain-rule (bp[j]*f[k])'; // receipted repair marker; jepa.js was transposed
  }
  // one SGD step on Wc, Wp against frozen target latents — repaired scale AND indexing
  trainStep(obsT, obsT1) {
    const zCtx = this.encode(obsT);
    const zPred = this.predict(zCtx);
    const zTgt = this.encodeTarget(obsT1);
    const L = this.loss(zPred, zTgt);
    // L1 repair: d = 2*(zPred - zTgt)/LAT (was /N = /1024). Clipping unchanged.
    for (let c = 0; c < CELLS; c++) {
      const f = features3(obsT, c);
      const g = new Float32Array(LAT);
      for (let r = 0; r < LAT; r++) {
        const d = 2 * (zPred[c * LAT + r] - zTgt[c * LAT + r]) / LAT;
        const gc = Math.max(-1, Math.min(1, d));
        g[r] = gc;
        for (let k = 0; k < LAT; k++) {
          this.Wp[(c * LAT + r) * LAT + k] -= this.lr * gc * zCtx[c * LAT + k];
        }
      }
      // Wc grad — D4-repaired indexing: Wc[j][k] -= lr * bp[j] * f[k], bp = Wpᵀ g
      const Wp_c = this.Wp.subarray(c * LAT * LAT, (c + 1) * LAT * LAT);
      for (let j = 0; j < LAT; j++) {
        let bpj = 0;
        for (let r = 0; r < LAT; r++) bpj += Wp_c[r * LAT + j] * g[r];
        for (let k = 0; k < LAT; k++) {
          this.Wc[(c * LAT + j) * LAT + k] -= this.lr * bpj * f[k];
        }
      }
    }
    // EMA target update (the WGSL emaUpdateKernel law, tau=0.999) — unchanged
    for (let i = 0; i < this.Wt.length; i++) {
      this.Wt[i] = this.tau * this.Wt[i] + (1 - this.tau) * this.Wc[i];
    }
    return L;
  }
}

// features3 mirrors jepa.js features() exactly (same 4-dim local feature law).
// Duplicated here so jepa3.js stays a self-contained exact-twin of the round-1/2 feature law
// (the L1 repair touches ONLY the gradient scale — anything else would confound the round-3
// claims; receipted in registration-v3).
function features3(obs, i) {
  const x = i % GRID, y = (i / GRID) | 0;
  const l = obs[i];
  const r = obs[y * GRID + Math.min(GRID - 1, x + 1)] - l;
  const d = obs[Math.min(GRID - 1, y + 1) * GRID + x] - l;
  return [l, r, d, l - 0.5];
}

module.exports = { Jepa3, CELLS, LAT, GRID };
