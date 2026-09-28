// world.js — synthetic world on a 16x16 cell grid: standing wave field + bouncing ball.
// Fully deterministic given a 32-bit seed (xorshift32). No Math.random anywhere.
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

// World state: luminance field (GRID*GRID) + ball (x,y,vx,vy). tick advances one step.
class World {
  constructor(seed) {
    this.grid = GRID;
    const rnd = xorshift32(seed);
    this.phase1 = rnd() * Math.PI * 2;
    this.phase2 = rnd() * Math.PI * 2;
    this.waveFreq = 0.35 + rnd() * 0.2;
    // ball starts center-ish with unit-ish velocity
    this.bx = 4 + Math.floor(rnd() * 8);
    this.by = 4 + Math.floor(rnd() * 8);
    this.bvx = rnd() < 0.5 ? -1 : 1;
    this.bvy = rnd() < 0.5 ? -1 : 1;
    this.tickN = 0;
  }
  step() {
    this.tickN++;
    this.bx += this.bvx; this.by += this.bvy;
    if (this.bx <= 0 || this.bx >= GRID - 1) { this.bvx = -this.bvx; this.bx += 2 * this.bvx; }
    if (this.by <= 0 || this.by >= GRID - 1) { this.bvy = -this.bvy; this.by += 2 * this.bvy; }
  }
  // observation: luminance field, ball rendered as +0.6 bump, wave field as base
  observe() {
    const f = new Float32Array(GRID * GRID);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const v = 0.5 * Math.sin(this.waveFreq * x + this.phase1 + 0.08 * this.tickN)
                + 0.5 * Math.cos(this.waveFreq * y + this.phase2 + 0.05 * this.tickN);
        f[y * GRID + x] = v * 0.5 + 0.5;
      }
    }
    // ball footprint 2x2 bump
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = this.bx + dx, y = this.by + dy;
        if (x >= 0 && x < GRID && y >= 0 && y < GRID) f[y * GRID + x] = Math.min(1, f[y * GRID + x] + 0.6);
      }
    }
    return f;
  }
}
module.exports = { World, GRID, xorshift32 };
