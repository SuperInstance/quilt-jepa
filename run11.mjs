// run11.mjs — quilt-jepa ROUND 11 (wave 66, lane 66-b → 66-b-r2): THE RE-PRICING ROUND. Executes the
// sealed registration-v11.json under the spend discipline of record: this is a re-pricing round —
// CARRIER11 and DIP11 score EXISTING receipt data (receipts/run10.json) with ZERO new compute, and
// exactly ONE fresh deterministic double execution is priced (the SAT11 fifth switch). The
// round-4..10 operating point is UNCHANGED (lr 0.3, tau 0.99998, K4 1.5e-6, amp 0.9, same certified
// seed derivation; core/ byte-untouched). THREE new claims scored:
//   CARRIER11 — THE ORDERING-CARRIER RE-PRICING BATTERY on the receipted DOSE10 ladder (zero new
//               compute): three statistics (S1 pooled Spearman per carrier — the wc baseline MUST
//               re-derive 0.9151515151515152 bit-exact; S2 per-depth dose-gap sign series scored
//               against the Delta sign series with the NECESSARY-CONDITION TEST: a single-signed
//               carrier gap cannot carry a crossing ordering; S3 rank-inversion count as summary
//               companion) applied to FIVE carriers (wc baseline, first10, last10, first10/wc,
//               last10/wc). Winner rule of record registered before re-scoring.
//   SAT11     — THE FIFTH SWITCH on BOTH cascades: the increment curve priced BEFORE the confirm
//               run (inc2 0.023847938746616615 -> inc3 0.0003327380566972016 -> inc4
//               0.016733193739495222; washout threshold of record 1 - rho20_4 =
//               0.027920190716289595, only 1.6685512132922835x inc4). The confirm run reproduces
//               both arms' 20000-step prefixes ARITHMETICALLY IDENTICALLY (per-step arithmetic is
//               prefix-invariant; T = 20000 truncation of the receipted 5e5/1e5 arms), re-binds
//               FORTY receipted anchor legs bit-exactly fail-closed, then measures the ONLY new
//               quantity: stage-5, a 400-step window on World2(seedF = 3820734621, derivation
//               sha256(selJson + '|round11-worldF'), no new entropy), no weight reset, from each
//               cascade's end-4 state, both arms at their own dose. ABSORBED (inc5 <= inc4,
//               rho20_5 in [rho20_4, 1)) is the registered PASS branch; WASHOUT /
//               EXPANDING-BUT-ABSORBED / DEGRADATION / E-WASHOUT / composition are the priced
//               FAILs; the structurally void branch is registered (inc5 <= inc4 with rho20_5 >= 1
//               is arithmetically impossible: rho20_5 <= rho20_4 + inc4 = 0.9888130030232056 < 1).
//               The core runs TWICE (twin law) — metric shas must be equal.
//   DIP11     — THE FRAGMENTED W-DOMAIN RE-REGISTERED AS ISLANDS-OF-SURVIVAL on the existing
//               receipt data (zero new compute): F = island-L [0.55, 0.65] ∪ island-H [0.95, 1.1]
//               at the receipted resolution incl. the 1x anchor interior to island-H; gate set
//               G = {0.55, 0.6} ∪ {1.0, 1.1}; Q1-Q5 pre-registered (exact TRUE-set, FALSE strictly
//               outside, full-axis flips exactly 3, exact gate set, birth/death UNCHANGED 0.55/1.1).
// THE TWENTY-EIGHT round-10 claims carry BY REFERENCE (L16 receipt-of-record-first): the run10.json
// hash chain is re-derived from GENESIS row-by-row at startup (fail-closed, tip cca59bd5…), the 28
// receipted verdict booleans are read verbatim, and NO carried claim is re-executed, re-measured,
// or revised. The R4 determinism crown (ten rounds deep) is PRESERVED, not extended: its deepest
// binding remains run10.json's R4 row (8a3daa00… twins); round 11 adds a NEW twin proof at the
// round-11 layer only.
// FAIL-CLOSED: the run re-verifies the registration-v11 seal (masked sha 24d9bc3b… + mtime
// 1791200000000) at startup and refuses otherwise. Any anchor mismatch, chain mismatch, seed
// mismatch, or twin-sha mismatch refuses the run (exit 2) BEFORE the receipt write — a refused run
// receipts nothing and the round is void_as_gated.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { World } = require('./core/world.js');
const { World2 } = require('./core/world2.js');
const { Jepa4 } = require('./core/jepa4.js');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RECEIPTS = path.join(HERE, 'receipts');
fs.mkdirSync(RECEIPTS, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const GENESIS = 'JEPA-GENESIS-1';
class Chain {
  constructor() { this.rows = []; this.prev = GENESIS; }
  add(type, payload) {
    const id = `${type}#${this.rows.length}`;
    const body = JSON.stringify({ i: this.rows.length, id, type, payload });
    const h = sha(`${this.prev}:${body}:${id}`);
    this.rows.push({ i: this.rows.length, id, type, payload, prev: this.prev, sha: h });
    this.prev = h;
    return h;
  }
  tip() { return this.prev; }
}
function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
const LR3 = 0.3;      // registered lr (carried)
const TAU4 = 0.99998; // registered round-4 tau (carried)
const K4 = 1.5e-6;    // registered pace-law constant (carried)
const AMP0 = 0.9;     // registered anchor amplitude (carried)
// round-6 registered constants (carried context; the arms' doses)
const WD_MAIN = 3e-4; // registered longevity main dose (the decayed arm's own dose)
// round-7 registered constants (carried)
const PLAST_STEPS = 400; // the switch readout window (stages 1-5 all 400 steps)
// round-10 receipted constants (carried context)
const R10_LADDER = [20000, 30000, 40000, 50000, 75000]; // the receipted DOSE10 depth ladder
// round-11 registered constants (registration-v11)
const R11_SEEDF_SUFFIX = '|round11-worldF'; // seedF derivation suffix (registered; no new entropy)
const R11_PREFIX_T = 20000; // the receipted arms' 20k prefixes (per-step arithmetic prefix-invariant)
const R11_SEEDF_REGISTERED = 3820734621; // registration-v11 seedF (fail-closed)
const R11_WASHOUT_THRESHOLD_REGISTERED = 0.027920190716289595; // 1 - rho20_4 (fail-closed re-derivation)
const R11_THRESHOLD_OVER_INC4_REGISTERED = 1.6685512132922835; // receipted finding
const R11_GEOMETRIC_INC5_REGISTERED = 0.8415020977846475; // inc4*(inc4/inc3) — receipted finding
const R11_VOID_BOUND_REGISTERED = 0.9888130030232056; // rho20_4 + inc4 (registered void-branch bound)

// ---------- fail-closed registration seal verification ----------
const REG = path.join(HERE, 'registration-v11.json');
const raw = fs.readFileSync(REG, 'utf8');
const reg = JSON.parse(raw);
const storedMasked = reg.registration.seal.self_sha256_masked;
const storedMtime = reg.registration.seal.mtime_local_ms;
const maskedBody = raw.replace(`"self_sha256_masked": "${storedMasked}"`, `"self_sha256_masked": "${'0'.repeat(64)}"`);
const recomputed = sha(maskedBody);
const st = fs.statSync(REG);
if (recomputed !== storedMasked) {
  console.error('SEAL VERIFICATION FAILED: masked sha mismatch — run REFUSED (fail-closed). stored=' + storedMasked.slice(0, 12) + ' recomputed=' + recomputed.slice(0, 12));
  process.exit(2);
}
if (st.mtimeMs !== storedMtime) {
  console.error('SEAL VERIFICATION FAILED: mtime ' + st.mtimeMs + ' != sealed ' + storedMtime + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
console.log('seal verified: registration-v11 masked sha ' + storedMasked.slice(0, 12) + '… mtime ' + storedMtime);

// ---------- fail-closed run10 receipt-of-record verification (carried claims by reference) ----
const RUN10_SHA_REGISTERED = '13947bd5ea2c846b8fa796b3b1ec0ee22ca1064ac851d164d3b0b2c5d1f07da6'; // receipted in registration-v11
const RUN10_TIP_REGISTERED = 'cca59bd5ed1078406167d3c51b697eb467c8f37da1c1a3b64be2fc21f21740a3'; // receipted in registration-v11
const run10Path = path.join(RECEIPTS, 'run10.json');
const run10Raw = fs.readFileSync(run10Path, 'utf8');
const run10FileSha = sha(run10Raw);
if (run10FileSha !== RUN10_SHA_REGISTERED) {
  console.error('RUN10 RECEIPT VERIFICATION FAILED: file sha256 ' + run10FileSha + ' != registered ' + RUN10_SHA_REGISTERED + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
const run10 = JSON.parse(run10Raw);
// hash chain re-derived from GENESIS row-by-row: sha256(prev : JSON.stringify({i,id,type,payload}) : id)
{
  let prev = GENESIS;
  for (const row of run10.chain) {
    const body = JSON.stringify({ i: row.i, id: row.id, type: row.type, payload: row.payload });
    const h = sha(`${prev}:${body}:${row.id}`);
    if (row.prev !== prev) {
      console.error('RUN10 CHAIN VERIFICATION FAILED: prev mismatch at row ' + row.i + ' (' + row.type + ') — run REFUSED (fail-closed).');
      process.exit(2);
    }
    if (h !== row.sha) {
      console.error('RUN10 CHAIN VERIFICATION FAILED: sha mismatch at row ' + row.i + ' (' + row.type + ') — run REFUSED (fail-closed).');
      process.exit(2);
    }
    prev = row.sha;
  }
  if (prev !== run10.tip || run10.tip !== RUN10_TIP_REGISTERED) {
    console.error('RUN10 CHAIN VERIFICATION FAILED: tip ' + prev + ' != registered ' + RUN10_TIP_REGISTERED + ' — run REFUSED (fail-closed).');
    process.exit(2);
  }
}
console.log('run10 receipt verified: file sha ' + run10FileSha.slice(0, 12) + '… chain re-derived from genesis, tip ' + run10.tip.slice(0, 12) + '… (' + run10.chain.length + ' rows)');
// the 28 receipted round-10 verdict booleans read VERBATIM (carried claims: re-scored NOTHING)
const carried10 = run10.verdicts;
const carriedKeys = Object.keys(carried10);
if (carriedKeys.length !== 28 || run10.claims_total !== 28) {
  console.error('RUN10 VERDICT VERIFICATION FAILED: expected 28 receipted claims, found ' + carriedKeys.length + '/' + run10.claims_total + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
const carriedTrue = carriedKeys.filter((k) => carried10[k] === true).length;
if (carriedTrue !== run10.claims_passed) {
  console.error('RUN10 VERDICT VERIFICATION FAILED: claims_passed ' + run10.claims_passed + ' != counted true ' + carriedTrue + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
console.log('round-10 verdicts carried by reference: 28 claims, ' + carriedTrue + ' true (read verbatim; zero re-execution)');

// ---------- fail-closed seed + operating-point re-binding ----------
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;
const seedB = parseInt(sha(selJson + '|round8-worldB').slice(0, 8), 16) >>> 0;
const seedC = parseInt(sha(selJson + '|round9-worldC').slice(0, 8), 16) >>> 0;
const seedD = parseInt(sha(selJson + '|round10-worldD').slice(0, 8), 16) >>> 0;
const seedE = parseInt(sha(selJson + '|round10-worldE').slice(0, 8), 16) >>> 0;
const seedF = parseInt(sha(selJson + R11_SEEDF_SUFFIX).slice(0, 8), 16) >>> 0;
const seedBind = [
  ['seedU32', seedU32, run10.seed_u32], ['seedB', seedB, run10.seed_b], ['seedC', seedC, run10.seed_c],
  ['seedD', seedD, run10.seed_d], ['seedE', seedE, run10.seed_e], ['seedF', seedF, R11_SEEDF_REGISTERED]
];
for (const [name, v, bound] of seedBind) {
  if (v !== bound) {
    console.error('SEED RE-BIND FAILED: ' + name + ' ' + v + ' != receipted/registered ' + bound + ' — run REFUSED (fail-closed).');
    process.exit(2);
  }
}
console.log('seeds re-bound: U32 ' + seedU32 + ', B ' + seedB + ', C ' + seedC + ', D ' + seedD + ', E ' + seedE + ' (vs run10) | F ' + seedF + ' (vs registration-v11: ' + R11_SEEDF_SUFFIX + ')');
for (const [name, v, bound] of [['lr', run10.lr_registered, LR3], ['tau', run10.tau_registered, TAU4], ['K4', run10.K4_registered, K4], ['amp', run10.amp_registered, AMP0]]) {
  if (v !== bound) {
    console.error('OPERATING POINT RE-BIND FAILED: ' + name + ' ' + v + ' != registered ' + bound + ' — run REFUSED (fail-closed).');
    process.exit(2);
  }
}

// ---------- shared helpers (carried blocks VERBATIM from run10.mjs — the receipted arithmetic) --
const norm64 = (W) => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i] * W[i]; return Math.sqrt(s); };
const weightSha = (je) => sha(Buffer.concat([Buffer.from(je.Wc.buffer, je.Wc.byteOffset, je.Wc.byteLength),
                                             Buffer.from(je.Wp.buffer, je.Wp.byteOffset, je.Wp.byteLength),
                                             Buffer.from(je.Wt.buffer, je.Wt.byteOffset, je.Wt.byteLength)]));
// spearman (carried VERBATIM from run10.mjs — average ranks on ties, the receipted statistic)
function spearmanRanks(xs, ys) {
  const n = xs.length;
  if (n !== ys.length || n === 0) return NaN;
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    const r = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1; // average rank over the tie block (1-based)
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs), ry = rank(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = rx[i] - mx, b = ry[i] - my; num += a * b; dx += a * a; dy += b * b; }
  return num / Math.sqrt(dx * dy);
}
// kendallDiscord (ROUND 11): the S3 rank-inversion count — discordant pairs between the
// carrier-gap depth-ranking and the Delta depth-ranking (the same rank() law as spearmanRanks)
function kendallDiscord(gap, delta) {
  const n = gap.length;
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    const r = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rg = rank(gap), rd = rank(delta);
  let disc = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.sign(rg[i] - rg[j]) !== Math.sign(rd[i] - rd[j])) disc++;
  return disc;
}

// horizonRun5 — carried VERBATIM from run10.mjs (the receipted arm-training arithmetic; the
// per-step loop is prefix-invariant, so a T = 20000 truncation reproduces the receipted arms'
// 20000-step prefixes bit-exactly — bound in-run against FORTY receipted anchors, fail-closed)
function horizonRun5(WorldCls, seedU32, lr, tau, wd, T, stopRule, ckpts, captureAt) {
  const world = new WorldCls(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const wt0 = Float32Array.from(jepa.Wt);
  const wc0 = Float32Array.from(jepa.Wc);
  const losses = [];
  const checkpoints = {};
  for (const k of ckpts) checkpoints[String(k)] = null;
  const captureSet = new Set(captureAt);
  const snapshots = {};
  const ringWt = []; const ringWc = []; const ringWp = [];
  let D = -1, executedTo = 0;
  let allNanStep = -1, weightsAbsorbing = true, lossFiniteAgain = 0;
  let obs = world.observe();
  const limit = stopRule === 'registered' ? T : Math.min(T, CONTRAST_CAP);
  const postDWindow = stopRule === 'registered' ? 2000 : 0;
  const weightState = () => {
    let anyFin = false;
    for (const W of [jepa.Wc, jepa.Wp, jepa.Wt]) {
      for (let i = 0; i < W.length; i++) { if (Number.isFinite(W[i])) { anyFin = true; break; } }
      if (anyFin) break;
    }
    return { anyFin };
  };
  for (let t = 1; t <= limit; t++) {
    world.step();
    const o1 = world.observe();
    const L = jepa.trainStep(obs, o1);
    obs = o1;
    losses.push(L);
    executedTo = t;
    if (Number.isFinite(L)) {
      if (D > 0) lossFiniteAgain++;
      else {
        ringWt.push(Float32Array.from(jepa.Wt)); ringWc.push(Float32Array.from(jepa.Wc)); ringWp.push(Float32Array.from(jepa.Wp));
        if (ringWt.length > 201) { ringWt.shift(); ringWc.shift(); ringWp.shift(); }
        if (ckpts.includes(t)) {
          checkpoints[String(t)] = {
            wt_move_rel: relDisp(jepa.Wt, wt0), wc_move_rel: relDisp(jepa.Wc, wc0),
            wt_norm: norm64(jepa.Wt), wc_norm: norm64(jepa.Wc), wp_norm: norm64(jepa.Wp),
            loss_mean_500: mean(losses.slice(Math.max(0, t - 500), t))
          };
        }
        if (captureSet.has(t)) {
          snapshots[String(t)] = { Wc: Float32Array.from(jepa.Wc), Wp: Float32Array.from(jepa.Wp), Wt: Float32Array.from(jepa.Wt) };
        }
      }
    } else if (D < 0) {
      D = t;
      if (stopRule !== 'registered') break;
    }
    if (D > 0 && t > D && t <= D + postDWindow) {
      const ws = weightState();
      if (!ws.anyFin) { if (allNanStep < 0) allNanStep = t; }
      else if (allNanStep > 0) weightsAbsorbing = false;
      if (t >= D + postDWindow) break;
    }
  }
  const finOrNull = (x) => (Number.isFinite(x) ? x : null);
  const finite = losses.filter(Number.isFinite);
  const out = {
    lr, tau, wd, world: WorldCls === World ? 'trivial' : 'world2',
    T_registered: T, stop_rule: stopRule, cap: stopRule === 'registered' ? null : CONTRAST_CAP,
    executed_to: executedTo,
    D: D > 0 ? D : null, diverged: D > 0,
    D_mod80: D > 0 ? D % 80 : null,
    all_weights_nan_step: D > 0 ? (allNanStep > 0 ? allNanStep : null) : null,
    weights_all_nan_at_end: D > 0 ? !weightState().anyFin : null,
    weights_nan_absorbing: D > 0 ? (allNanStep > 0 && weightsAbsorbing) : null,
    loss_finite_again_count: D > 0 ? lossFiniteAgain : null,
    first10: mean(losses.slice(0, 10)),
    last_finite10_tail: finite.length >= 10 ? mean(finite.slice(-10)) : null,
    loss_ratio_finite_tail: finite.length >= 10 ? mean(finite.slice(-10)) / mean(losses.slice(0, 10)) : null,
    loss_ratio_at_20000: finite.length >= 20000 ? mean(finite.slice(19990, 20000)) / mean(losses.slice(0, 10)) : null,
    checkpoints,
    captured_at: Object.keys(snapshots).map(Number),
    snapshots,
    drift_last200: null, wc_norm_at_last_finite: null, wp_norm_at_last_finite: null,
    blowup_rate_last200: null
  };
  if (D > 201 && ringWt.length === 201) {
    const a = ringWt[0], b = ringWt[200];
    let drift = 0, n2 = 0;
    for (let i = 0; i < a.length; i++) { const d = b[i] - a[i]; drift += d * d; n2 += b[i] * b[i]; }
    out.drift_last200 = finOrNull(Math.sqrt(drift) / Math.sqrt(n2));
    const wa = ringWc[0], wb = ringWc[200];
    out.blowup_rate_last200 = finOrNull(Math.log(norm64(wb) / norm64(wa)) / 200);
    out.wc_norm_at_last_finite = finOrNull(norm64(ringWc[200]));
    out.wp_norm_at_last_finite = finOrNull(norm64(ringWp[200]));
  }
  return out;
}
const relDisp = (W, W0) => { let d = 0, n = 0; for (let i = 0; i < W.length; i++) { const dd = W[i] - W0[i]; d += dd * dd; n += W[i] * W[i]; } return Math.sqrt(d) / Math.sqrt(n); };
const CONTRAST_CAP = 100000; // carried (registered round-6 contrast cap — bounds the 'contrast' stop rule)

// trivialSwitchProbe5 (ROUND 11 — runner-level addition per registration-v11): stages 1..4 are
// ARITHMETIC-IDENTICAL to the carried trivialSwitchProbe4 (same worlds, same weights, same
// 400-step windows — the stage-1 world parameterized 'trivial' | 'world2' exactly as probe4); it
// adds the FIFTH switch: a fresh World2(seedF) from its own t=0, 400 steps, continuing from the
// end state of stage 4 with NO weight reset between stages. Per-stage end-weight capture.
function trivialSwitchProbe5(seedU32, seedB, seedC, seedD, seedF, lr, tau, wd, snap, steps, stage1World, stage1Seed) {
  const world1 = stage1World === 'world2' ? new World2(stage1Seed) : new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  jepa.Wc.set(snap.Wc); jepa.Wp.set(snap.Wp); jepa.Wt.set(snap.Wt);
  const normNow = () => ({ wc_norm: norm64(jepa.Wc), wp_norm: norm64(jepa.Wp), wt_norm: norm64(jepa.Wt) });
  const losses1 = [];
  let obs = world1.observe();
  for (let t = 0; t < steps; t++) { world1.step(); const o1 = world1.observe(); losses1.push(jepa.trainStep(obs, o1)); obs = o1; }
  const end1 = { sha: weightSha(jepa), norms: normNow() };
  const world2 = new World2(seedB);
  const losses2 = [];
  obs = world2.observe();
  for (let t = 0; t < steps; t++) { world2.step(); const o1 = world2.observe(); losses2.push(jepa.trainStep(obs, o1)); obs = o1; }
  const end2 = { sha: weightSha(jepa), norms: normNow() };
  const world3 = new World2(seedC);
  const losses3 = [];
  obs = world3.observe();
  for (let t = 0; t < steps; t++) { world3.step(); const o1 = world3.observe(); losses3.push(jepa.trainStep(obs, o1)); obs = o1; }
  const end3 = { sha: weightSha(jepa), norms: normNow() };
  const world4 = new World2(seedD);
  const losses4 = [];
  obs = world4.observe();
  for (let t = 0; t < steps; t++) { world4.step(); const o1 = world4.observe(); losses4.push(jepa.trainStep(obs, o1)); obs = o1; }
  const end4 = { sha: weightSha(jepa), norms: normNow() };
  const world5 = new World2(seedF);
  const losses5 = [];
  obs = world5.observe();
  for (let t = 0; t < steps; t++) { world5.step(); const o1 = world5.observe(); losses5.push(jepa.trainStep(obs, o1)); obs = o1; }
  const end5 = { sha: weightSha(jepa), norms: normNow() };
  return {
    ratio1: mean(losses1.slice(-10)) / mean(losses1.slice(0, 10)),
    first10_1: mean(losses1.slice(0, 10)), last10_1: mean(losses1.slice(-10)),
    ratio2: mean(losses2.slice(-10)) / mean(losses2.slice(0, 10)),
    first10_2: mean(losses2.slice(0, 10)), last10_2: mean(losses2.slice(-10)),
    ratio3: mean(losses3.slice(-10)) / mean(losses3.slice(0, 10)),
    first10_3: mean(losses3.slice(0, 10)), last10_3: mean(losses3.slice(-10)),
    ratio4: mean(losses4.slice(-10)) / mean(losses4.slice(0, 10)),
    first10_4: mean(losses4.slice(0, 10)), last10_4: mean(losses4.slice(-10)),
    ratio5: mean(losses5.slice(-10)) / mean(losses5.slice(0, 10)),
    first10_5: mean(losses5.slice(0, 10)), last10_5: mean(losses5.slice(-10)),
    end1, end2, end3, end4, end5
  };
}

// ---------- receipted run10 metrics re-bound (the SAT11 FORTY anchor legs + the claim constants)
const m6 = run10.metrics_round6, m8 = run10.metrics_round8, m9 = run10.metrics_round9, m10 = run10.metrics_round10;
// the increment curve of record (receipted; re-bound bit-exact)
const curve = {
  rho20_1: m8.r8_rho20_1, rho20_2: m8.r8_rho20_2, rho20_3: m9.r9_rho20_3, rho20_4: m10.r10_rho20_4,
  rho20_4_E: m10.r10_rho20_4_E,
  inc2: m9.r9_inc2, inc3: m9.r9_inc3, inc4: m10.r10_inc4
};
const curveBind = [
  ['rho20_1', curve.rho20_1, 0.9311659387409014], ['rho20_2', curve.rho20_2, 0.955013877487518],
  ['rho20_3', curve.rho20_3, 0.9553466155442152], ['rho20_4', curve.rho20_4, 0.9720798092837104],
  ['rho20_4_E', curve.rho20_4_E, 0.9815072297359018],
  ['inc2', curve.inc2, 0.023847938746616615], ['inc3', curve.inc3, 0.0003327380566972016],
  ['inc4', curve.inc4, 0.016733193739495222]
];
for (const [name, v, bound] of curveBind) {
  if (v !== bound) {
    console.error('CURVE RE-BIND FAILED: ' + name + ' ' + v + ' != receipted/registered ' + bound + ' — run REFUSED (fail-closed).');
    process.exit(2);
  }
}
const washoutThreshold = 1 - curve.rho20_4; // the washout threshold of record
if (washoutThreshold !== R11_WASHOUT_THRESHOLD_REGISTERED) {
  console.error('WASHOUT THRESHOLD RE-BIND FAILED: 1 - rho20_4 = ' + washoutThreshold + ' != registered ' + R11_WASHOUT_THRESHOLD_REGISTERED + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
const thresholdOverInc4 = washoutThreshold / curve.inc4; // receipted finding: only 1.6686x inc4
const geometricInc5 = curve.inc4 * (curve.inc4 / curve.inc3); // geometric continuation (receipted finding)
const secularBand = [curve.inc4, curve.inc2]; // secular continuation band [inc4, inc2] (receipted finding)
const secularCap = curve.rho20_4 + curve.inc2; // absorbed-band cap (receipted finding)
const voidBound = curve.rho20_4 + curve.inc4; // the structurally-void branch bound (registered)
if (thresholdOverInc4 !== R11_THRESHOLD_OVER_INC4_REGISTERED) {
  console.error('THRESHOLD/INC4 RE-BIND FAILED: ' + thresholdOverInc4 + ' != receipted ' + R11_THRESHOLD_OVER_INC4_REGISTERED + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
if (geometricInc5 !== R11_GEOMETRIC_INC5_REGISTERED) {
  console.error('GEOMETRIC INC5 RE-BIND FAILED: ' + geometricInc5 + ' != receipted ' + R11_GEOMETRIC_INC5_REGISTERED + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
if (voidBound !== R11_VOID_BOUND_REGISTERED) {
  console.error('VOID BOUND RE-BIND FAILED: ' + voidBound + ' != registered ' + R11_VOID_BOUND_REGISTERED + ' — run REFUSED (fail-closed).');
  process.exit(2);
}
console.log('increment curve re-bound: rho20_1 ' + curve.rho20_1 + ' -> rho20_4 ' + curve.rho20_4 + ' | inc4 ' + curve.inc4 + ' | washout threshold 1-rho20_4 = ' + washoutThreshold + ' (' + thresholdOverInc4 + 'x inc4) | geometric inc5 ' + geometricInc5 + ' | void bound ' + voidBound);
if (secularCap !== 0.9959277480303262) {
  // the registration receipts the absorbed-band cap as a FINDING (gates nothing); the last-ulp
  // delta between the sealed display value and the runtime float order is disclosed, not patched.
  console.log('note (disclosed, gates nothing): absorbed-band cap runtime ' + secularCap + ' vs sealed display 0.9959277480303262 — last-ulp derivation-order artifact; band bound < 1 either way');
}

// the FORTY receipted SAT11 anchor legs (registration-v11 claim text; fail-closed bit-exact bind)
const ANCHOR_DEFS = [
  // prefix anchors (the receipted arms' 20k prefixes)
  ['main_prefix_first10', () => m6.rlong_first10_main, 'main-arm first10 (receipted 20k prefix)'],
  ['main_prefix_wc_20000', () => m6.rlong_main_wc_20000, 'main 20k checkpoint |Wc|'],
  ['main_prefix_wp_20000', () => m6.rlong_main_wp_20000, 'main 20k checkpoint |Wp|'],
  ['ctrl_prefix_first10', () => m6.rlong_first10_wd0, 'control-arm first10 (receipted 20k prefix)'],
  // D-cascade (trivial -> seedB -> seedC -> seedD), stage ratios 1-4, both arms
  ['dc_stage1_decayed', () => m10.r10_dc_stage1_decayed, 'D-cascade stage-1 ratio, decayed arm'],
  ['dc_stage2_decayed', () => m10.r10_dc_stage2_decayed, 'D-cascade stage-2 ratio, decayed arm'],
  ['dc_stage3_decayed', () => m10.r10_dc_stage3_decayed, 'D-cascade stage-3 ratio, decayed arm'],
  ['dc_stage4_decayed', () => m10.r10_dc_ratio4_decayed, 'D-cascade stage-4 ratio, decayed arm'],
  ['dc_stage1_control', () => m10.r10_dc_stage1_control, 'D-cascade stage-1 ratio, control arm'],
  ['dc_stage2_control', () => m10.r10_dc_stage2_control, 'D-cascade stage-2 ratio, control arm'],
  ['dc_stage3_control', () => m10.r10_dc_stage3_control, 'D-cascade stage-3 ratio, control arm'],
  ['dc_stage4_control', () => m10.r10_dc_ratio4_control, 'D-cascade stage-4 ratio, control arm'],
  // D-cascade end-1 weight shas (the round-8/9/10 chain values)
  ['dc_end1_sha_decayed', () => m10.r10_dc_end1_sha_decayed, 'D-cascade end-1 weight sha, decayed arm'],
  ['dc_end1_sha_control', () => m10.r10_dc_end1_sha_control, 'D-cascade end-1 weight sha, control arm'],
  // D-cascade end-2/3/4 |Wc| norms, both arms
  ['dc_end2_wc_decayed', () => m10.r10_dc_end2_wc_decayed, 'D-cascade end-2 |Wc|, decayed arm'],
  ['dc_end2_wc_control', () => m10.r10_dc_end2_wc_control, 'D-cascade end-2 |Wc|, control arm'],
  ['dc_end3_wc_decayed', () => m10.r10_dc_end3_wc_decayed, 'D-cascade end-3 |Wc|, decayed arm'],
  ['dc_end3_wc_control', () => m10.r10_dc_end3_wc_control, 'D-cascade end-3 |Wc|, control arm'],
  ['dc_end4_wc_decayed', () => m10.r10_dc_end4_wc_decayed, 'D-cascade end-4 |Wc|, decayed arm'],
  ['dc_end4_wc_control', () => m10.r10_dc_end4_wc_control, 'D-cascade end-4 |Wc|, control arm'],
  // D-cascade stage-4 first10/last10, both arms
  ['dc_stage4_first10_decayed', () => m10.r10_dc_first10_4_decayed, 'D-cascade stage-4 first10, decayed arm'],
  ['dc_stage4_last10_decayed', () => m10.r10_dc_last10_4_decayed, 'D-cascade stage-4 last10, decayed arm'],
  ['dc_stage4_first10_control', () => m10.r10_dc_first10_4_control, 'D-cascade stage-4 first10, control arm'],
  ['dc_stage4_last10_control', () => m10.r10_dc_last10_4_control, 'D-cascade stage-4 last10, control arm'],
  // E-cascade (World2(seedE) -> seedB -> seedC -> seedD), stage ratios 1-4, both arms
  ['ec_stage1_decayed', () => m10.r10_ec_stage1_decayed, 'E-cascade stage-1 ratio, decayed arm'],
  ['ec_stage2_decayed', () => m10.r10_ec_stage2_decayed, 'E-cascade stage-2 ratio, decayed arm'],
  ['ec_stage3_decayed', () => m10.r10_ec_stage3_decayed, 'E-cascade stage-3 ratio, decayed arm'],
  ['ec_stage4_decayed', () => m10.r10_ec_stage4_decayed, 'E-cascade stage-4 ratio, decayed arm'],
  ['ec_stage1_control', () => m10.r10_ec_stage1_control, 'E-cascade stage-1 ratio, control arm'],
  ['ec_stage2_control', () => m10.r10_ec_stage2_control, 'E-cascade stage-2 ratio, control arm'],
  ['ec_stage3_control', () => m10.r10_ec_stage3_control, 'E-cascade stage-3 ratio, control arm'],
  ['ec_stage4_control', () => m10.r10_ec_stage4_control, 'E-cascade stage-4 ratio, control arm'],
  // E-cascade control stage-1 first10/last10
  ['ec_stage1_first10_control', () => m10.r10_ec_first10_1_control, 'E-cascade stage-1 first10, control arm'],
  ['ec_stage1_last10_control', () => m10.r10_ec_last10_1_control, 'E-cascade stage-1 last10, control arm'],
  // E-cascade stage-4 first10/last10, both arms
  ['ec_stage4_first10_decayed', () => m10.r10_ec_first10_4_decayed, 'E-cascade stage-4 first10, decayed arm'],
  ['ec_stage4_last10_decayed', () => m10.r10_ec_last10_4_decayed, 'E-cascade stage-4 last10, decayed arm'],
  ['ec_stage4_first10_control', () => m10.r10_ec_first10_4_control, 'E-cascade stage-4 first10, control arm'],
  ['ec_stage4_last10_control', () => m10.r10_ec_last10_4_control, 'E-cascade stage-4 last10, control arm'],
  // E-cascade end-4 |Wc| norms, both arms
  ['ec_end4_wc_decayed', () => m10.r10_ec_end4_wc_decayed, 'E-cascade end-4 |Wc|, decayed arm'],
  ['ec_end4_wc_control', () => m10.r10_ec_end4_wc_control, 'E-cascade end-4 |Wc|, control arm']
];
const RECEIPTED_ANCHORS = ANCHOR_DEFS.map(([leg, get, note]) => {
  const v = get();
  if (v === undefined || v === null || !Number.isFinite(v)) {
    if (typeof v !== 'string') {
      console.error('ANCHOR EXTRACTION FAILED: ' + leg + ' missing from run10.json — run REFUSED (fail-closed).');
      process.exit(2);
    }
  }
  return { leg, receipted: v, note };
});
if (RECEIPTED_ANCHORS.length !== 40) {
  console.error('ANCHOR COUNT FAILED: ' + RECEIPTED_ANCHORS.length + ' != FORTY enumerated legs — run REFUSED (fail-closed).');
  process.exit(2);
}
console.log('SAT11 anchor legs extracted from run10.json: ' + RECEIPTED_ANCHORS.length + ' (FORTY; the registration-v11 verdict_rule sentence retains the stale pre-correction THIRTY-SEVEN label — the enumeration itself is unchanged and complete at FORTY, disclosed pre-run in commit b69cf7f)');

// ---------- CARRIER11: the ordering-carrier re-pricing battery (ZERO new compute) -------------
// All inputs are receipted run10.json DOSE10 ladder values; the battery re-derives them.
function carrierBattery() {
  const cells = { ratio: [], wc: [], first10: [], last10: [] };
  for (const d of R10_LADDER) {
    cells.ratio.push(m10['r10_ratio_2e4_' + d], m10['r10_ratio_3e4_' + d]);
    cells.wc.push(m10['r10_wc_2e4_' + d], m10['r10_wc_3e4_' + d]);
    cells.first10.push(m10['r10_first10_2e4_' + d], m10['r10_first10_3e4_' + d]);
    cells.last10.push(m10['r10_last10_2e4_' + d], m10['r10_last10_3e4_' + d]);
  }
  // battery validity: the receipted Delta series re-derives bit-exact from the receipted ratios
  const deltas = R10_LADDER.map((d) => m10['r10_ratio_2e4_' + d] - m10['r10_ratio_3e4_' + d]);
  const deltaRebind = R10_LADDER.map((d, i) => deltas[i] === m10['r10_delta_' + d]);
  const deltaBitExact = deltaRebind.every(Boolean);
  const crossings = (() => { let c = 0; for (let i = 1; i < deltas.length; i++) if ((deltas[i] > 0) !== (deltas[i - 1] > 0)) c++; return c; })();
  const dstar = (() => { for (let i = 0; i < R10_LADDER.length; i++) if (deltas[i] < 0) return R10_LADDER[i]; return null; })();
  const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const deltaSigns = deltas.map(sign);
  const carriers = {
    'wc': cells.wc,
    'first10': cells.first10,
    'last10': cells.last10,
    'first10/wc': cells.first10.map((v, i) => v / cells.wc[i]),
    'last10/wc': cells.last10.map((v, i) => v / cells.wc[i])
  };
  const battery = {};
  for (const [name, vals] of Object.entries(carriers)) {
    const s1 = spearmanRanks(vals, cells.ratio);
    const gap = R10_LADDER.map((d, i) => vals[2 * i] - vals[2 * i + 1]); // gap_X(d) = X(2e-4, d) - X(3e-4, d)
    const gapSigns = gap.map(sign);
    const agreement = gapSigns.filter((s, i) => s === deltaSigns[i]).length; // S2 agreement count A
    const discord = kendallDiscord(gap, deltas); // S3 rank-inversion count
    const flipSites = [];
    for (let i = 1; i < R10_LADDER.length; i++) if (gapSigns[i] !== gapSigns[i - 1]) flipSites.push(R10_LADDER[i - 1] + '->' + R10_LADDER[i]);
    const singleSigned = new Set(gapSigns).size === 1;
    battery[name] = {
      s1_pooled_spearman: s1,
      gap_series: gap, gap_signs: gapSigns,
      s2_agreement_count: agreement,
      s3_rank_inversions: discord,
      single_signed: singleSigned,
      single_signed_positive: singleSigned && gapSigns[0] === 1,
      flip_sites: flipSites,
      flips_at_measured_edge: flipSites.includes('50000->75000')
    };
  }
  // P1 the receipted pooled Spearman baseline re-derives bit-exact
  const p1 = battery['wc'].s1_pooled_spearman === m10.r10_spearman_pooled && m10.r10_spearman_pooled === 0.9151515151515152;
  // P2 the Delta hump is real (strict interior maximum at 40000)
  const iOf = Object.fromEntries(R10_LADDER.map((d, i) => [d, i]));
  const p2 = deltas[iOf[40000]] > deltas[iOf[30000]] && deltas[iOf[40000]] > deltas[iOf[50000]] && deltas[iOf[20000]] < deltas[iOf[40000]];
  // P3 wc/first10/last10 dose-gap series each SINGLE-SIGNED POSITIVE (necessary condition fails)
  const p3 = ['wc', 'first10', 'last10'].every((c) => battery[c].single_signed_positive);
  // P4 the normalized carriers flip OFF-SITE (f10r between 40000-50000, l10r between 20000-30000;
  //    neither at the measured crossing edge 50000->75000)
  const f10r = battery['first10/wc'].gap_signs, l10r = battery['last10/wc'].gap_signs;
  const p4 = f10r[iOf[20000]] === f10r[iOf[30000]] && f10r[iOf[30000]] === f10r[iOf[40000]]
    && f10r[iOf[50000]] === f10r[iOf[75000]] && f10r[iOf[40000]] !== f10r[iOf[50000]]
    && l10r[iOf[20000]] !== l10r[iOf[30000]] && l10r[iOf[30000]] === l10r[iOf[40000]]
    && l10r[iOf[40000]] === l10r[iOf[50000]] && l10r[iOf[50000]] === l10r[iOf[75000]]
    && !battery['first10/wc'].flips_at_measured_edge && !battery['last10/wc'].flips_at_measured_edge;
  // P5 the WINNER RULE OF RECORD (registered before re-scoring), applied mechanically:
  //    (a) pooled Spearman is a MASKER if rho >= 0.9 while a crossing is live;
  //    (b) the rank-inversion count is retained as the summary companion (computed for all five);
  //    (c) the gap-based order statistic (S2) is the only candidate that localizes (S1/S3 are
  //        scalars per carrier; only S2 carries per-depth sign resolution).
  const p5a_masker_fires = battery['wc'].s1_pooled_spearman >= 0.9 && crossings === 1;
  const p5b_companion_computed = Object.keys(battery).length === 5 && Object.values(battery).every((b) => Number.isInteger(b.s3_rank_inversions));
  const p5c_s2_only_depth_resolved = true; // S1: one scalar per carrier; S2: five depths; S3: one scalar
  const winnerUnderRule = (() => {
    // the rule: the winning statistic both DETECTS and LOCALIZES the crossing on existing data.
    // Applied to the re-derived battery: S1 is the receipted MASKER (rho 0.9152 >= 0.9 while the
    // crossing is live); S3 is the scalar companion; only S2 has depth resolution — and NO
    // carrier's S2 series flips at the measured 50000->75000 edge, so NO receipted single
    // observable both detects and localizes: the gap-based order statistic is the only candidate
    // that COULD localize, and it localizes nothing at the measured edge in the receipted data.
    const anyAtEdge = Object.values(battery).some((b) => b.flips_at_measured_edge);
    return {
      rule: 'the winning statistic both DETECTS and LOCALIZES the crossing on existing data',
      pooled_spearman: 'MASKER (rho ' + battery['wc'].s1_pooled_spearman + ' >= 0.9 while crossing live: ' + crossings + ' crossing at d* = ' + dstar + ')',
      rank_inversion_count: 'summary companion (receipted per carrier)',
      gap_based_order_statistic: 'the only candidate with depth localization (S2)',
      single_factor_carrier_at_measured_edge: anyAtEdge ? 'EXISTS — a carrier gap flips exactly at 50000->75000' : 'NONE — no carrier gap flips at the measured edge',
      outcome: anyAtEdge ? 'single-factor ordering re-opens' : 'no receipted single observable carries the ordering through the crossing'
    };
  })();
  const p5 = p5a_masker_fires && p5b_companion_computed && p5c_s2_only_depth_resolved;
  // P6 the consequential finding (receipted either way, gated by nothing)
  const p6_upheld = p3 && p4;
  return {
    cells_10: cells, delta_series_rederived: deltas, delta_bit_exact: deltaBitExact,
    delta_signs: deltaSigns, crossings, dstar,
    battery, p1, p2, p3, p4,
    p5, p5a_masker_fires, p5b_companion_computed, p5c_s2_only_depth_resolved, winner_under_rule: winnerUnderRule,
    p6_upheld,
    verdict: p1 && p2 && p3 && p4 && p5
  };
}
const carrier = carrierBattery();
if (!carrier.delta_bit_exact) {
  console.error('CARRIER11 BATTERY VALIDITY FAILED: the receipted Delta series does not re-derive bit-exact from the receipted ratios — audit/infra defect (receipt verbatim, patch nothing; round void_as_gated).');
  process.exit(2);
}
console.log('CARRIER11 battery: P1 ' + carrier.p1 + ' | P2 ' + carrier.p2 + ' | P3 ' + carrier.p3 + ' | P4 ' + carrier.p4 + ' | P5 ' + carrier.p5 + ' | P6 UPHELD ' + carrier.p6_upheld + ' => ' + (carrier.verdict ? 'PASS' : 'FAIL'));
for (const [name, b] of Object.entries(carrier.battery)) {
  console.log('  carrier ' + name.padEnd(10) + ' S1=' + b.s1_pooled_spearman + ' gapSigns=' + b.gap_signs.join('') + ' A=' + b.s2_agreement_count + ' S3disc=' + b.s3_rank_inversions + ' flips=' + (b.flip_sites.join(',') || 'none'));
}

// ---------- DIP11: the islands-of-survival re-registration (ZERO new compute) ----------------
function dipIslands() {
  const scan = m10.r10_dip_scan;
  const scanScales = Object.keys(scan).map(Number).sort((a, b) => a - b);
  if (scanScales.length !== 13) {
    console.error('DIP11 RE-DERIVATION FAILED: expected 13 receipted scan scales, found ' + scanScales.length + ' — run REFUSED (fail-closed).');
    process.exit(2);
  }
  // the receipted 1x anchor (scale 1.0): dipmag from metrics_round9, flanks from the receipted
  // GWIN8 grid (the 1x row of the registered W(lr) = round(30/lr) pace grid), bound bit-exact
  const gwin8 = run10.chain.find((r) => r.type === 'GWIN8_low_pace_dip').payload;
  const oneX = {
    dipmag: m9.r9_dipmag_1x,
    g015: gwin8.grid['lr0.15_w200'], g020: gwin8.grid['lr0.2_w150'], g025: gwin8.grid['lr0.25_w120']
  };
  const oneXRe = (oneX.g015 + oneX.g025) / 2 - oneX.g020;
  if (oneXRe !== oneX.dipmag || oneX.dipmag !== 0.0736349882819407) {
    console.error('DIP11 1x ANCHOR RE-BIND FAILED: dipmag re-derivation ' + oneXRe + ' != receipted ' + oneX.dipmag + ' — run REFUSED (fail-closed).');
    process.exit(2);
  }
  oneX.localmin = oneX.g015 > oneX.g020 && oneX.g025 > oneX.g020; // both flanks holding
  // Q1 the TRUE-set is EXACTLY {0.55, 0.6, 0.65} ∪ {0.95, 1.0, 1.1}
  const trueSet = scanScales.filter((s) => scan[String(s)].localmin).map(String);
  if (oneX.localmin) trueSet.push('1.0');
  const expectedTrue = ['0.55', '0.6', '0.65', '0.95', '1.0', '1.1'];
  const q1 = trueSet.slice().sort().join('|') === expectedTrue.slice().sort().join('|');
  // Q2 every FALSE receipted scale lies strictly outside both island intervals
  const islands = { L: [0.55, 0.65], H: [0.95, 1.1] };
  const inIsland = (x) => (x >= islands.L[0] && x <= islands.L[1]) || (x >= islands.H[0] && x <= islands.H[1]);
  const falseScales = scanScales.filter((s) => !scan[String(s)].localmin);
  const q2 = falseScales.every((s) => !inIsland(s));
  // Q3 the full-axis flip count is exactly 3 == the receipted low_flips 2 + high_flips 1
  const axis = [...scanScales.filter((s) => s < 1.0).map(String), '1.0', ...scanScales.filter((s) => s > 1.0).map(String)];
  const flags = axis.map((k) => (k === '1.0' ? oneX.localmin : scan[k].localmin));
  const flipEdges = [];
  for (let i = 1; i < axis.length; i++) if (flags[i] !== flags[i - 1]) flipEdges.push(axis[i - 1] + '->' + axis[i]);
  const expectedEdges = ['0.65->0.7', '0.9->0.95', '1.1->1.25'];
  const q3 = flipEdges.length === 3 && flipEdges.join('|') === expectedEdges.join('|') && flipEdges.length === m10.r10_dip_low_flips + m10.r10_dip_high_flips;
  // Q4 the magnitude-gated survivor set re-derives exactly G = {0.55, 0.6, 1.0, 1.1}
  const dipmagOf = (k) => (k === '1.0' ? oneX.dipmag : scan[k].dipmag);
  const gateSet = trueSet.filter((k) => dipmagOf(k) >= 0.05).sort();
  const subGate = trueSet.filter((k) => dipmagOf(k) < 0.05).sort();
  const q4 = gateSet.join('|') === ['0.55', '0.6', '1.0', '1.1'].join('|')
    && subGate.join('|') === ['0.65', '0.95'].join('|')
    && scan['0.65'].dipmag === 0.017476543348933504 && scan['0.95'].dipmag === 0.047982296778600886;
  // Q5 birth/death of record UNCHANGED (0.55 / 1.1)
  const q5 = m10.r10_dip_birth_low === '0.55' && m10.r10_dip_death_high === '1.1';
  return {
    scan_scales: scanScales.map(String), oneX_anchor: oneX, islands,
    true_set: trueSet.sort(), false_scales_strictly_outside: q2, false_scales: falseScales.map(String),
    axis, flip_edges: flipEdges, full_axis_flips: flipEdges.length,
    low_flips_receipted: m10.r10_dip_low_flips, high_flips_receipted: m10.r10_dip_high_flips,
    gate_set: gateSet, sub_gate_survivors: subGate,
    birth_receipted: m10.r10_dip_birth_low, death_receipted: m10.r10_dip_death_high,
    q1, q2, q3, q4, q5,
    verdict: q1 && q2 && q3 && q4 && q5
  };
}
const dip = dipIslands();
console.log('DIP11 islands: Q1 ' + dip.q1 + ' | Q2 ' + dip.q2 + ' | Q3 ' + dip.q3 + ' | Q4 ' + dip.q4 + ' | Q5 ' + dip.q5 + ' => ' + (dip.verdict ? 'PASS' : 'FAIL') + ' | TRUE-set ' + dip.true_set.join(',') + ' | flips ' + dip.flip_edges.join(', ') + ' | gate G {' + dip.gate_set.join(',') + '}');

// ---------- SAT11: the confirm run (the round-11 ONLY fresh execution — twin law) -------------
const STAGING = path.join(RECEIPTS, '.run11-staging.json');
const pack = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => {
  if (k === 'snapshots') return undefined; // warm-state capture: consumed by the probes pre-staging
  if (ArrayBuffer.isView(v)) return Array.from(v);
  return v;
}));
const loadStaging = () => { try { return JSON.parse(fs.readFileSync(STAGING, 'utf8')); } catch { return { stages: {} }; } };
const saveStaging = (st) => { const tmp = STAGING + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(st)); fs.renameSync(tmp, STAGING); };

// canonical JSON for the twin metric sha: recursive key-sorted (order-invariant, byte-exact)
const canonJson = (obj) => {
  const walk = (v) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(walk).join(',') + ']';
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + walk(v[k])).join(',') + '}';
  };
  return walk(obj);
};
const T0 = Date.now();

function core11() {
  // the receipted arms' 20000-step prefixes (per-step arithmetic prefix-invariant: the main arm
  // stop 'registered' truncated at T = 20000; the control arm stop 'contrast' truncated at
  // T = 20000) — both at their own dose (the carried PLAST convention)
  const mainPrefix = horizonRun5(World2, seedU32, LR3, TAU4, WD_MAIN, R11_PREFIX_T, 'registered', [20000], [20000]);
  const ctrlPrefix = horizonRun5(World2, seedU32, LR3, TAU4, 0, R11_PREFIX_T, 'contrast', [20000], [20000]);
  const snapMain = mainPrefix.snapshots['20000'];
  const snapCtrl = ctrlPrefix.snapshots['20000'];
  // both cascades with the FIFTH switch (stages 1-4 arithmetic-identical to the receipted probe4)
  const dc = {
    decayed: trivialSwitchProbe5(seedU32, seedB, seedC, seedD, seedF, LR3, TAU4, WD_MAIN, snapMain, PLAST_STEPS, 'trivial', 0),
    control: trivialSwitchProbe5(seedU32, seedB, seedC, seedD, seedF, LR3, TAU4, 0, snapCtrl, PLAST_STEPS, 'trivial', 0)
  };
  const ec = {
    decayed: trivialSwitchProbe5(seedU32, seedB, seedC, seedD, seedF, LR3, TAU4, WD_MAIN, snapMain, PLAST_STEPS, 'world2', seedE),
    control: trivialSwitchProbe5(seedU32, seedB, seedC, seedD, seedF, LR3, TAU4, 0, snapCtrl, PLAST_STEPS, 'world2', seedE)
  };
  return {
    main_prefix: { first10: mainPrefix.first10, wc_20000: mainPrefix.checkpoints['20000'].wc_norm, wp_20000: mainPrefix.checkpoints['20000'].wp_norm, executed_to: mainPrefix.executed_to, D: mainPrefix.D },
    ctrl_prefix: { first10: ctrlPrefix.first10, wc_20000: ctrlPrefix.checkpoints['20000'].wc_norm, wp_20000: ctrlPrefix.checkpoints['20000'].wp_norm, executed_to: ctrlPrefix.executed_to, D: ctrlPrefix.D },
    dc, ec
  };
}
const MEASURED_KEY = {
  main_prefix_first10: (x) => x.main_prefix.first10,
  main_prefix_wc_20000: (x) => x.main_prefix.wc_20000,
  main_prefix_wp_20000: (x) => x.main_prefix.wp_20000,
  ctrl_prefix_first10: (x) => x.ctrl_prefix.first10,
  dc_stage1_decayed: (x) => x.dc.decayed.ratio1, dc_stage2_decayed: (x) => x.dc.decayed.ratio2,
  dc_stage3_decayed: (x) => x.dc.decayed.ratio3, dc_stage4_decayed: (x) => x.dc.decayed.ratio4,
  dc_stage1_control: (x) => x.dc.control.ratio1, dc_stage2_control: (x) => x.dc.control.ratio2,
  dc_stage3_control: (x) => x.dc.control.ratio3, dc_stage4_control: (x) => x.dc.control.ratio4,
  dc_end1_sha_decayed: (x) => x.dc.decayed.end1.sha, dc_end1_sha_control: (x) => x.dc.control.end1.sha,
  dc_end2_wc_decayed: (x) => x.dc.decayed.end2.norms.wc_norm, dc_end2_wc_control: (x) => x.dc.control.end2.norms.wc_norm,
  dc_end3_wc_decayed: (x) => x.dc.decayed.end3.norms.wc_norm, dc_end3_wc_control: (x) => x.dc.control.end3.norms.wc_norm,
  dc_end4_wc_decayed: (x) => x.dc.decayed.end4.norms.wc_norm, dc_end4_wc_control: (x) => x.dc.control.end4.norms.wc_norm,
  dc_stage4_first10_decayed: (x) => x.dc.decayed.first10_4, dc_stage4_last10_decayed: (x) => x.dc.decayed.last10_4,
  dc_stage4_first10_control: (x) => x.dc.control.first10_4, dc_stage4_last10_control: (x) => x.dc.control.last10_4,
  ec_stage1_decayed: (x) => x.ec.decayed.ratio1, ec_stage2_decayed: (x) => x.ec.decayed.ratio2,
  ec_stage3_decayed: (x) => x.ec.decayed.ratio3, ec_stage4_decayed: (x) => x.ec.decayed.ratio4,
  ec_stage1_control: (x) => x.ec.control.ratio1, ec_stage2_control: (x) => x.ec.control.ratio2,
  ec_stage3_control: (x) => x.ec.control.ratio3, ec_stage4_control: (x) => x.ec.control.ratio4,
  ec_stage1_first10_control: (x) => x.ec.control.first10_1, ec_stage1_last10_control: (x) => x.ec.control.last10_1,
  ec_stage4_first10_decayed: (x) => x.ec.decayed.first10_4, ec_stage4_last10_decayed: (x) => x.ec.decayed.last10_4,
  ec_stage4_first10_control: (x) => x.ec.control.first10_4, ec_stage4_last10_control: (x) => x.ec.control.last10_4,
  ec_end4_wc_decayed: (x) => x.ec.decayed.end4.norms.wc_norm, ec_end4_wc_control: (x) => x.ec.control.end4.norms.wc_norm
};
function bindAnchors(x, context) {
  const bindings = [];
  const mismatches = [];
  for (const a of RECEIPTED_ANCHORS) {
    const measured = MEASURED_KEY[a.leg](x);
    const match = measured === a.receipted;
    bindings.push({ leg: a.leg, note: a.note, receipted: a.receipted, measured, match });
    if (!match) mismatches.push(a.leg + ': measured ' + measured + ' != receipted ' + a.receipted);
  }
  if (mismatches.length > 0) {
    console.error('SAT11 ANCHOR RE-BIND FAILED (' + context + '): ' + mismatches.length + '/' + RECEIPTED_ANCHORS.length + ' anchors mismatch — run REFUSED before receipt write (fail-closed, exit 2):');
    for (const mm of mismatches) console.error('  ' + mm);
    process.exit(2);
  }
  return bindings;
}
// --selftest: the ZERO-COMPUTE smoke check (the deadline-survival gate). It validates everything
// that does not touch the physics — seal, run10 chain/verdicts, seeds, curve, anchor extraction,
// and both re-scoring batteries — and executes NOTHING: the spend discipline prices exactly ONE
// fresh double execution (below, full mode only). No receipt, no staging.
if (process.argv.includes('--selftest')) {
  console.error('[selftest] zero-compute smoke PASS: registration-v11 seal (masked sha ' + storedMasked.slice(0, 12) + '…, mtime ' + storedMtime + ') + run10 receipt (file sha ' + run10FileSha.slice(0, 12) + '…, chain ' + run10.chain.length + ' rows, tip ' + run10.tip.slice(0, 12) + '…, 28 verdicts/' + carriedTrue + ' true) + seeds U32/B/C/D/E vs run10 + F ' + seedF + ' vs registration + operating point + increment curve + washout threshold ' + washoutThreshold + ' + FORTY anchor extraction + CARRIER11 (P1 ' + carrier.p1 + ' P2 ' + carrier.p2 + ' P3 ' + carrier.p3 + ' P4 ' + carrier.p4 + ' P5 ' + carrier.p5 + ' P6 ' + carrier.p6_upheld + ') + DIP11 (Q1 ' + dip.q1 + ' Q2 ' + dip.q2 + ' Q3 ' + dip.q3 + ' Q4 ' + dip.q4 + ' Q5 ' + dip.q5 + ') — physics path NOT executed (spend discipline: exactly one fresh double execution, full mode only)');
  process.exit(0);
}
let exec1, exec2;
const staging = loadStaging();
if (staging.stages.exec1) {
  exec1 = staging.stages.exec1;
  console.error('[resume] core11 #1 loaded from staging (metrics sha ' + exec1.metricsSha.slice(0, 12) + '…) — anchors re-bound fail-closed');
  bindAnchors(exec1.core, 'staged exec1');
} else {
  exec1 = { core: core11() };
  exec1.metricsSha = sha(canonJson(exec1.core));
  bindAnchors(exec1.core, 'fresh exec1');
  staging.stages.exec1 = pack(exec1); saveStaging(staging);
  console.error('[progress] core11 #1 done at ' + (Date.now() - T0) + ' ms — anchors ' + RECEIPTED_ANCHORS.length + '/' + RECEIPTED_ANCHORS.length + ' bound bit-exact — STAGED');
}
if (staging.stages.exec2) {
  exec2 = staging.stages.exec2;
  console.error('[resume] core11 #2 (twin) loaded from staging (metrics sha ' + exec2.metricsSha.slice(0, 12) + '…) — anchors re-bound fail-closed');
  bindAnchors(exec2.core, 'staged exec2');
} else {
  exec2 = { core: core11() };
  exec2.metricsSha = sha(canonJson(exec2.core));
  bindAnchors(exec2.core, 'fresh exec2');
  staging.stages.exec2 = pack(exec2); saveStaging(staging);
  console.error('[progress] core11 #2 (twin) done at ' + (Date.now() - T0) + ' ms — STAGED');
}
const twinByteIdentical = exec1.metricsSha === exec2.metricsSha;
if (!twinByteIdentical) {
  console.error('SAT11 TWIN LAW FAILED: core #1 sha ' + exec1.metricsSha + ' != core #2 sha ' + exec2.metricsSha + ' — run REFUSED before receipt write (fail-closed, exit 2).');
  process.exit(2);
}
console.log('twin law holds: core #1 sha == core #2 sha == ' + exec1.metricsSha.slice(0, 16) + '… (byte-identical)');

// ---------- SAT11 stage-5 measurements (the ONLY new quantity) --------------------------------
const sat = (() => {
  const c1 = exec1.core;
  // D-cascade fifth switch
  const dcRatio5Decayed = c1.dc.decayed.ratio5, dcRatio5Control = c1.dc.control.ratio5;
  const rho20_5 = dcRatio5Decayed / dcRatio5Control;
  const inc5 = rho20_5 - curve.rho20_4;
  const dcEnd5 = { decayed: c1.dc.decayed.end5.norms.wc_norm, control: c1.dc.control.end5.norms.wc_norm };
  // E-cascade fifth switch
  const ecRatio5Decayed = c1.ec.decayed.ratio5, ecRatio5Control = c1.ec.control.ratio5;
  const rho20_5_E = ecRatio5Decayed / ecRatio5Control;
  const inc5_E = rho20_5_E - curve.rho20_4_E;
  const ecEnd5 = { decayed: c1.ec.decayed.end5.norms.wc_norm, control: c1.ec.control.end5.norms.wc_norm };
  // the registered branch partition (fixed before the confirm run)
  let branch, branchNote;
  if (rho20_5 >= 1) {
    if (inc5 <= curve.inc4) { branch = 'STRUCTURALLY VOID'; branchNote = 'inc5 <= inc4 with rho20_5 >= 1 — registered arithmetically impossible (rho20_5 = rho20_4 + inc5 <= ' + voidBound + ' < 1)'; }
    else { branch = 'WASHOUT'; branchNote = 'the expanding steps were the precursor — the advantage is consumed at the fifth switch (priced FAIL)'; }
  } else if (inc5 <= curve.inc4) {
    if (rho20_5 >= curve.rho20_4) { branch = 'ABSORBED'; branchNote = 'the expansion absorbs into the plateau — the convex precursor is refuted, the flat-plateau law extends to the fifth switch (the PASS branch)'; }
    else { branch = 'DEGRADATION'; branchNote = 'the advantage shrinks, contradicting the receipted monotone-plateau law (priced FAIL)'; }
  } else if (inc5 < washoutThreshold) {
    branch = 'EXPANDING-BUT-ABSORBED'; branchNote = 'convex approach with the line not reached — stage-6 priced immediately for round 12 (priced FAIL)';
  } else {
    branch = 'WASHOUT'; branchNote = 'inc5 >= washout threshold (priced FAIL)';
  }
  // the registered E-cascade control leg + composition legs
  const eCascadeOk = rho20_5_E < 1.0;
  const compositionD = dcEnd5.decayed < dcEnd5.control;
  const compositionE = ecEnd5.decayed < ecEnd5.control;
  const physicsPass = branch === 'ABSORBED' && eCascadeOk && compositionD && compositionE;
  const infraPass = true; // anchors bound FORTY/FORTY on both twins + twin shas equal (else we exited 2 above)
  return {
    dc_ratio5_decayed: dcRatio5Decayed, dc_ratio5_control: dcRatio5Control,
    dc_first10_5: { decayed: c1.dc.decayed.first10_5, control: c1.dc.control.first10_5 },
    dc_last10_5: { decayed: c1.dc.decayed.last10_5, control: c1.dc.control.last10_5 },
    rho20_5, inc5, dc_end5_wc: dcEnd5,
    ec_ratio5_decayed: ecRatio5Decayed, ec_ratio5_control: ecRatio5Control,
    ec_first10_5: { decayed: c1.ec.decayed.first10_5, control: c1.ec.control.first10_5 },
    ec_last10_5: { decayed: c1.ec.decayed.last10_5, control: c1.ec.control.last10_5 },
    rho20_5_E, inc5_E, ec_end5_wc: ecEnd5,
    branch, branch_note: branchNote,
    e_cascade_control_leg: eCascadeOk, composition_leg_D: compositionD, composition_leg_E: compositionE,
    physics_pass: physicsPass, infra_pass: infraPass,
    verdict: infraPass && physicsPass
  };
})();
console.log('SAT11 stage-5: rho20_5 ' + sat.rho20_5 + ' (inc5 ' + sat.inc5 + ') | rho20_5^E ' + sat.rho20_5_E + ' (inc5^E ' + sat.inc5_E + ') | branch ' + sat.branch + ' | E-leg ' + sat.e_cascade_control_leg + ' | comp D/E ' + sat.composition_leg_D + '/' + sat.composition_leg_E + ' => ' + (sat.verdict ? 'PASS' : 'FAIL (' + sat.branch + ')'));

// ---------- receipt assembly -------------------------------------------------------------------
const chain = new Chain();
const anchorsBound = bindAnchors(exec1.core, 'receipt assembly');
chain.add('header', {
  repo: 'quilt-jepa', round: 11,
  executed_in: 'wave 66 (lane 66-b-r2, resuming the sealed 66-b registration state)',
  seed_u32: seedU32, seed_b: seedB, seed_c: seedC, seed_d: seedD, seed_e: seedE, seed_f: seedF,
  seed_f_derivation: 'seedF = parseInt(sha256(selJson + "|round11-worldF").slice(0, 8), 16) >>> 0 — registered round-11 derivation from the SAME certified seed receipt (no new entropy), fail-closed vs registration-v11 (3820734621)',
  seed_provenance: 'seedU32/B/C/D/E re-bound fail-closed vs run10.seed_*; seedF vs registration-v11',
  lr_registered: LR3, tau_registered: TAU4, K4_registered: K4, amp_registered: AMP0,
  registration: 'registration-v11.json (sealed pre-run, self_sha256_masked ' + storedMasked.slice(0, 12) + '… + mtime ' + storedMtime + '; RE-VERIFIED fail-closed at this run\'s startup)',
  carried_receipt: 'receipts/run10.json carried BY REFERENCE (file sha256 ' + run10FileSha.slice(0, 12) + '… bound fail-closed; hash chain re-derived from GENESIS row-by-row, tip ' + run10.tip.slice(0, 12) + '…; 28 verdict booleans read verbatim; zero carried re-execution)',
  spend_discipline: 'exactly ONE fresh deterministic double execution (the SAT11 confirm run, twin law) + prefix reproductions; CARRIER11 and DIP11 are zero-compute re-scorings of existing receipts'
});
chain.add('CARRIER11_ordering_carrier_repricing_battery', {
  claim: 'THE ORDERING-CARRIER RE-PRICING BATTERY on the EXISTING run-10 receipt data (zero new compute): three statistics (S1 pooled Spearman — the wc baseline re-derived 0.9151515151515152 bit-exact; S2 per-depth dose-gap sign series with the necessary-condition test; S3 rank-inversion count) applied to five carriers (wc baseline, first10, last10, first10/wc, last10/wc) on the receipted DOSE10 ladder',
  zero_new_compute: true, source: 'receipts/run10.json metrics_round10 (chain tip ' + run10.tip.slice(0, 12) + '…)',
  delta_series_rederived_bit_exact: carrier.delta_bit_exact,
  delta_series: carrier.delta_series_rederived, delta_signs: carrier.delta_signs,
  crossings: carrier.crossings, dstar: carrier.dstar,
  battery: carrier.battery,
  predictions: {
    P1_baseline_bit_exact: carrier.p1,
    P2_hump_real_strict_interior_max_at_40000: carrier.p2,
    P3_wc_f10_l10_single_signed_positive_necessary_condition_fails: carrier.p3,
    P4_normalized_carriers_flip_offsite: carrier.p4,
    P5_winner_rule_of_record_applied: carrier.p5,
    P5_masker_fires: carrier.p5a_masker_fires,
    P5_companion_computed: carrier.p5b_companion_computed,
    P5_s2_only_depth_resolved: carrier.p5c_s2_only_depth_resolved,
    P6_multi_factor_repricing: carrier.p6_upheld ? 'UPHELD and SHARPENED — no receipted single observable carries the ordering through the crossing' : 'REFUTED — single-factor ordering re-opens'
  },
  winner_under_rule: carrier.winner_under_rule,
  pass: carrier.verdict,
  void_as_gated: false
});
chain.add('SAT11_fifth_switch_plateau', {
  claim: 'THE FIFTH SWITCH on BOTH cascades, priced on the receipted increment curve BEFORE the confirm run; the confirm run reproduces both arms\' 20000-step prefixes arithmetic-identically with FORTY receipted anchors re-bound bit-exact fail-closed, then measures stage-5 (400-step window on World2(seedF = ' + seedF + '), no weight reset, from each cascade\'s end-4 state, both arms at their own dose)',
  increment_curve: curve,
  washout_threshold_of_record: washoutThreshold,
  threshold_over_inc4: thresholdOverInc4,
  extrapolations_of_record: {
    geometric_continuation_inc5: geometricInc5,
    secular_continuation_band: secularBand,
    absorbed_band_cap: secularCap,
    void_branch_bound: voidBound,
    note: 'findings receipted at registration; they gate nothing — the confirm run discriminates'
  },
  prefix_reproduction: {
    main_T: R11_PREFIX_T, main_stop: 'registered', ctrl_T: R11_PREFIX_T, ctrl_stop: 'contrast',
    prefix_invariance: 'the per-step arithmetic is prefix-invariant — the T=20000 truncation reproduces the receipted 5e5/1e5 arms\' 20k prefixes bit-exactly (anchors below)',
    main_executed_to: exec1.core.main_prefix.executed_to, ctrl_executed_to: exec1.core.ctrl_prefix.executed_to
  },
  anchors: { registered_count_text: 40, verdict_rule_stale_label: 37, bound: anchorsBound.filter((a) => a.match).length + '/' + anchorsBound.length, legs: anchorsBound, all_bit_exact: anchorsBound.every((a) => a.match) },
  twin_law: { executed_twice: true, sha_exec1: exec1.metricsSha, sha_exec2: exec2.metricsSha, byte_identical: twinByteIdentical },
  stage5: {
    seedF, world: 'World2(seedF)', steps: PLAST_STEPS, no_weight_reset: true, first_measured_in: 'this round-11 receipt-of-record run',
    dc: { ratio5_decayed: sat.dc_ratio5_decayed, ratio5_control: sat.dc_ratio5_control, rho20_5: sat.rho20_5, inc5: sat.inc5, first10_5: sat.dc_first10_5, last10_5: sat.dc_last10_5, end5_wc: sat.dc_end5_wc },
    ec: { ratio5_decayed: sat.ec_ratio5_decayed, ratio5_control: sat.ec_ratio5_control, rho20_5_E: sat.rho20_5_E, inc5_E: sat.inc5_E, first10_5: sat.ec_first10_5, last10_5: sat.ec_last10_5, end5_wc: sat.ec_end5_wc }
  },
  branch: { landed: sat.branch, note: sat.branch_note, registered_pass_branch: 'ABSORBED (inc5 <= inc4 AND rho20_5 in [rho20_4, 1))' },
  registered_legs: {
    e_cascade_control_leg_rho20_5E_lt_1: sat.e_cascade_control_leg,
    composition_end5_wc_decayed_lt_control_D: sat.composition_leg_D,
    composition_end5_wc_decayed_lt_control_E: sat.composition_leg_E
  },
  physics_pass: sat.physics_pass, infra_pass: sat.infra_pass,
  pass: sat.verdict,
  fired_branch: sat.verdict ? null : sat.branch
});
chain.add('DIP11_islands_of_survival', {
  claim: 'THE FRAGMENTED W-DOMAIN RE-REGISTERED AS ISLANDS-OF-SURVIVAL on the existing receipt data (zero new compute): F = island-L [0.55, 0.65] ∪ island-H [0.95, 1.1] at the receipted resolution incl. the receipted 1x anchor interior to island-H; the gap (0.7-0.9) and the dead zone (1.25-1.75) are parts of the law; gate set G = {0.55, 0.6} ∪ {1.0, 1.1}',
  zero_new_compute: true, source: 'receipts/run10.json metrics_round10.r10_dip_scan + the receipted 1x anchor (metrics_round9.r9_dipmag_1x + the GWIN8 grid row)',
  islands: dip.islands, oneX_anchor: dip.oneX_anchor,
  true_set: dip.true_set, false_scales: dip.false_scales,
  full_axis: dip.axis, flip_edges: dip.flip_edges, full_axis_flips: dip.full_axis_flips,
  low_flips_receipted: dip.low_flips_receipted, high_flips_receipted: dip.high_flips_receipted,
  gate_set: dip.gate_set, sub_gate_survivors: dip.sub_gate_survivors,
  birth_receipted: dip.birth_receipted, death_receipted: dip.death_receipted,
  predictions: {
    Q1_true_set_exact: dip.q1,
    Q2_false_strictly_outside: dip.q2,
    Q3_flips_exactly_3_eq_low_plus_high: dip.q3,
    Q4_gate_set_exact: dip.q4,
    Q5_birth_death_unchanged: dip.q5
  },
  consequence: 'DIP9\'s window-fragility and DIP10\'s fragmentation FOLD into the islands law as its two legs; unmapped-at-resolution: island-L\'s lower edge (s < 0.55) and the gap interior (0.675-0.925) — round 12 prices a refinement scan ONLY if a downstream consumer needs the domain (gate-nothing otherwise)',
  pass: dip.verdict,
  void_as_gated: false
});
chain.add('R4_r11_twin_layer', {
  note: 'the R4 determinism crown (ten rounds deep) is PRESERVED, not extended: its deepest binding remains run10.json\'s R4 row (8a3daa00… twins); this row receipts the NEW round-11 layer twin proof only',
  round11_twin: { sha_exec1: exec1.metricsSha, sha_exec2: exec2.metricsSha, byte_identical: twinByteIdentical },
  run10_R4_row_binding: {
    source: 'receipts/run10.json chain row R4_determinism (read verbatim; zero re-execution)',
    sha_round10_run1: run10.chain.find((r) => r.type === 'R4_determinism').payload.sha_round10_run1,
    sha_round10_run2: run10.chain.find((r) => r.type === 'R4_determinism').payload.sha_round10_run2,
    twins_equal: run10.chain.find((r) => r.type === 'R4_determinism').payload.sha_round10_run1 === run10.chain.find((r) => r.type === 'R4_determinism').payload.sha_round10_run2
  }
});
chain.add('CARRIED28_by_reference', {
  note: 'ALL TWENTY-EIGHT round-10 claims carry BY REFERENCE (the L16 receipt-of-record-first discipline): run11 re-derived the run10.json hash chain from GENESIS (tip ' + run10.tip.slice(0, 12) + '…), read the 28 receipted verdict booleans verbatim, and re-scored NOTHING — no carried claim is re-executed, re-measured, or revised. A carried claim\'s round-11 verdict IS its round-10 verdict.',
  carried_from: 'receipts/run10.json (file sha256 ' + run10FileSha.slice(0, 12) + '… bound fail-closed)',
  carried_verdicts: carried10,
  carried_claims_passed: run10.claims_passed, carried_claims_total: run10.claims_total
});

const verdicts = {
  CARRIER11_ordering_carrier_repricing_battery: carrier.verdict,
  SAT11_fifth_switch_plateau: sat.verdict,
  DIP11_islands_of_survival: dip.verdict,
  ...carried10
};
const nPass = Object.values(verdicts).filter(Boolean).length;

const outDoc = {
  schema: 'quilt-jepa/run-receipt-v11',
  seed_u32: seedU32,
  seed_b: seedB, seed_c: seedC, seed_d: seedD, seed_e: seedE, seed_f: seedF,
  lr_registered: LR3, tau_registered: TAU4, K4_registered: K4, amp_registered: AMP0,
  round10_constants: run10.round10_constants, // carried verbatim (the receipted round-10 context)
  round11_constants: {
    seedF_suffix: R11_SEEDF_SUFFIX,
    seedF_derivation: 'seedF = parseInt(sha256(selJson + "|round11-worldF").slice(0, 8), 16) >>> 0 — registered round-11 derivation (no new entropy), fail-closed vs registration-v11',
    prefix_T: R11_PREFIX_T, prefix_invariance: 'per-step arithmetic prefix-invariant — T=20000 truncation of the receipted arms',
    plast_steps: PLAST_STEPS,
    cascade_law: 'D-cascade trivial->World2(seedB)->World2(seedC)->World2(seedD)->World2(seedF); E-cascade World2(seedE)->World2(seedB)->World2(seedC)->World2(seedD)->World2(seedF); no weight reset between stages; both arms at their own dose (3e-4 / 0)',
    anchor_count: RECEIPTED_ANCHORS.length,
    anchor_label_note: 'registration-v11 SAT11 claim text says FORTY (the pre-run-corrected count label, commit b69cf7f); the verdict_rule sentence retains the stale THIRTY-SEVEN label — the enumeration itself is unchanged and complete at FORTY legs; all FORTY bound bit-exact',
    carriers: ['wc', 'first10', 'last10', 'first10/wc', 'last10/wc'],
    statistics: ['S1_pooled_spearman_ties_averaged', 'S2_dose_gap_sign_series_necessary_condition', 'S3_rank_inversion_kendall_discordance'],
    islands_law: 'F = island-L [0.55, 0.65] ∪ island-H [0.95, 1.1] at receipted resolution incl. the 1x anchor; gap {0.7-0.9}; dead zone {1.25-1.75}; G = {0.55, 0.6} ∪ {1.0, 1.1}; birth/death 0.55/1.1',
    washout_threshold: washoutThreshold,
    increment_curve: curve,
    twin_law: 'the round-11 core executed TWICE, metric shas equal (byte-identical)',
    spend: 'exactly ONE fresh double execution (SAT11 stage-5) + prefix reproductions; CARRIER11/DIP11 zero new compute'
  },
  operating_point_note: 'UNCHANGED from round 4..10 (core/ byte-untouched) — ROUND 11 THE RE-PRICING ROUND: the twenty-eight round-10 claims carry BY REFERENCE (run10.json chain re-derived from GENESIS, tip ' + run10.tip.slice(0, 12) + '…; verdicts read verbatim; zero re-execution); CARRIER11 and DIP11 re-score existing receipt data with ZERO new compute; exactly ONE fresh confirm execution priced (SAT11 fifth switch, twin-deterministic, FORTY receipted anchors re-bound bit-exact fail-closed)',
  seal_verified_at_startup: { masked_sha: storedMasked, mtime: storedMtime },
  carried_receipt_verified_at_startup: { file_sha256: run10FileSha, chain_tip: run10.tip, chain_rows: run10.chain.length, carried_claims: carriedKeys.length, carried_true: carriedTrue },
  claims_passed: nPass,
  claims_total: Object.keys(verdicts).length,
  verdicts,
  metrics_round11: {
    carrier11: { delta_series: carrier.delta_series_rederived, delta_signs: carrier.delta_signs, crossings: carrier.crossings, dstar: carrier.dstar, battery: carrier.battery, predictions: { p1: carrier.p1, p2: carrier.p2, p3: carrier.p3, p4: carrier.p4, p5: carrier.p5, p6_upheld: carrier.p6_upheld }, winner_under_rule: carrier.winner_under_rule },
    sat11: {
      prefix_reproduction: { main: exec1.core.main_prefix, ctrl: exec1.core.ctrl_prefix },
      anchors_bound: anchorsBound, anchors_all_bit_exact: anchorsBound.every((a) => a.match),
      twin: { sha_exec1: exec1.metricsSha, sha_exec2: exec2.metricsSha, byte_identical: twinByteIdentical },
      stage5: sat,
      curve: curve, washout_threshold: washoutThreshold, threshold_over_inc4: thresholdOverInc4,
      geometric_inc5: geometricInc5, secular_band: secularBand, secular_cap_runtime: secularCap, void_bound: voidBound
    },
    dip11: {
      true_set: dip.true_set, false_scales: dip.false_scales, axis: dip.axis, flip_edges: dip.flip_edges,
      full_axis_flips: dip.full_axis_flips, gate_set: dip.gate_set, sub_gate_survivors: dip.sub_gate_survivors,
      oneX_anchor: dip.oneX_anchor, predictions: { q1: dip.q1, q2: dip.q2, q3: dip.q3, q4: dip.q4, q5: dip.q5 }
    },
    carried: { file_sha256: run10FileSha, chain_tip: run10.tip, carried_verdicts: carried10, carried_claims_passed: run10.claims_passed, carried_claims_total: run10.claims_total }
  },
  chain: chain.rows,
  tip: chain.tip()
};
fs.writeFileSync(path.join(RECEIPTS, 'run11.json'), JSON.stringify(outDoc, null, 1));
fs.rmSync(STAGING, { force: true }); // receipt of record written — staging consumed
console.log('receipt of record written: receipts/run11.json (schema quilt-jepa/run-receipt-v11, ' + chain.rows.length + ' chain rows, tip ' + chain.tip().slice(0, 16) + '…)');
console.log('claims:', nPass + '/' + Object.keys(verdicts).length, '(28 carried by reference + CARRIER11 + SAT11 + DIP11)');
console.log('verdicts:', JSON.stringify(verdicts));
const r4row = chain.rows.find((r) => r.type === 'R4_r11_twin_layer').payload;
console.log('R4 r11 twin layer: exec1 sha ' + r4row.round11_twin.sha_exec1.slice(0, 16) + '… == exec2 (byte-identical: ' + r4row.round11_twin.byte_identical + ') | run10 R4 row 8a3daa00… twins carried (crown PRESERVED)');
console.log('CARRIER11 detail: Delta ' + R10_LADDER.map((d, i) => d + ':' + carrier.delta_series_rederived[i].toFixed(6)).join(' ')
  + ' | dstar=' + carrier.dstar + ' crossings=' + carrier.crossings);
console.log('  winners: wc S1=' + carrier.battery['wc'].s1_pooled_spearman + ' (masker: ' + carrier.p5a_masker_fires + ') | f10r flips ' + (carrier.battery['first10/wc'].flip_sites.join(',') || 'none') + ' | l10r flips ' + (carrier.battery['last10/wc'].flip_sites.join(',') || 'none') + ' | at-measured-edge: ' + carrier.winner_under_rule.single_factor_carrier_at_measured_edge);
console.log('SAT11 detail: D-cascade rho20_5=' + sat.rho20_5 + ' (inc5=' + sat.inc5 + ', branch ' + sat.branch + ') | E-cascade rho20_5^E=' + sat.rho20_5_E + ' (inc5^E=' + sat.inc5_E + ')'
  + ' | end-5 wc decayed/control D ' + sat.dc_end5_wc.decayed + '/' + sat.dc_end5_wc.control + ' E ' + sat.ec_end5_wc.decayed + '/' + sat.ec_end5_wc.control);
console.log('DIP11 detail: TRUE-set {' + dip.true_set.join(', ') + '} | flips ' + dip.flip_edges.join(', ') + ' | gate G {' + dip.gate_set.join(', ') + '} | sub-gate {' + dip.sub_gate_survivors.join(', ') + '} | birth/death ' + dip.birth_receipted + '/' + dip.death_receipted);
console.log('wall clock: ' + (Date.now() - T0) + ' ms');
