// world2.js — HARD world on the same 16x16 grid (round-2 design law #1: "surprise needs a
// hard world; register difficulty, not just training length"). Round-1's world was so smooth
// that a random linear encoder almost solved it (first-10 loss 0.0090 -> P1 vacuous).
// World v2 adds, all xorshift-deterministic given one 32-bit seed:
//   - two-frequency drifting wave (beating pattern, phase speeds differ),
//   - a turbulence field re-seeded every 16 ticks at low amplitude (irreducible floor kept
//     SMALL so learning is still possible: amplitude 0.05, vs wave 0.5 and ball bump 0.6),
//   - a ball moving at 2 cells/tick (round 1: 1),
//   - an occluder: a 1-cell vertical dark bar for 2 ticks every 80 ticks (a rare in-world
//     surprise event the detector must separate from the injected intruder by CONCENTRATION).
// Same module contract as world.js: constructor(seed), step(), observe().
'use strict';
const GRID = 16;

function xorshift32(seed) {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296; // [0,1)
  };
}

class World2 {
  constructor(seed) {
    this.grid = GRID;
    const rnd = xorshift32(seed);
    this.phase1 = rnd() * Math.PI * 2;
    this.phase2 = rnd() * Math.PI * 2;
    this.waveFreq1 = 0.35 + rnd() * 0.2;
    this.waveFreq2 = 0.8 + rnd() * 0.4;
    // ball starts center-ish, speed 2
    this.bx = 4 + Math.floor(rnd() * 8);
    this.by = 4 + Math.floor(rnd() * 8);
    this.bvx = rnd() < 0.5 ? -2 : 2;
    this.bvy = rnd() < 0.5 ? -2 : 2;
    // turbulence: one xorshift stream, field re-drawn every 16 ticks
    this.turbRnd = xorshift32((seed ^ 0x7E11B) >>> 0);
    this.turb = new Float32Array(GRID * GRID);
    this.redrawTurb();
    this.tickN = 0;
  }
  redrawTurb() {
    for (let i = 0; i < this.turb.length; i++) this.turb[i] = (this.turbRnd() - 0.5) * 0.1; // +/-0.05
  }
  step() {
    this.tickN++;
    this.bx += this.bvx; this.by += this.bvy;
    if (this.bx <= 0 || this.bx >= GRID - 1) { this.bvx = -this.bvx; this.bx += 2 * Math.sign(this.bvx); }
    if (this.by <= 0 || this.by >= GRID - 1) { this.bvy = -this.bvy; this.by += 2 * Math.sign(this.bvy); }
    if (this.tickN % 16 === 0) this.redrawTurb();
  }
  occluding() { return this.tickN % 80 === 0 || this.tickN % 80 === 1; }
  observe() {
    const f = new Float32Array(GRID * GRID);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const v = 0.5 * Math.sin(this.waveFreq1 * x + this.phase1 + 0.08 * this.tickN)
                + 0.5 * Math.cos(this.waveFreq2 * y + this.phase2 - 0.05 * this.tickN);
        f[y * GRID + x] = v * 0.5 + 0.5 + this.turb[y * GRID + x];
      }
    }
    // ball footprint 2x2 bump
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = this.bx + dx, y = this.by + dy;
        if (x >= 0 && x < GRID && y >= 0 && y < GRID) f[y * GRID + x] = Math.min(1, f[y * GRID + x] + 0.6);
      }
    }
    // occluder: dark vertical bar, x drifts with each event
    if (this.occluding()) {
      const ox = 3 + ((this.tickN / 80) | 0) % 10;
      for (let y = 0; y < GRID; y++) f[y * GRID + ox] = Math.max(0, f[y * GRID + ox] - 0.9);
    }
    return f;
  }
}
module.exports = { World2, GRID, xorshift32 };
