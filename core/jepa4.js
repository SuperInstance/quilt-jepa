// jepa4.js — ROUND 6 longevity optimizer (L-LONG law, registration-v6). New file;
// core/jepa3.js is untouched history (rounds 3-5 receipts reference it as-was; byte-provenance
// preserved) and core/jepa.js is untouched history (rounds 1-2).
//
// ROOT CAUSE ADDRESSED (receipted in verdict-v5 RHOR): the registered operating point has a
// finite lifetime with a two-phase shape — phase 1 is SLOW NULL-SPACE |Wc| DIFFUSION
// (1.938e-5/step at the loss floor: the Wp∘Wc composition stays optimal while the individual
// factors drift), phase 2 is a self-exciting runaway (7.290e-2/step, 3761x the slow phase).
// The trivial-world contrast (D=30562 ≈ world2's 30174) proved the divergence is OPTIMIZER-borne
// (un-regularized churn), not world-borne — so the registered round-6 lever is norm
// regularization attacking the phase-1 carrier directly.
//
// LAW (registered, registration-v6): WEIGHT DECAY ON Wc ONLY — the receipted phase-1 diffusion
// carrier — in the standard gradient-coupled form
//     Wc[i] ← Wc[i] − lr·wd·Wc[i]
// applied once per training step AFTER the per-cell data-gradient update and BEFORE the EMA
// target update (so the EMA target tracks the decayed Wc). Wp carries no decay term (the loss
// is homogeneous in (Wp, Wc): scaling Wc by s with Wt≈EMA(Wc) also scaled by s leaves the loss
// invariant, so decay attacks the |Wc| drift without touching the floor — receipted mechanism).
//
// wd is an explicit constructor parameter; wd = 0 must reproduce Jepa3 BIT-EXACTLY (the decay
// line multiplies by (1 − lr·0) = 1 exactly in IEEE — proven by probe6's identity check and
// re-enforced fail-closed in run6). The trainStep body is byte-derived from jepa3.js's
// trainStep with the single registered decay line inserted before the EMA loop.
'use strict';
const { Jepa, CELLS, LAT, GRID } = require('./jepa.js');
const { Jepa3 } = require('./jepa3.js');

class Jepa4 extends Jepa3 {
  constructor(seed, wd) {
    super(seed);
    this.wd = wd; // registered weight decay on Wc only; 0 => bit-identical to Jepa3
    this.decayLaw = 'Wc -= lr*wd*Wc after data-grad, before EMA (Wc only)'; // receipt marker
  }
  // one SGD+decay step on Wc, Wp against frozen target latents — jepa3.js body + decay line
  trainStep(obsT, obsT1) {
    const zCtx = this.encode(obsT);
    const zPred = this.predict(zCtx);
    const zTgt = this.encodeTarget(obsT1);
    const L = this.loss(zPred, zTgt);
    // L1 repair scale (jepa3 law, carried verbatim): d = 2*(zPred - zTgt)/LAT, clipped
    for (let c = 0; c < CELLS; c++) {
      const f = features4(obsT, c);
      const g = new Float32Array(LAT);
      for (let r = 0; r < LAT; r++) {
        const d = 2 * (zPred[c * LAT + r] - zTgt[c * LAT + r]) / LAT;
        const gc = Math.max(-1, Math.min(1, d));
        g[r] = gc;
        for (let k = 0; k < LAT; k++) {
          this.Wp[(c * LAT + r) * LAT + k] -= this.lr * gc * zCtx[c * LAT + k];
        }
      }
      // Wc grad — D4-repaired indexing (jepa3 law, carried verbatim): Wc[j][k] -= lr*bp[j]*f[k]
      const Wp_c = this.Wp.subarray(c * LAT * LAT, (c + 1) * LAT * LAT);
      for (let j = 0; j < LAT; j++) {
        let bpj = 0;
        for (let r = 0; r < LAT; r++) bpj += Wp_c[r * LAT + j] * g[r];
        for (let k = 0; k < LAT; k++) {
          this.Wc[(c * LAT + j) * LAT + k] -= this.lr * bpj * f[k];
        }
      }
    }
    // L-LONG (round-6 registered law): weight decay on Wc only, before the EMA update.
    // wd=0 branch is exact: (1 - lr*0) === 1, Wc[i] * 1 === Wc[i] in IEEE — bit-identity.
    if (this.wd !== 0) {
      const decay = 1 - this.lr * this.wd;
      for (let i = 0; i < this.Wc.length; i++) this.Wc[i] *= decay;
    }
    // EMA target update (the WGSL emaUpdateKernel law) — unchanged
    for (let i = 0; i < this.Wt.length; i++) {
      this.Wt[i] = this.tau * this.Wt[i] + (1 - this.tau) * this.Wc[i];
    }
    return L;
  }
}

// features4 mirrors jepa3.js features3 exactly (same 4-dim local feature law) — duplicated so
// jepa4.js stays self-contained (same pattern jepa3 used for jepa.js; the decay touches ONLY
// the |Wc| update — anything else would confound the round-6 claims).
function features4(obs, i) {
  const x = i % GRID, y = (i / GRID) | 0;
  const l = obs[i];
  const r = obs[y * GRID + Math.min(GRID - 1, x + 1)] - l;
  const d = obs[Math.min(GRID - 1, y + 1) * GRID + x] - l;
  return [l, r, d, l - 0.5];
}

module.exports = { Jepa4, CELLS, LAT, GRID };
