// mesh.js — anisotropic diffusion cell mesh (Perona-Malik), double-buffered Float32Array.
// Stride 4: [0] luminance, [1] angle, [2] gradient magnitude, [3] latent/surprise energy.
// The registered conservation law (P5): total energy conserved (pairwise symmetric exchange),
// variance non-increasing (contraction). lambda <= 0.25 stability bound.
'use strict';
const { GRID } = require('./world');

class Mesh {
  constructor(grid = GRID) {
    this.grid = grid;
    const n = grid * grid;
    this.a = new Float32Array(n * 4);
    this.b = new Float32Array(n * 4);
    this.activeA = true;
    this.kappaSq = 0.2 * 0.2;
    this.lambda = 0.2;
  }
  get buf() { return this.activeA ? this.a : this.b; }
  loadFrom(obs, energy) {
    const g = this.grid, src = this.a;
    for (let y = 0; y < g; y++) {
      for (let x = 0; x < g; x++) {
        const i = (y * g + x) * 4;
        const l = obs[y * g + x];
        const lr = obs[y * g + Math.min(g - 1, x + 1)] - l;
        const ld = obs[Math.min(g - 1, y + 1) * g + x] - l;
        src[i] = l; src[i + 1] = Math.atan2(ld, lr); src[i + 2] = Math.sqrt(lr * lr + ld * ld);
        src[i + 3] = energy ? energy[y * g + x] : 0;
      }
    }
    this.activeA = true;
  }
  step() { // one diffusion pass on channel 3
    const g = this.grid;
    const src = this.buf;
    const dst = this.activeA ? this.b : this.a;
    for (let y = 0; y < g; y++) {
      for (let x = 0; x < g; x++) {
        const ci = (y * g + x) * 4;
        dst[ci] = src[ci]; dst[ci + 1] = src[ci + 1]; dst[ci + 2] = src[ci + 2];
        const e = src[ci + 3], mc = src[ci + 2];
        const iL = (y * g + Math.max(0, x - 1)) * 4;
        const iR = (y * g + Math.min(g - 1, x + 1)) * 4;
        const iT = (Math.max(0, y - 1) * g + x) * 4;
        const iB = (Math.min(g - 1, y + 1) * g + x) * 4;
        const dL = src[iL + 3] - e, dR = src[iR + 3] - e, dT = src[iT + 3] - e, dB = src[iB + 3] - e;
        const cL = Math.exp(-((mc - src[iL + 2]) ** 2) / this.kappaSq);
        const cR = Math.exp(-((mc - src[iR + 2]) ** 2) / this.kappaSq);
        const cT = Math.exp(-((mc - src[iT + 2]) ** 2) / this.kappaSq);
        const cB = Math.exp(-((mc - src[iB + 2]) ** 2) / this.kappaSq);
        dst[ci + 3] = e + this.lambda * (cL * dL + cR * dR + cT * dT + cB * dB);
      }
    }
    this.activeA = !this.activeA;
  }
  totals() {
    let sum = 0, sumSq = 0;
    const b = this.buf;
    for (let i = 0; i < this.grid * this.grid; i++) {
      const e = b[i * 4 + 3]; sum += e; sumSq += e * e;
    }
    const n = this.grid * this.grid;
    return { total: sum, mean: sum / n, variance: sumSq / n - (sum / n) ** 2 };
  }
  surprise(sampleIdx) { // energy at sampled cells
    const b = this.buf;
    let s = 0;
    for (const i of sampleIdx) s += Math.abs(b[i * 4 + 3]);
    return s / sampleIdx.length;
  }
}
module.exports = { Mesh };
