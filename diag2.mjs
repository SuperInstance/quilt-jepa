// diag2.mjs — POST-verdict diagnostics for round-2's three FAILs (R1, R3, R6).
// These gate nothing; the receipt of record (run2.json, tip 985f3227…) is already scored.
// Purpose: mechanistic root cause for the round-3 design laws. Deterministic, same seed.
'use strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fs = require('node:fs');
const { World2, GRID } = require('./core/world2.js');
const { Jepa, CELLS, LAT } = require('./core/jepa.js');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const seedReceipt = JSON.parse(fs.readFileSync(new URL('./receipts/certified-seed.json', import.meta.url), 'utf8'));
const seedU32 = parseInt(sha(JSON.stringify(seedReceipt.chosen.selected)).slice(0, 8), 16) >>> 0;
function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }

// ---- D1: is entry loss architecture-constant (init mismatch), not world-hardness? ----
{
  const w = new World2(seedU32);
  const j = new Jepa(seedU32);
  // measure first-step loss with the world's REAL content, then with Wp:=Wc (predictor = encoder)
  let obs = w.observe(); w.step(); const obs1 = w.observe();
  const zCtx = j.encode(obs), zPred = j.predict(zCtx), zTgt = j.encodeTarget(obs1);
  const L_world = j.loss(zPred, zTgt);
  const saved = Float32Array.from(j.Wp);
  j.Wp.set(j.Wc); // predictor identical to context encoder
  const zPred2 = j.predict(zCtx);
  const L_wpEqWc = j.loss(zPred2, zTgt);
  j.Wp.set(saved);
  // and on the EASY world (round-1 world.js) with the same init:
  const { World } = require('./core/world.js');
  const wE = new World(seedU32); const jE = new Jepa(seedU32);
  let oE = wE.observe(); wE.step(); const oE1 = wE.observe();
  const L_easy = jE.loss(jE.predict(jE.encode(oE)), jE.encodeTarget(oE1));
  console.log(`D1 entry-loss: world2=${L_world.toFixed(5)} easyWorld=${L_easy.toFixed(5)} | with Wp:=Wc: ${L_wpEqWc.toFixed(7)} (world content ${(L_world / Math.max(1e-12, L_easy)).toFixed(2)}x of easy)`);
  console.log(`   -> entry loss is init-mismatch driven: ${L_world.toFixed(5)} vs ${L_easy.toFixed(5)} differ only ${(Math.abs(L_world - L_easy) / L_easy * 100).toFixed(1)}% while Wp:=Wc collapses it to ${L_wpEqWc.toExponential(2)}`);
}

// ---- D2: concentrated surprise timeline — do occluder ticks dominate the baseline? ----
{
  const world = new World2(seedU32);
  const jepa = new Jepa(seedU32);
  let obs = world.observe();
  for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  const conc = (pc) => mean(Array.from(pc).sort((a, b) => b - a).slice(0, 4));
  const rows = [];
  let obsPrev = obs;
  for (let t = 401; t <= 530; t++) {
    world.step();
    const obsNew = world.observe();
    if (t === 430 || t === 465 || t === 500) { // anomaly injection BEFORE scoring (round-2 law)
      const px = (world.bx + 8) % (GRID - 2), py = (world.by + 8) % (GRID - 2);
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) obsNew[(py + dy) * GRID + px + dx] = Math.min(1, obsNew[(py + dy) * GRID + px + dx] + 0.9);
    }
    const zc = jepa.encode(obsPrev), zp = jepa.predict(zc), zt = jepa.encodeTarget(obsNew);
    const pc = new Float32Array(CELLS);
    for (let c = 0; c < CELLS; c++) { let s = 0; for (let k = 0; k < LAT; k++) { const d = zp[c * LAT + k] - zt[c * LAT + k]; s += d * d; } pc[c] = s; }
    rows.push([t, conc(pc)]);
    obsPrev = obsNew;
  }
  const occ = rows.filter(([t]) => t % 80 === 0 || t % 80 === 1);
  const anom = rows.filter(([t]) => t === 430 || t === 465 || t === 500);
  const base = rows.filter(([t]) => ![430, 465, 500].includes(t) && ![430, 465, 500].includes(t + 1) && t % 80 !== 0 && t % 80 !== 1);
  const baseWithOcc = rows.filter(([t]) => ![430, 465, 500].includes(t) && ![430, 465, 500].includes(t + 1));
  const c = (r) => mean(r.map(([, v]) => v));
  console.log(`D2 concentrated: anomaly=${c(anom).toFixed(5)} | baseline WITH occluder=${c(baseWithOcc).toFixed(5)} (ratio ${(c(anom) / c(baseWithOcc)).toFixed(3)}) | baseline occluder-EXCLUDED=${c(base).toFixed(5)} (ratio ${(c(anom) / c(base)).toFixed(3)})`);
  console.log(`   occluder ticks: ${occ.map(([t, v]) => `${t}:${v.toFixed(4)}`).join(' ')} | anomaly ticks: ${anom.map(([t, v]) => `${t}:${v.toFixed(4)}`).join(' ')}`);
  const peakNonOcc = Math.max(...base.map(([, v]) => v));
  console.log(`   max non-occluder baseline tick: ${peakNonOcc.toFixed(5)} vs occluder min ${Math.min(...occ.map(([, v]) => v)).toFixed(5)}`);
}

// ---- D3: why sign-flip is impact-insensitive; is magnitude-destroying corruption sensitive? ----
{
  const world = new World2(seedU32);
  const jepa = new Jepa(seedU32);
  let obs = world.observe();
  for (let t = 0; t < 560; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
  const probePairs = [];
  for (let t = 0; t < 30; t++) { world.step(); const o1 = world.observe(); probePairs.push([obs, o1]); obs = o1; }
  const probeLoss = (je) => mean(probePairs.map(([a, b]) => { const zc = je.encode(a), zp = je.predict(zc), zt = je.encodeTarget(b); return je.loss(zp, zt); }));
  // per-cell impact ranking (same law as run2)
  const impact = new Float32Array(CELLS);
  for (const [a, b] of probePairs) {
    const zc = jepa.encode(a), zp = jepa.predict(zc), zt = jepa.encodeTarget(b);
    for (let c = 0; c < CELLS; c++) { let s = 0; for (let k = 0; k < LAT; k++) { const d = zp[c * LAT + k] - zt[c * LAT + k]; s += d * d; } impact[c] += s; }
  }
  const ranked = Array.from(impact.keys()).sort((x, y) => (impact[y] - impact[x]) || (x - y)).slice(0, 26);
  const L0 = probeLoss(jepa);
  // correlation between pred and tgt on top-impact cells' probe losses (why sign-flip fails):
  let dot = 0, np = 0, nt = 0;
  for (const [a, b] of probePairs) {
    const zc = jepa.encode(a), zp = jepa.predict(zc), zt = jepa.encodeTarget(b);
    for (const c of ranked) for (let k = 0; k < LAT; k++) { const p = zp[c * LAT + k], t = zt[c * LAT + k]; dot += p * t; np += p * p; nt += t * t; }
  }
  const corr = dot / Math.sqrt(np * nt);
  // sign-flip corruption:
  const savedWc = Float32Array.from(jepa.Wc);
  for (const c of ranked) for (let i = 0; i < LAT * LAT; i++) jepa.Wc[c * LAT * LAT + i] = -jepa.Wc[c * LAT * LAT + i];
  const Lflip = probeLoss(jepa);
  // zeroing corruption (magnitude-destroying):
  jepa.Wc.set(savedWc);
  for (const c of ranked) for (let i = 0; i < LAT * LAT; i++) jepa.Wc[c * LAT * LAT + i] = 0;
  const Lzero = probeLoss(jepa);
  // jitter corruption (structured noise, +/-0.3):
  jepa.Wc.set(savedWc);
  const rnd = require('./core/world2.js').xorshift32(seedU32 ^ 0xD1A6);
  for (const c of ranked) for (let i = 0; i < LAT * LAT; i++) jepa.Wc[c * LAT * LAT + i] += (rnd() - 0.5) * 0.6;
  const Ljit = probeLoss(jepa);
  console.log(`D3 corruption on top-26 impact cells: pre=${L0.toFixed(5)} | sign-flip=${Lflip.toFixed(5)} (jump ${(Lflip / L0).toFixed(3)}) | zero=${Lzero.toFixed(5)} (jump ${(Lzero / L0).toFixed(2)}) | jitter±0.3=${Ljit.toFixed(5)} (jump ${(Ljit / L0).toFixed(2)})`);
  console.log(`   pred·tgt correlation on impact cells: ${corr.toFixed(4)} (|corr|≈0 => sign-flip leaves uncorrelated error unchanged; the round-2 R6 FAIL mechanism)`);
}
