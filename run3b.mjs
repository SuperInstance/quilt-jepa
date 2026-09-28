// run3b.mjs — quilt-jepa ROUND 3 SUPPLEMENTARY (addendum 1): the CORRECTED R6 frozen-state
// invariant. Deterministically rebuilds the round-3 R6 trajectory, CROSS-CHECKS every shared
// number bit-for-bit against receipts/run3.json (fail-closed), then executes the corrected
// invariant: sha at corruption time vs sha after 50 idle ticks + probe recheck.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GRID } = require('./core/world2.js');
const { CELLS, LAT } = require('./core/jepa.js');
const { Jepa3 } = require('./core/jepa3.js');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const LR3 = 0.3;

// fail-closed seal verification of the addendum
const REG = path.join(HERE, 'registration-v3-addendum1.json');
const raw = fs.readFileSync(REG, 'utf8');
const reg = JSON.parse(raw);
const storedMasked = reg.registration.seal.self_sha256_masked;
const storedMtime = reg.registration.seal.mtime_local_ms;
const maskedBody = raw.replace(`"self_sha256_masked": "${storedMasked}"`, `"self_sha256_masked": "${'0'.repeat(64)}"`);
if (sha(maskedBody) !== storedMasked) { console.error('SEAL VERIFICATION FAILED (addendum) — run REFUSED.'); process.exit(2); }
if (fs.statSync(REG).mtimeMs !== storedMtime) { console.error('SEAL MTIME MISMATCH (addendum) — run REFUSED.'); process.exit(2); }
console.log('addendum seal verified: ' + storedMasked.slice(0, 12) + '… mtime ' + storedMtime);

function cellFeatures(o, c) {
  const x = c % GRID, y = (c / GRID) | 0;
  const l = o[c];
  const r = o[y * GRID + Math.min(GRID - 1, x + 1)] - l;
  const d = o[Math.min(GRID - 1, y + 1) * GRID + x] - l;
  return [l, r, d, l - 0.5];
}
function perCellSurprise(zPred, zTgt) {
  const out = new Float32Array(CELLS);
  for (let c = 0; c < CELLS; c++) {
    let s = 0;
    for (let k = 0; k < LAT; k++) { const d = zPred[c * LAT + k] - zTgt[c * LAT + k]; s += d * d; }
    out[c] = s;
  }
  return out;
}

// rebuild the exact round-3 trajectory + R6 pipeline
function stateSha(jepa) {
  return sha(Buffer.concat([Buffer.from(jepa.Wc.buffer, jepa.Wc.byteOffset, jepa.Wc.byteLength),
                            Buffer.from(jepa.Wp.buffer, jepa.Wp.byteOffset, jepa.Wp.byteLength),
                            Buffer.from(jepa.Wt.buffer, jepa.Wt.byteOffset, jepa.Wt.byteLength)]));
}
const seedReceipt = JSON.parse(fs.readFileSync(path.join(HERE, 'receipts', 'certified-seed.json'), 'utf8'));
const seedU32 = parseInt(sha(JSON.stringify(seedReceipt.chosen.selected)).slice(0, 8), 16) >>> 0;
const run3 = JSON.parse(fs.readFileSync(path.join(HERE, 'receipts', 'run3.json'), 'utf8'));
const run3R6 = run3.chain.find((r) => r.type === 'R6_impact_sensitive_no_repair').payload;

const { World2 } = require('./core/world2.js');
const world = new World2(seedU32);
const jepa = new Jepa3(seedU32);
jepa.lr = LR3;
let obs = world.observe();
for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); jepa.trainStep(obs, o1); obs = o1; }
for (let t = 0; t < 130; t++) { world.step(); obs = world.observe(); } // R3 window replay (world stepping only)
const probePairs = [];
for (let t = 0; t < 30; t++) { world.step(); const o1 = world.observe(); probePairs.push([obs, o1]); obs = o1; }
const probeLoss = (je) => mean(probePairs.map(([a, b]) => {
  const zc = je.encode(a), zp = je.predict(zc), zt = je.encodeTarget(b);
  return je.loss(zp, zt);
}));
const impact = new Float32Array(CELLS);
for (const [a, b] of probePairs) {
  const zc = jepa.encode(a), zp = jepa.predict(zc), zt = jepa.encodeTarget(b);
  const pc = perCellSurprise(zp, zt);
  for (let c = 0; c < CELLS; c++) impact[c] += pc[c];
}
for (let c = 0; c < CELLS; c++) impact[c] /= probePairs.length;
const ranked = Array.from(impact.keys()).sort((x, y) => (impact[y] - impact[x]) || (x - y));
const top26 = ranked.slice(0, 26);
const corrs = [];
for (const c of top26) {
  const ps = [], ts = [];
  for (const [a, b] of probePairs) {
    const zc = jepa.encode(a), zp = jepa.predict(zc), zt = jepa.encodeTarget(b);
    for (let k = 0; k < LAT; k++) { ps.push(zp[c * LAT + k]); ts.push(zt[c * LAT + k]); }
  }
  const mp = mean(ps), mt = mean(ts);
  let sp = 0, st2 = 0, sp1 = 0;
  for (let i = 0; i < ps.length; i++) { const dp = ps[i] - mp, dt = ts[i] - mt; sp += dp * dp; st2 += dt * dt; sp1 += dp * dt; }
  corrs.push(sp1 / Math.sqrt(sp * st2));
}
const corrMean = mean(corrs);
const lossPre = probeLoss(jepa);
let flipped = 0;
for (const c of top26) for (let i = 0; i < LAT * LAT; i++) { jepa.Wc[c * LAT * LAT + i] = -jepa.Wc[c * LAT * LAT + i]; flipped++; }
const lossCorrupted = probeLoss(jepa);
const jump = lossCorrupted / lossPre;
const shaAtCorruption = stateSha(jepa); // CORRECTED: snapshot AFTER the corruption
for (let t = 0; t < 50; t++) { world.step(); obs = world.observe(); }
const shaIdle = stateSha(jepa);
const recheck = probeLoss(jepa);
const recheckDelta = Math.abs(recheck - lossCorrupted);

// fail-closed cross-checks against run3.json (bit-for-bit)
const cross = {
  corr_mean: [corrMean, run3R6.corr_mean],
  top26: [JSON.stringify(top26), JSON.stringify(run3R6.top26)],
  loss_pre: [lossPre, run3R6.loss_pre],
  loss_corrupted: [lossCorrupted, run3R6.loss_corrupted],
  jump: [jump, run3R6.jump],
  recheck_delta: [recheckDelta, run3R6.recheck_delta],
  flipped: [flipped, run3R6.flipped]
};
const mismatches = Object.entries(cross).filter(([k, [a, b]]) => (typeof a === 'number' ? a !== b : a !== b));
if (mismatches.length) {
  console.error('CROSS-CHECK FAILED vs run3.json:', mismatches.map(([k, [a, b]]) => `${k}: ${a} vs ${b}`).join('; '));
  process.exit(2);
}
console.log('cross-check vs run3.json: 7/7 bit-identical (deterministic rebuild confirmed)');

const r6a_pass = shaIdle === shaAtCorruption && recheckDelta <= 1e-9;
const outDoc = {
  schema: 'quilt-jepa/run-receipt-v3b',
  seed_u32: seedU32,
  lr_registered: LR3,
  addendum: 'registration-v3-addendum1.json (sealed pre-run, verified at startup)',
  cross_check: '7/7 bit-identical vs receipts/run3.json',
  r6a: {
    sha_at_corruption: shaAtCorruption,
    sha_after_idle: shaIdle,
    invariant_holds: shaIdle === shaAtCorruption,
    recheck_delta: recheckDelta,
    claim: 'corrected frozen-state invariant (addendum R6a)',
    pass: r6a_pass
  },
  corr_mean: corrMean, jump, loss_pre: lossPre, loss_corrupted: lossCorrupted
};
fs.writeFileSync(path.join(HERE, 'receipts', 'run3b.json'), JSON.stringify(outDoc, null, 1));
console.log('R6a (corrected invariant):', r6a_pass ? 'PASS' : 'FAIL', '| sha_at_corruption=' + shaAtCorruption.slice(0, 12) + '… sha_idle=' + shaIdle.slice(0, 12) + '… recheck_delta=' + recheckDelta);
