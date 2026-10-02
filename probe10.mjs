// probe10.mjs — quilt-jepa ROUND 10 (wave 64, lane 64-b). PRE-SEAL pipeline validation —
// GATES NOTHING. Follows the round-7/8/9 discipline (probe7/design7, probe8/design8,
// probe9/design9): the probe measures NO round-10 claim value except the ones DISCLOSED here and
// bound bit-exact in the run. Identities (all must be TRUE for the receipt to say
// all_identities_pass):
//   I-E10  Jepa4(seed, wd=0) == Jepa3(seed) 400-step identity (losses AND all three weight
//          matrices) — the carried fail-closed identity re-verified in the round-10 environment.
//   I-A10a CURE-ARM capture-extension identity (the DOSE10 depth ladder): the wd 2e-4 arm via
//          horizonRun5 WITH captureAt=[20000, 30000, 40000, 50000, 75000] (executed twice)
//          reproduces the receipted arm BIT-EXACTLY (D = 85387 == executed_to vs run7/run8,
//          slow rate -3.778708210171146e-6, wc norms at 400/20000 vs design8 I-B + run8
//          metrics8, wc75000 vs run9 metrics9) and each captured snapshot's |Wc| equals the
//          arm's own checkpoint norm bit-exactly at ALL FIVE ladder depths; cross-execution
//          snapshot shas bit-identical. DISCLOSES the interior checkpoint |Wc| norms
//          (30000/40000/50000) — unavoidably computed by the identity.
//   I-A10b MAIN-ARM capture-extension identity: the wd 3e-4 main arm via horizonRun5 WITH
//          captureAt=[20000, 30000, 40000, 50000, 75000, 100000, 500000] (executed twice,
//          full registered 5e5 steps) reproduces the receipted arm BIT-EXACTLY (D == null,
//          executed_to == 500000, slow rates + wc norms at 400/20000/100000/500000 vs
//          design6 partA, wc75000 vs run9 metrics9) and each captured snapshot's |Wc| equals
//          the arm's own checkpoint norm bit-exactly at ALL SEVEN capture depths;
//          cross-execution snapshot shas bit-identical. DISCLOSES the interior checkpoint |Wc|
//          norms (30000/40000/50000) — unavoidably computed by the identity.
//   I-B10  FOURTH-SWITCH stage-path identity + DISCLOSED control legs: two independent 20000-step
//          wd0 control slices capture BIT-IDENTICAL snapshots; the round-10 trivialSwitchProbe4
//          (stage 1 trivial window -> stage 2 fresh World2(seedB) -> stage 3 fresh
//          World2(seedC) -> stage 4 fresh World2(seedD), no weight reset between stages, each
//          stage 400 steps) executed on the CONTROL arm reproduces run7's receipted control
//          first-switch ratio 0.7135257300287862 AND run8's receipted control second-switch
//          ratio 1.17997507686084 AND run9's receipted control third-switch ratio
//          0.7354070016984524 (== design9's disclosure) AND run8's receipted stage-1
//          end-weights sha BIT-EXACTLY, with end-2/end-3 norms == design9's disclosures; the
//          full 4-stage path executed twice is bit-identical. The SAME function with the
//          stage-1 window on a fresh World2(seedE) — the DIFFERENT-PROBE-WORLD E-cascade, the
//          round-9 disclosed trivial-world caveat's priced alternative — executed twice is
//          bit-identical. The control FOURTH-switch ratios (both cascades) and the control
//          E-path stage ratios are NEW numbers the pipeline computes here — DISCLOSED in
//          registration-v10 and bound bit-exact in the run (the round-7/8/9 disclosure
//          pattern). They gate nothing by themselves: the SAT10 gates act on
//          rho20_4 = ratio4(3e-4)/ratio4(wd0) and rho20_4^E = ratio4^E(3e-4)/ratio4^E(wd0),
//          whose DECAYED legs are measured for the first time inside run10.
//   I-C10  DIP10 anchor identity: gGateFlex at the receipted 1x row — g(0.2, W150) ===
//          run7.metrics_round7.gwin7_g_02, g(0.15, W200) === design6 partC, g(0.25, W120) ===
//          run7.metrics_round7.gwin7_g_025, dipmag(1x) === run8's 0.0736349882819407 — AND at
//          the receipted 0.5x/2x rows (all six values === run9.metrics_round9), proving the
//          exact (lr, tau, W, wd=0, trivial world) path the round-10 DIP10 W-domain scan uses.
//   I-D10  carried GWIN anchor identity: gGateFlex(0.3, W100, wd0) == run4.metrics.g_ratio.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GRID, xorshift32 } = require('./core/world2.js');
const { World } = require('./core/world.js');
const { World2 } = require('./core/world2.js');
const { CELLS, LAT } = require('./core/jepa.js');
const { Jepa3 } = require('./core/jepa3.js');
const { Jepa4 } = require('./core/jepa4.js');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RECEIPTS = path.join(HERE, 'receipts');
fs.mkdirSync(RECEIPTS, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
const LR3 = 0.3;      // registered lr (carried)
const TAU4 = 0.99998; // registered round-4 tau (carried)
const K4 = 1.5e-6;    // registered pace-law constant (carried)
const T_HORIZON = 500000;
const CONTRAST_CAP = 100000;
const WD_MAIN = 3e-4;
const WD_CURE = 2e-4; // the round-8 registered cured-dose candidate (the DOSE10 cure-side arm)
const RLONG_CKPTS = [400, 1000, 5000, 10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000];
const PLAST_STEPS = 400;
const R10_LADDER = [20000, 30000, 40000, 50000, 75000]; // the DOSE10 depth ladder (shared-finite depths; 2e-4 diverges at 85387)
const R10_SEEDD_SUFFIX = '|round10-worldD'; // round-10 seedD derivation suffix (registered; no new entropy)
const R10_SEEDE_SUFFIX = '|round10-worldE'; // round-10 seedE derivation suffix (registered; no new entropy)
const norm64 = (W) => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i] * W[i]; return Math.sqrt(s); };
const weightSha = (je) => sha(Buffer.concat([Buffer.from(je.Wc.buffer, je.Wc.byteOffset, je.Wc.byteLength),
                                             Buffer.from(je.Wp.buffer, je.Wp.byteOffset, je.Wp.byteLength),
                                             Buffer.from(je.Wt.buffer, je.Wt.byteOffset, je.Wt.byteLength)]));
const snapSha = (snap) => sha(Buffer.concat([Buffer.from(snap.Wc.buffer, snap.Wc.byteOffset, snap.Wc.byteLength),
                                             Buffer.from(snap.Wp.buffer, snap.Wp.byteOffset, snap.Wp.byteLength),
                                             Buffer.from(snap.Wt.buffer, snap.Wt.byteOffset, snap.Wt.byteLength)]));

// ---------- fail-closed seal verification against the LAST SEALED registration (round-9) ----------
const REG = path.join(HERE, 'registration-v9.json');
const raw = fs.readFileSync(REG, 'utf8');
const reg = JSON.parse(raw);
const storedMasked = reg.registration.seal.self_sha256_masked;
const storedMtime = reg.registration.seal.mtime_local_ms;
const maskedBody = raw.replace(`"self_sha256_masked": "${storedMasked}"`, `"self_sha256_masked": "${'0'.repeat(64)}"`);
const recomputed = sha(maskedBody);
const st = fs.statSync(REG);
if (recomputed !== storedMasked) {
  console.error('SEAL VERIFICATION FAILED: masked sha mismatch — probe REFUSED (fail-closed). stored=' + storedMasked.slice(0, 12) + ' recomputed=' + recomputed.slice(0, 12));
  process.exit(2);
}
if (st.mtimeMs !== storedMtime) {
  console.error('SEAL VERIFICATION FAILED: mtime ' + st.mtimeMs + ' != sealed ' + storedMtime + ' — probe REFUSED (fail-closed).');
  process.exit(2);
}
console.log('seal verified (registration-v9): masked sha ' + storedMasked.slice(0, 12) + '… mtime ' + storedMtime);

const design6 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design6.json'), 'utf8'));
const design8 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design8.json'), 'utf8'));
const design9 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design9.json'), 'utf8'));
const run4 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run4.json'), 'utf8'));
const run7 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run7.json'), 'utf8'));
const run8 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run8.json'), 'utf8'));
const run9 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run9.json'), 'utf8'));

// ---------- certified seed + the round-8/9/10 worldB/worldC/worldD/worldE derivations ----------
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;
const seedB = parseInt(sha(selJson + '|round8-worldB').slice(0, 8), 16) >>> 0;
const seedC = parseInt(sha(selJson + '|round9-worldC').slice(0, 8), 16) >>> 0;
const seedD = parseInt(sha(selJson + R10_SEEDD_SUFFIX).slice(0, 8), 16) >>> 0;
const seedE = parseInt(sha(selJson + R10_SEEDE_SUFFIX).slice(0, 8), 16) >>> 0;
if (seedU32 !== 2133245488) { console.error('seed derivation drift: ' + seedU32); process.exit(2); }
if (seedB !== design8.seed_b || seedB !== run8.seed_b) { console.error('seedB derivation drift: ' + seedB); process.exit(2); }
if (seedC !== design9.seed_c || seedC !== run9.seed_c) { console.error('seedC derivation drift: ' + seedC); process.exit(2); }
console.log('seed_u32=' + seedU32 + ' seedB=' + seedB + ' (design8/run8-bound) seedC=' + seedC + ' (design9/run9-bound) seedD=' + seedD + ' seedE=' + seedE + ' (derivations: sha256(selJson|round10-worldD|round10-worldE).slice(0,8))');

// ---------- horizonRun5 (verbatim from run9.mjs / probe9 lineage) ----------
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
function relDisp(W, W0) {
  let d = 0, n = 0;
  for (let i = 0; i < W.length; i++) { const x = W[i] - W0[i]; d += x * x; n += W[i] * W[i]; }
  return Math.sqrt(d) / Math.sqrt(n);
}
// G gate with arbitrary window length (Jepa4) — verbatim from run9.mjs
function gGateFlex(seedU32, lr, tau, wd, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  return { g_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), g_first10: mean(losses.slice(0, 10)), g_last10: mean(losses.slice(-10)) };
}
// trivialSwitchProbe4 (ROUND 10): stages 1..3 ARITHMETIC-IDENTICAL to the carried
// trivialSwitchProbe3 (identity proven BIT-EXACT in I-B10 below on the receipted control path);
// stage 1's world is parameterized: 'trivial' (the registered cascade — new World(seedU32),
// exactly probe3's stage 1) or 'world2' (the DIFFERENT-PROBE-WORLD E-cascade — fresh
// World2(stage1Seed) from its own t=0). Adds the FOURTH switch: a fresh World2(seedD) from its
// own t=0, 400 steps, continuing from the end state of stage 3 with NO weight reset between
// stages. Per-stage end-weight capture (|Wc|/|Wp|/|Wt| norms + full-weight sha) after each stage.
function trivialSwitchProbe4(seedU32, seedB, seedC, seedD, lr, tau, wd, snap, steps, stage1World, stage1Seed) {
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
  return {
    ratio1: mean(losses1.slice(-10)) / mean(losses1.slice(0, 10)),
    first10_1: mean(losses1.slice(0, 10)), last10_1: mean(losses1.slice(-10)),
    ratio2: mean(losses2.slice(-10)) / mean(losses2.slice(0, 10)),
    first10_2: mean(losses2.slice(0, 10)), last10_2: mean(losses2.slice(-10)),
    ratio3: mean(losses3.slice(-10)) / mean(losses3.slice(0, 10)),
    first10_3: mean(losses3.slice(0, 10)), last10_3: mean(losses3.slice(-10)),
    ratio4: mean(losses4.slice(-10)) / mean(losses4.slice(0, 10)),
    first10_4: mean(losses4.slice(0, 10)), last10_4: mean(losses4.slice(-10)),
    end1, end2, end3, end4
  };
}

const T0 = Date.now();
const out = { identities: {} };
const I = out.identities;

// ---------- I-E10: Jepa4-wd0 identity (carried, cheap, first) ----------
{
  const world = new World2(seedU32);
  const a = new Jepa3(seedU32); a.lr = LR3; a.tau = TAU4;
  const b = new Jepa4(seedU32, 0); b.lr = LR3; b.tau = TAU4;
  const la = [], lb = [];
  let obs = world.observe();
  for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); la.push(a.trainStep(obs, o1)); lb.push(b.trainStep(obs, o1)); obs = o1; }
  let lossesExact = true;
  for (let i = 0; i < la.length; i++) if (la[i] !== lb[i]) { lossesExact = false; break; }
  I.IE10_jepa4_wd0_identity = { steps: 400, losses_bit_exact: lossesExact, weights_bit_exact: weightSha(a) === weightSha(b), weights_sha: weightSha(a) };
  console.log('I-E10 jepa4-wd0 identity:', lossesExact && weightSha(a) === weightSha(b));
}

// ---------- I-A10a: cure-arm (2e-4) capture-extension identity over the DOSE10 depth ladder -----
{
  const capList = R10_LADDER.slice();
  const armA = horizonRun5(World2, seedU32, LR3, TAU4, WD_CURE, T_HORIZON, 'contrast', RLONG_CKPTS, capList);
  const armB = horizonRun5(World2, seedU32, LR3, TAU4, WD_CURE, T_HORIZON, 'contrast', RLONG_CKPTS, capList);
  const slow = Math.log(armA.checkpoints['20000'].wc_norm / armA.checkpoints['400'].wc_norm) / 19600;
  const normChecks = {};
  let normAll = true, crossAll = true;
  for (const d of capList.map(String)) {
    const sn = norm64(armA.snapshots[d].Wc);
    normChecks[d] = { snapshot_wc_norm: sn, bit_exact_vs_own_ckpt: sn === armA.checkpoints[d].wc_norm };
    if (!(sn === armA.checkpoints[d].wc_norm)) normAll = false;
    if (!(snapSha(armA.snapshots[d]) === snapSha(armB.snapshots[d]))) crossAll = false;
  }
  I.IA10a_cure_capture_extension = {
    capture_at: capList,
    D: armA.D, D_bit_exact_vs_receipts: armA.D === run7.metrics_round7.r7_D_wd2e4 && armA.D === run8.metrics_round8.r8_D_wd2e4 && armA.D === 85387,
    executed_to: armA.executed_to, exec_bit_exact: armA.executed_to === run7.metrics_round7.r7_exec_wd2e4 && armA.executed_to === run8.metrics_round8.r8_exec_wd2e4 && armA.executed_to === 85387,
    slow, slow_bit_exact: slow === run7.metrics_round7.r7_rate_wd2e4 && slow === run8.metrics_round8.r8_rate_wd2e4 && slow === -3.778708210171146e-6,
    wc400: armA.checkpoints['400'].wc_norm, wc400_bit_exact: armA.checkpoints['400'].wc_norm === design8.identities.IB_wd2e4_registered_prefix.wc400,
    wc20000: armA.checkpoints['20000'].wc_norm, wc20000_bit_exact: armA.checkpoints['20000'].wc_norm === run8.metrics_round8.r8_dose_wc_2e4,
    wc75000: armA.checkpoints['75000'].wc_norm, wc75000_bit_exact: armA.checkpoints['75000'].wc_norm === run9.metrics_round9.r9_ckpt_wc75_2e4 && armA.checkpoints['75000'].wc_norm === 8.691686529662682,
    captured_at: armA.captured_at,
    norm_checks: normChecks, all_snapshot_norms_bit_exact_vs_own_ckpts: normAll,
    cross_execution_snapshots_bit_identical: crossAll && armA.D === armB.D && armA.executed_to === armB.executed_to,
    DISCLOSED_cure_wc_30000: armA.checkpoints['30000'].wc_norm,
    DISCLOSED_cure_wc_40000: armA.checkpoints['40000'].wc_norm,
    DISCLOSED_cure_wc_50000: armA.checkpoints['50000'].wc_norm,
    disclosed_note: 'the cured-dose arm\'s interior checkpoint |Wc| norms (30000/40000/50000) — computed here because the I-A10a identity unavoidably executes the extended-capture path (round-7/8/9 disclosure pattern); the cured-dose interior SWITCH RATIOS (the DOSE10 ordering curve) are NOT measured anywhere pre-seal (first measured inside run10)'
  };
  console.log('I-A10a cure capture extension:', JSON.stringify(I.IA10a_cure_capture_extension));
}

// ---------- I-A10b: main-arm (3e-4) capture-extension identity over the DOSE10 depth ladder -----
{
  const capList = [20000, 30000, 40000, 50000, 75000, 100000, 500000];
  const armA = horizonRun5(World2, seedU32, LR3, TAU4, WD_MAIN, T_HORIZON, 'registered', RLONG_CKPTS, capList);
  const armB = horizonRun5(World2, seedU32, LR3, TAU4, WD_MAIN, T_HORIZON, 'registered', RLONG_CKPTS, capList);
  const slow = Math.log(armA.checkpoints['20000'].wc_norm / armA.checkpoints['400'].wc_norm) / 19600;
  const slow100k = Math.log(armA.checkpoints['100000'].wc_norm / armA.checkpoints['400'].wc_norm) / 99600;
  const d6main = design6.partA_longevity.arms['wd3e-4_main'];
  const normChecks = {};
  let normAll = true, crossAll = true;
  for (const d of capList.map(String)) {
    const sn = norm64(armA.snapshots[d].Wc);
    normChecks[d] = { snapshot_wc_norm: sn, bit_exact_vs_own_ckpt: sn === armA.checkpoints[d].wc_norm };
    if (!(sn === armA.checkpoints[d].wc_norm)) normAll = false;
    if (!(snapSha(armA.snapshots[d]) === snapSha(armB.snapshots[d]))) crossAll = false;
  }
  I.IA10b_main_capture_extension = {
    capture_at: capList,
    D: armA.D, D_null_bit_exact: armA.D === null && d6main.D === null,
    executed_to: armA.executed_to, exec_bit_exact: armA.executed_to === d6main.executed_to && armA.executed_to === 500000,
    slow, slow_bit_exact: slow === d6main.slow_inflation_rate,
    slow100k, slow100k_bit_exact: slow100k === d6main.slow_inflation_rate_100k,
    first10: armA.first10, first10_bit_exact: armA.first10 === d6main.first10,
    wc400: armA.checkpoints['400'].wc_norm, wc400_bit_exact: armA.checkpoints['400'].wc_norm === d6main.checkpoints['400'].wc_norm,
    wc20000: armA.checkpoints['20000'].wc_norm, wc20000_bit_exact: armA.checkpoints['20000'].wc_norm === d6main.checkpoints['20000'].wc_norm,
    wc75000: armA.checkpoints['75000'].wc_norm, wc75000_bit_exact: armA.checkpoints['75000'].wc_norm === run9.metrics_round9.r9_ckpt_wc75_3e4 && armA.checkpoints['75000'].wc_norm === 6.443616949719879,
    wc100000: armA.checkpoints['100000'].wc_norm, wc100000_bit_exact: armA.checkpoints['100000'].wc_norm === d6main.checkpoints['100000'].wc_norm,
    wc500000: armA.checkpoints['500000'].wc_norm, wc500000_bit_exact: armA.checkpoints['500000'].wc_norm === d6main.checkpoints['500000'].wc_norm,
    captured_at: armA.captured_at,
    norm_checks: normChecks, all_snapshot_norms_bit_exact_vs_own_ckpts: normAll,
    cross_execution_snapshots_bit_identical: crossAll && armA.executed_to === armB.executed_to,
    DISCLOSED_main_wc_30000: armA.checkpoints['30000'].wc_norm,
    DISCLOSED_main_wc_40000: armA.checkpoints['40000'].wc_norm,
    DISCLOSED_main_wc_50000: armA.checkpoints['50000'].wc_norm,
    disclosed_note: 'the main-dose arm\'s interior checkpoint |Wc| norms (30000/40000/50000) — computed here because the I-A10b identity unavoidably executes the extended-capture path; the main-dose interior SWITCH RATIOS (the DOSE10 ordering curve) are NOT measured anywhere pre-seal (first measured inside run10)'
  };
  console.log('I-A10b main capture extension:', JSON.stringify(I.IA10b_main_capture_extension));
}

// ---------- I-B10: fourth-switch stage-path identities + DISCLOSED control legs ------------------
{
  const s1 = horizonRun5(World2, seedU32, LR3, TAU4, 0, 20000, 'registered', [20000], [20000]);
  const s2 = horizonRun5(World2, seedU32, LR3, TAU4, 0, 20000, 'registered', [20000], [20000]);
  const captureBitExact = snapSha(s1.snapshots['20000']) === snapSha(s2.snapshots['20000']);
  const receiptedCtrl1 = run7.metrics_round7.plast_ratio_ctrl20k;                    // 0.7135257300287862
  const receiptedCtrl2 = run8.metrics_round8.r8_ratio2_wd0;                          // 1.17997507686084
  const receiptedCtrl3 = run9.metrics_round9.r9_ratio3_wd0;                          // 0.7354070016984524
  const receiptedCtrlEndSha1 = run8.metrics_round8.r8_end_weights_sha_control;       // probe2 stage-1 end sha
  // (a) the registered cascade (stage 1 trivial — probe3's exact stage-1 path) + stage 4 (seedD)
  const p4a = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, 0, s1.snapshots['20000'], PLAST_STEPS, 'trivial', 0);
  const p4b = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, 0, s2.snapshots['20000'], PLAST_STEPS, 'trivial', 0);
  // (b) the DIFFERENT-PROBE-WORLD E-cascade (stage 1 on a fresh World2(seedE) — the round-9
  //     disclosed trivial-world caveat's priced alternative; stages 2-4 on seedB/seedC/seedD)
  const p4ea = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, 0, s1.snapshots['20000'], PLAST_STEPS, 'world2', seedE);
  const p4eb = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, 0, s2.snapshots['20000'], PLAST_STEPS, 'world2', seedE);
  I.IB10_fourth_switch_stage_path = {
    snapshot_step: 20000, wd: 0,
    capture_bit_exact_cross_execution: captureBitExact,
    snapshot_weights_sha: snapSha(s1.snapshots['20000']),
    snapshot_sha_bit_exact_vs_design9_control: snapSha(s1.snapshots['20000']) === design9.disclosed_pipeline_values.control_snapshot_weights_sha,
    // registered cascade (D-cascade)
    dc_stage1_ratio: p4a.ratio1, dc_stage1_bit_exact_vs_run7_ctrl20k: p4a.ratio1 === receiptedCtrl1,
    dc_stage2_ratio: p4a.ratio2, dc_stage2_bit_exact_vs_run8_ratio2_wd0: p4a.ratio2 === receiptedCtrl2,
    dc_stage3_ratio: p4a.ratio3, dc_stage3_bit_exact_vs_run9_ratio3_wd0: p4a.ratio3 === receiptedCtrl3 && p4a.ratio3 === design9.disclosed_pipeline_values.control_third_switch_ratio,
    dc_stage1_end_sha: p4a.end1.sha, dc_stage1_end_sha_bit_exact_vs_run8: p4a.end1.sha === receiptedCtrlEndSha1,
    dc_end2_norms_bit_exact_vs_design9: p4a.end2.norms.wc_norm === design9.disclosed_pipeline_values.control_end2_norms.wc_norm && p4a.end2.norms.wp_norm === design9.disclosed_pipeline_values.control_end2_norms.wp_norm && p4a.end2.norms.wt_norm === design9.disclosed_pipeline_values.control_end2_norms.wt_norm,
    dc_end3_norms_bit_exact_vs_design9: p4a.end3.norms.wc_norm === design9.disclosed_pipeline_values.control_end3_norms.wc_norm && p4a.end3.norms.wp_norm === design9.disclosed_pipeline_values.control_end3_norms.wp_norm && p4a.end3.norms.wt_norm === design9.disclosed_pipeline_values.control_end3_norms.wt_norm,
    dc_full_path_bit_exact_cross_execution: p4a.ratio1 === p4b.ratio1 && p4a.ratio2 === p4b.ratio2 && p4a.ratio3 === p4b.ratio3 && p4a.ratio4 === p4b.ratio4 && p4a.end2.sha === p4b.end2.sha && p4a.end3.sha === p4b.end3.sha && p4a.end4.sha === p4b.end4.sha,
    seed_b: seedB, seed_c: seedC, seed_d: seedD,
    seed_d_derivation: 'seedD = parseInt(sha256(JSON.stringify(certified-seed.chosen.selected) + "|round10-worldD").slice(0, 8), 16) >>> 0 — deterministic derivation from the SAME certified seed receipt (no new entropy; the round-8/9 pattern)',
    DISCLOSED_control_fourth_switch_ratio: p4a.ratio4,
    dc_control_fourth_switch_first10: p4a.first10_4, dc_control_fourth_switch_last10: p4a.last10_4,
    dc_control_end4_norms: p4a.end4.norms,
    // different-probe-world E-cascade
    ec_stage1_ratio: p4ea.ratio1, ec_stage2_ratio: p4ea.ratio2, ec_stage3_ratio: p4ea.ratio3, ec_stage4_ratio: p4ea.ratio4,
    ec_stage1_first10: p4ea.first10_1, ec_stage1_last10: p4ea.last10_1,
    ec_stage4_first10: p4ea.first10_4, ec_stage4_last10: p4ea.last10_4,
    ec_full_path_bit_exact_cross_execution: p4ea.ratio1 === p4eb.ratio1 && p4ea.ratio2 === p4eb.ratio2 && p4ea.ratio3 === p4eb.ratio3 && p4ea.ratio4 === p4eb.ratio4 && p4ea.end1.sha === p4eb.end1.sha && p4ea.end2.sha === p4eb.end2.sha && p4ea.end3.sha === p4eb.end3.sha && p4ea.end4.sha === p4eb.end4.sha,
    seed_e: seedE,
    seed_e_derivation: 'seedE = parseInt(sha256(JSON.stringify(certified-seed.chosen.selected) + "|round10-worldE").slice(0, 8), 16) >>> 0 — deterministic derivation from the SAME certified seed receipt (no new entropy; the different-probe-world first-switch window is a fresh World2 at seedE from its own t=0)',
    DISCLOSED_control_ecascade_stage_ratios: { stage1: p4ea.ratio1, stage2: p4ea.ratio2, stage3: p4ea.ratio3, stage4: p4ea.ratio4 },
    ec_control_end4_norms: p4ea.end4.norms,
    disclosed_note: 'the CONTROL legs of the round-10 SAT10 fourth-switch readouts (registered cascade stage 4 = fresh World2(seedD); E-cascade = the all-hard-world path with the stage-1 window on a fresh World2(seedE)) — computed here because the I-B10 identity unavoidably executes the full control paths (round-7/8/9 disclosure pattern); the DECAYED legs are measured for the first time inside run10; these values gate nothing by themselves (the SAT10 gates act on rho20_4 = ratio4(3e-4)/ratio4(wd0) and rho20_4^E = ratio4^E(3e-4)/ratio4^E(wd0))'
  };
  console.log('I-B10 fourth-switch stage path:', JSON.stringify(I.IB10_fourth_switch_stage_path));
}

// ---------- I-C10: DIP10 anchor identities (the receipted 1x + 0.5x/2x rows) --------------------
{
  const tauOf = (lr) => 1 - K4 * LAT / lr;
  const g02 = gGateFlex(seedU32, 0.2, tauOf(0.2), 0, 150);
  const g015 = gGateFlex(seedU32, 0.15, tauOf(0.15), 0, 200);
  const g025 = gGateFlex(seedU32, 0.25, tauOf(0.25), 0, 120);
  const g015_05 = gGateFlex(seedU32, 0.15, tauOf(0.15), 0, 100);
  const g02_05 = gGateFlex(seedU32, 0.2, tauOf(0.2), 0, 75);
  const g025_05 = gGateFlex(seedU32, 0.25, tauOf(0.25), 0, 60);
  const g015_2 = gGateFlex(seedU32, 0.15, tauOf(0.15), 0, 400);
  const g02_2 = gGateFlex(seedU32, 0.2, tauOf(0.2), 0, 300);
  const g025_2 = gGateFlex(seedU32, 0.25, tauOf(0.25), 0, 240);
  const r9m = run9.metrics_round9;
  I.IC10_dip10_row_anchors = {
    g_02_w150: g02.g_ratio, g_02_bit_exact_vs_run7: g02.g_ratio === run7.metrics_round7.gwin7_g_02,
    g_015_w200: g015.g_ratio, g_015_bit_exact_vs_design6: g015.g_ratio === design6.partC_gwindow.lr0_15_w200.g_ratio,
    g_025_w120: g025.g_ratio, g_025_bit_exact_vs_run7: g025.g_ratio === run7.metrics_round7.gwin7_g_025,
    dip_magnitude_1x: (g015.g_ratio + g025.g_ratio) / 2 - g02.g_ratio,
    dip_magnitude_1x_bit_exact_vs_run8: ((g015.g_ratio + g025.g_ratio) / 2 - g02.g_ratio) === run8.metrics_round8.r8_dip_magnitude,
    g_015_w100_0_5x: g015_05.g_ratio, g_015_0_5x_bit_exact_vs_run9: g015_05.g_ratio === r9m.r9_g_015_w100,
    g_02_w75_0_5x: g02_05.g_ratio, g_02_0_5x_bit_exact_vs_run9: g02_05.g_ratio === r9m.r9_g_02_w75,
    g_025_w60_0_5x: g025_05.g_ratio, g_025_0_5x_bit_exact_vs_run9: g025_05.g_ratio === r9m.r9_g_025_w60,
    g_015_w400_2x: g015_2.g_ratio, g_015_2x_bit_exact_vs_run9: g015_2.g_ratio === r9m.r9_g_015_w400,
    g_02_w300_2x: g02_2.g_ratio, g_02_2x_bit_exact_vs_run9: g02_2.g_ratio === r9m.r9_g_02_w300,
    g_025_w240_2x: g025_2.g_ratio, g_025_2x_bit_exact_vs_run9: g025_2.g_ratio === r9m.r9_g_025_w240
  };
  console.log('I-C10 dip10 row anchors:', JSON.stringify(I.IC10_dip10_row_anchors));
}

// ---------- I-D10: carried GWIN anchor identity ----------
{
  const g = gGateFlex(seedU32, LR3, TAU4, 0, 100);
  I.ID10_gwin_anchor = { g: g.g_ratio, run4_pin: run4.metrics.g_ratio, bit_exact: g.g_ratio === run4.metrics.g_ratio };
  console.log('I-D10 gwin anchor:', JSON.stringify(I.ID10_gwin_anchor));
}

const ids = [I.IE10_jepa4_wd0_identity, I.IA10a_cure_capture_extension, I.IA10b_main_capture_extension, I.IB10_fourth_switch_stage_path, I.IC10_dip10_row_anchors, I.ID10_gwin_anchor];
const bools = [
  I.IE10_jepa4_wd0_identity.losses_bit_exact && I.IE10_jepa4_wd0_identity.weights_bit_exact,
  I.IA10a_cure_capture_extension.D_bit_exact_vs_receipts && I.IA10a_cure_capture_extension.exec_bit_exact && I.IA10a_cure_capture_extension.slow_bit_exact
    && I.IA10a_cure_capture_extension.wc400_bit_exact && I.IA10a_cure_capture_extension.wc20000_bit_exact && I.IA10a_cure_capture_extension.wc75000_bit_exact
    && I.IA10a_cure_capture_extension.all_snapshot_norms_bit_exact_vs_own_ckpts
    && I.IA10a_cure_capture_extension.cross_execution_snapshots_bit_identical,
  I.IA10b_main_capture_extension.D_null_bit_exact && I.IA10b_main_capture_extension.exec_bit_exact && I.IA10b_main_capture_extension.slow_bit_exact
    && I.IA10b_main_capture_extension.slow100k_bit_exact && I.IA10b_main_capture_extension.first10_bit_exact
    && I.IA10b_main_capture_extension.wc400_bit_exact && I.IA10b_main_capture_extension.wc20000_bit_exact && I.IA10b_main_capture_extension.wc75000_bit_exact
    && I.IA10b_main_capture_extension.wc100000_bit_exact && I.IA10b_main_capture_extension.wc500000_bit_exact
    && I.IA10b_main_capture_extension.all_snapshot_norms_bit_exact_vs_own_ckpts
    && I.IA10b_main_capture_extension.cross_execution_snapshots_bit_identical,
  I.IB10_fourth_switch_stage_path.capture_bit_exact_cross_execution && I.IB10_fourth_switch_stage_path.snapshot_sha_bit_exact_vs_design9_control
    && I.IB10_fourth_switch_stage_path.dc_stage1_bit_exact_vs_run7_ctrl20k
    && I.IB10_fourth_switch_stage_path.dc_stage2_bit_exact_vs_run8_ratio2_wd0
    && I.IB10_fourth_switch_stage_path.dc_stage3_bit_exact_vs_run9_ratio3_wd0
    && I.IB10_fourth_switch_stage_path.dc_stage1_end_sha_bit_exact_vs_run8
    && I.IB10_fourth_switch_stage_path.dc_end2_norms_bit_exact_vs_design9
    && I.IB10_fourth_switch_stage_path.dc_end3_norms_bit_exact_vs_design9
    && I.IB10_fourth_switch_stage_path.dc_full_path_bit_exact_cross_execution
    && I.IB10_fourth_switch_stage_path.ec_full_path_bit_exact_cross_execution,
  I.IC10_dip10_row_anchors.g_02_bit_exact_vs_run7 && I.IC10_dip10_row_anchors.g_015_bit_exact_vs_design6 && I.IC10_dip10_row_anchors.g_025_bit_exact_vs_run7
    && I.IC10_dip10_row_anchors.dip_magnitude_1x_bit_exact_vs_run8
    && I.IC10_dip10_row_anchors.g_015_0_5x_bit_exact_vs_run9 && I.IC10_dip10_row_anchors.g_02_0_5x_bit_exact_vs_run9 && I.IC10_dip10_row_anchors.g_025_0_5x_bit_exact_vs_run9
    && I.IC10_dip10_row_anchors.g_015_2x_bit_exact_vs_run9 && I.IC10_dip10_row_anchors.g_02_2x_bit_exact_vs_run9 && I.IC10_dip10_row_anchors.g_025_2x_bit_exact_vs_run9,
  I.ID10_gwin_anchor.bit_exact
];
out.schema = 'quilt-jepa/design-probe-v10';
out.note = 'PRE-SEAL pipeline validation for round 10 — GATES NOTHING. All identities are pipeline checks against already-receipted values (design6, design8, design9, run4, run7, run8, run9); no round-10 claim value is measured here except the DISCLOSED control fourth-switch ratio (registered cascade, I-B10), the DISCLOSED control E-cascade stage ratios (the different-probe-world control path, I-B10), and the interior checkpoint |Wc| norms on the two cured-side arms (I-A10a/I-A10b) — the round-7/8/9 disclosure patterns. The round-10 measurements (the DOSE10 ordering-curve switch ratios at the ladder interior depths 30000/40000/50000 on both arms, the DECAYED fourth-switch legs and rho20_4 on both cascades, the E-cascade decayed path, the 39 DIP10 scan points) happen for the FIRST time inside run10.';
out.seed_u32 = seedU32;
out.seed_b = seedB;
out.seed_c = seedC;
out.seed_d = seedD;
out.seed_e = seedE;
out.seed_d_derivation = 'seedD = parseInt(sha256(JSON.stringify(certified-seed.chosen.selected) + "|round10-worldD").slice(0, 8), 16) >>> 0 — deterministic derivation from the SAME certified seed receipt as rounds 1-9 (no new entropy; the round-10 fourth-switch world is a fresh World2 at seedD from its own t=0)';
out.seed_e_derivation = 'seedE = parseInt(sha256(JSON.stringify(certified-seed.chosen.selected) + "|round10-worldE").slice(0, 8), 16) >>> 0 — deterministic derivation from the SAME certified seed receipt (no new entropy; the different-probe-world first-switch window is a fresh World2 at seedE from its own t=0)';
out.disclosed_pipeline_values = {
  control_fourth_switch_ratio: I.IB10_fourth_switch_stage_path.DISCLOSED_control_fourth_switch_ratio,
  control_fourth_switch_first10: I.IB10_fourth_switch_stage_path.dc_control_fourth_switch_first10,
  control_fourth_switch_last10: I.IB10_fourth_switch_stage_path.dc_control_fourth_switch_last10,
  control_end4_norms: I.IB10_fourth_switch_stage_path.dc_control_end4_norms,
  control_first_switch_ratio: I.IB10_fourth_switch_stage_path.dc_stage1_ratio,
  control_second_switch_ratio: I.IB10_fourth_switch_stage_path.dc_stage2_ratio,
  control_third_switch_ratio: I.IB10_fourth_switch_stage_path.dc_stage3_ratio,
  control_ecascade_stage1_ratio: I.IB10_fourth_switch_stage_path.DISCLOSED_control_ecascade_stage_ratios.stage1,
  control_ecascade_stage2_ratio: I.IB10_fourth_switch_stage_path.DISCLOSED_control_ecascade_stage_ratios.stage2,
  control_ecascade_stage3_ratio: I.IB10_fourth_switch_stage_path.DISCLOSED_control_ecascade_stage_ratios.stage3,
  control_ecascade_stage4_ratio: I.IB10_fourth_switch_stage_path.DISCLOSED_control_ecascade_stage_ratios.stage4,
  control_ecascade_stage1_first10: I.IB10_fourth_switch_stage_path.ec_stage1_first10,
  control_ecascade_stage1_last10: I.IB10_fourth_switch_stage_path.ec_stage1_last10,
  control_ecascade_stage4_first10: I.IB10_fourth_switch_stage_path.ec_stage4_first10,
  control_ecascade_stage4_last10: I.IB10_fourth_switch_stage_path.ec_stage4_last10,
  control_ecascade_end4_norms: I.IB10_fourth_switch_stage_path.ec_control_end4_norms,
  cure_wc_30000: I.IA10a_cure_capture_extension.DISCLOSED_cure_wc_30000,
  cure_wc_40000: I.IA10a_cure_capture_extension.DISCLOSED_cure_wc_40000,
  cure_wc_50000: I.IA10a_cure_capture_extension.DISCLOSED_cure_wc_50000,
  main_wc_30000: I.IA10b_main_capture_extension.DISCLOSED_main_wc_30000,
  main_wc_40000: I.IA10b_main_capture_extension.DISCLOSED_main_wc_40000,
  main_wc_50000: I.IA10b_main_capture_extension.DISCLOSED_main_wc_50000
};
out.all_identities_pass = bools.every(Boolean);
out.identity_count = bools.length;
out.wall_ms = Date.now() - T0;
fs.writeFileSync(path.join(RECEIPTS, 'design10.json'), JSON.stringify(out, null, 1) + '\n');
console.log('all identities pass:', out.all_identities_pass, '(' + bools.filter(Boolean).length + '/' + bools.length + ') wall_ms=' + out.wall_ms);
if (!out.all_identities_pass) process.exit(1);
