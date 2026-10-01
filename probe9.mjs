// probe9.mjs — quilt-jepa ROUND 9 (wave 63, lane 63-b). PRE-SEAL pipeline validation —
// GATES NOTHING. Follows the round-7/8 discipline (probe7/design7, probe8/design8): the probe
// measures NO round-9 claim value except the ones DISCLOSED here and bound bit-exact in the run.
// Identities (all must be TRUE for the receipt to say all_identities_pass):
//   I-E9  Jepa4(seed, wd=0) == Jepa3(seed) 400-step identity (losses AND all three weight
//         matrices) — the carried fail-closed identity re-verified in the round-9 environment.
//   I-A9  CURED-DOSE capture-extension identity: the wd 2e-4 arm via horizonRun5 WITH
//         captureAt=[20000, 75000] (executed twice) reproduces the receipted arm BIT-EXACTLY
//         (D = 85387 == executed_to vs run7/run8, slow rate -3.778708210171146e-6, wc norms at
//         400/20000 vs design8 I-B + run8 metrics8) and each captured snapshot's |Wc| equals the
//         arm's own checkpoint norm bit-exactly; cross-execution snapshot shas bit-identical.
//         Proves the round-9 read-only weight-capture extension perturbs no arithmetic.
//         DISCLOSES wc75000(2e-4) + the two snapshot shas (unavoidably measured by the identity).
//   I-B9  SATURATION-SUCCESSOR stage-path identity + DISCLOSED control value: two independent
//         20000-step wd0 control slices capture BIT-IDENTICAL snapshots; the round-9
//         trivialSwitchProbe3 (stage 1 trivial window -> stage 2 fresh World2(seedB) -> stage 3
//         fresh World2(seedC), no weight reset between stages, each stage 400 steps) executed on
//         the CONTROL arm reproduces run7's receipted control first-switch ratio
//         0.7135257300287862 AND run8's receipted control second-switch ratio 1.17997507686084
//         AND run8's receipted stage-1 end-weights sha BIT-EXACTLY; the full 3-stage path
//         executed twice is bit-identical. The control's THIRD-switch ratio (fresh World2 at the
//         round-9 derived seedC, 400 steps) is a NEW number the pipeline computes here —
//         DISCLOSED in registration-v9 and bound bit-exact in the run (the round-7/8 disclosure
//         pattern). It gates nothing by itself: the SAT9 gates act on
//         rho20_3 = ratio3(3e-4)/ratio3(wd0), whose DECAYED leg is measured for the first time
//         inside run9.
//   I-D9  carried GWIN anchor identity: gGateFlex(0.3, W100, wd0) == run4.metrics.g_ratio.
//   I-F9  DIP9 1x-row anchor identity: gGateFlex at the receipted registered-window row —
//         g(0.2, W150) === run7.metrics_round7.gwin7_g_02, g(0.15, W200) === design6 partC,
//         g(0.25, W120) === run7.metrics_round7.gwin7_g_025 (all three receipted; tau from the
//         carried K4 law) — proves the exact (lr, tau, W, wd=0, trivial world) path DIP9 uses.
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
const WD_CURE = 2e-4; // the round-8 registered cured-dose candidate (round-9 claim arm)
const RLONG_CKPTS = [400, 1000, 5000, 10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000];
const PLAST_STEPS = 400;
const R9_SEEDC_SUFFIX = '|round9-worldC'; // round-9 seedC derivation suffix (registered; no new entropy)
const norm64 = (W) => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i] * W[i]; return Math.sqrt(s); };
const weightSha = (je) => sha(Buffer.concat([Buffer.from(je.Wc.buffer, je.Wc.byteOffset, je.Wc.byteLength),
                                             Buffer.from(je.Wp.buffer, je.Wp.byteOffset, je.Wp.byteLength),
                                             Buffer.from(je.Wt.buffer, je.Wt.byteOffset, je.Wt.byteLength)]));
const snapSha = (snap) => sha(Buffer.concat([Buffer.from(snap.Wc.buffer, snap.Wc.byteOffset, snap.Wc.byteLength),
                                             Buffer.from(snap.Wp.buffer, snap.Wp.byteOffset, snap.Wp.byteLength),
                                             Buffer.from(snap.Wt.buffer, snap.Wt.byteOffset, snap.Wt.byteLength)]));

// ---------- fail-closed seal verification against the LAST SEALED registration (round-8) ----------
const REG = path.join(HERE, 'registration-v8.json');
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
console.log('seal verified (registration-v8): masked sha ' + storedMasked.slice(0, 12) + '… mtime ' + storedMtime);

const design6 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design6.json'), 'utf8'));
const design8 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design8.json'), 'utf8'));
const run7 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run7.json'), 'utf8'));
const run8 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run8.json'), 'utf8'));
const run4 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run4.json'), 'utf8'));

// ---------- certified seed + the round-8/round-9 worldB/worldC derivations ----------
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;
const seedB = parseInt(sha(selJson + '|round8-worldB').slice(0, 8), 16) >>> 0;
const seedC = parseInt(sha(selJson + R9_SEEDC_SUFFIX).slice(0, 8), 16) >>> 0;
if (seedU32 !== 2133245488) { console.error('seed derivation drift: ' + seedU32); process.exit(2); }
if (seedB !== design8.seed_b || seedB !== run8.seed_b) { console.error('seedB derivation drift: ' + seedB); process.exit(2); }
console.log('seed_u32=' + seedU32 + ' seedB=' + seedB + ' (design8/run8-bound) seedC=' + seedC + ' (derivation: sha256(selJson' + JSON.stringify(R9_SEEDC_SUFFIX) + ').slice(0,8))');

// ---------- horizonRun5 (verbatim from run8.mjs / probe8 lineage) ----------
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

// ---------- gGateFlex (verbatim from run8.mjs lineage) ----------
function gGateFlex(seedU32, lr, tau, wd, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  return { g_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), g_first10: mean(losses.slice(0, 10)), g_last10: mean(losses.slice(-10)) };
}

// ---------- trivialSwitchProbe (verbatim — the carried PLAST readout) ----------
function trivialSwitchProbe(seedU32, lr, tau, wd, snap, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  jepa.Wc.set(snap.Wc); jepa.Wp.set(snap.Wp); jepa.Wt.set(snap.Wt);
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  return { ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), first10: mean(losses.slice(0, 10)), last10: mean(losses.slice(-10)) };
}

// ---------- trivialSwitchProbe2 (ROUND 8, verbatim — stage 1 + stage 2) ----------
function trivialSwitchProbe2(seedU32, seedB, lr, tau, wd, snap, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  jepa.Wc.set(snap.Wc); jepa.Wp.set(snap.Wp); jepa.Wt.set(snap.Wt);
  const losses1 = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses1.push(jepa.trainStep(obs, o1)); obs = o1; }
  const endWc = Float32Array.from(jepa.Wc), endWp = Float32Array.from(jepa.Wp), endWt = Float32Array.from(jepa.Wt);
  const world2 = new World2(seedB);
  const losses2 = [];
  obs = world2.observe();
  for (let t = 0; t < steps; t++) { world2.step(); const o1 = world2.observe(); losses2.push(jepa.trainStep(obs, o1)); obs = o1; }
  return {
    ratio1: mean(losses1.slice(-10)) / mean(losses1.slice(0, 10)),
    first10_1: mean(losses1.slice(0, 10)), last10_1: mean(losses1.slice(-10)),
    ratio2: mean(losses2.slice(-10)) / mean(losses2.slice(0, 10)),
    first10_2: mean(losses2.slice(0, 10)), last10_2: mean(losses2.slice(-10)),
    end_weights_sha: sha(Buffer.concat([Buffer.from(endWc.buffer, endWc.byteOffset, endWc.byteLength),
                                        Buffer.from(endWp.buffer, endWp.byteOffset, endWp.byteLength),
                                        Buffer.from(endWt.buffer, endWt.byteOffset, endWt.byteLength)]))
  };
}

// ---------- trivialSwitchProbe3 (ROUND 9 — runner-level addition per registration-v9):
// stages 1 and 2 are ARITHMETIC-IDENTICAL to the carried trivialSwitchProbe2 (same worlds, same
// weights, same 400-step windows — identity bound vs run8's receipted probe2 values on the
// control path in I-B9, and re-bound in-run on BOTH arms); it adds per-stage end-weight capture
// (norms after each stage) and the THIRD switch: a fresh World2(seedC) from its own t=0, 400
// steps, continuing from the end state of stage 2 with NO weight reset between stages. ----------
function trivialSwitchProbe3(seedU32, seedB, seedC, lr, tau, wd, snap, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  jepa.Wc.set(snap.Wc); jepa.Wp.set(snap.Wp); jepa.Wt.set(snap.Wt);
  const normNow = () => ({ wc_norm: norm64(jepa.Wc), wp_norm: norm64(jepa.Wp), wt_norm: norm64(jepa.Wt) });
  const losses1 = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses1.push(jepa.trainStep(obs, o1)); obs = o1; }
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
  return {
    ratio1: mean(losses1.slice(-10)) / mean(losses1.slice(0, 10)),
    first10_1: mean(losses1.slice(0, 10)), last10_1: mean(losses1.slice(-10)),
    ratio2: mean(losses2.slice(-10)) / mean(losses2.slice(0, 10)),
    first10_2: mean(losses2.slice(0, 10)), last10_2: mean(losses2.slice(-10)),
    ratio3: mean(losses3.slice(-10)) / mean(losses3.slice(0, 10)),
    first10_3: mean(losses3.slice(0, 10)), last10_3: mean(losses3.slice(-10)),
    end1, end2, end3
  };
}

const T0 = Date.now();
const out = { identities: {} };
const I = out.identities;

// ---------- I-E9: Jepa4-wd0 identity (carried, cheap, first) ----------
{
  const world = new World2(seedU32);
  const a = new Jepa3(seedU32); a.lr = LR3; a.tau = TAU4;
  const b = new Jepa4(seedU32, 0); b.lr = LR3; b.tau = TAU4;
  const la = [], lb = [];
  let obs = world.observe();
  for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); la.push(a.trainStep(obs, o1)); lb.push(b.trainStep(obs, o1)); obs = o1; }
  let lossesExact = true;
  for (let i = 0; i < la.length; i++) if (la[i] !== lb[i]) { lossesExact = false; break; }
  I.IE9_jepa4_wd0_identity = { steps: 400, losses_bit_exact: lossesExact, weights_bit_exact: weightSha(a) === weightSha(b), weights_sha: weightSha(a) };
  console.log('I-E9 jepa4-wd0 identity:', lossesExact && weightSha(a) === weightSha(b));
}

// ---------- I-A9: cured-dose capture-extension identity on the 2e-4 arm ----------
{
  const armA = horizonRun5(World2, seedU32, LR3, TAU4, WD_CURE, T_HORIZON, 'contrast', RLONG_CKPTS, [20000, 75000]);
  const armB = horizonRun5(World2, seedU32, LR3, TAU4, WD_CURE, T_HORIZON, 'contrast', RLONG_CKPTS, [20000, 75000]);
  const slow = Math.log(armA.checkpoints['20000'].wc_norm / armA.checkpoints['400'].wc_norm) / 19600;
  const receiptedRate = run7.metrics_round7.r7_rate_wd2e4;
  const receiptedD = run7.metrics_round7.r7_D_wd2e4;
  const receiptedExec = run7.metrics_round7.r7_exec_wd2e4;
  const receiptedWc20k = run8.metrics_round8.r8_dose_wc_2e4;
  const receiptedWc400 = design8.identities.IB_wd2e4_registered_prefix.wc400;
  const snapNorm20k = norm64(armA.snapshots['20000'].Wc);
  const snapNorm75k = norm64(armA.snapshots['75000'].Wc);
  I.IA9_cure_capture_extension = {
    capture_at: [20000, 75000],
    D: armA.D, D_bit_exact_vs_receipts: armA.D === receiptedD && armA.D === run8.metrics_round8.r8_D_wd2e4 && armA.D === 85387,
    executed_to: armA.executed_to, exec_bit_exact: armA.executed_to === receiptedExec && armA.executed_to === run8.metrics_round8.r8_exec_wd2e4,
    slow, slow_bit_exact: slow === receiptedRate && slow === run8.metrics_round8.r8_rate_wd2e4,
    wc400: armA.checkpoints['400'].wc_norm, wc400_bit_exact: armA.checkpoints['400'].wc_norm === receiptedWc400,
    wc20000: armA.checkpoints['20000'].wc_norm, wc20000_bit_exact: armA.checkpoints['20000'].wc_norm === receiptedWc20k,
    wc75000: armA.checkpoints['75000'].wc_norm,
    captured_at: armA.captured_at,
    snapshot_wc_norm_20000: snapNorm20k, snapshot_wc_norm_20000_bit_exact_vs_own_ckpt: snapNorm20k === armA.checkpoints['20000'].wc_norm,
    snapshot_wc_norm_75000: snapNorm75k, snapshot_wc_norm_75000_bit_exact_vs_own_ckpt: snapNorm75k === armA.checkpoints['75000'].wc_norm,
    cross_execution_snapshots_bit_identical: snapSha(armA.snapshots['20000']) === snapSha(armB.snapshots['20000'])
      && snapSha(armA.snapshots['75000']) === snapSha(armB.snapshots['75000']) && armA.D === armB.D && armA.executed_to === armB.executed_to,
    snapshot_sha_20000: snapSha(armA.snapshots['20000']),
    snapshot_sha_75000: snapSha(armA.snapshots['75000']),
    DISCLOSED_wc75000: armA.checkpoints['75000'].wc_norm,
    disclosed_note: 'the cured-dose arm\'s 75000-checkpoint |Wc| and both snapshot shas — computed here because the I-A9 identity unavoidably executes the extended-capture path (round-7/8 disclosure pattern); the cured-dose 75000 SWITCH ratios are NOT measured anywhere pre-seal (first measured inside run9)'
  };
  console.log('I-A9 cure capture extension:', JSON.stringify(I.IA9_cure_capture_extension));
}

// ---------- I-B9: saturation-successor stage-path identity + DISCLOSED control third switch ----------
{
  const s1 = horizonRun5(World2, seedU32, LR3, TAU4, 0, 20000, 'registered', [20000], [20000]);
  const s2 = horizonRun5(World2, seedU32, LR3, TAU4, 0, 20000, 'registered', [20000], [20000]);
  const captureBitExact = snapSha(s1.snapshots['20000']) === snapSha(s2.snapshots['20000']);
  const p3a = trivialSwitchProbe3(seedU32, seedB, seedC, LR3, TAU4, 0, s1.snapshots['20000'], PLAST_STEPS);
  const p3b = trivialSwitchProbe3(seedU32, seedB, seedC, LR3, TAU4, 0, s2.snapshots['20000'], PLAST_STEPS);
  const receiptedCtrl1 = run7.metrics_round7.plast_ratio_ctrl20k;                    // 0.7135257300287862
  const receiptedCtrl2 = run8.metrics_round8.r8_ratio2_wd0;                          // 1.17997507686084
  const receiptedCtrlEndSha1 = run8.metrics_round8.r8_end_weights_sha_control;       // probe2 stage-1 end sha
  I.IB9_saturation_stage_path = {
    snapshot_step: 20000, wd: 0,
    capture_bit_exact_cross_execution: captureBitExact,
    snapshot_weights_sha: snapSha(s1.snapshots['20000']),
    stage1_ratio: p3a.ratio1, stage1_bit_exact_vs_run7_ctrl20k: p3a.ratio1 === receiptedCtrl1,
    stage2_ratio: p3a.ratio2, stage2_bit_exact_vs_run8_ratio2_wd0: p3a.ratio2 === receiptedCtrl2,
    stage1_end_sha: p3a.end1.sha, stage1_end_sha_bit_exact_vs_run8: p3a.end1.sha === receiptedCtrlEndSha1,
    full_path_bit_exact_cross_execution: p3a.ratio1 === p3b.ratio1 && p3a.ratio2 === p3b.ratio2
      && p3a.ratio3 === p3b.ratio3 && p3a.end2.sha === p3b.end2.sha && p3a.end3.sha === p3b.end3.sha,
    seed_b: seedB, seed_c: seedC,
    seed_c_derivation: 'seedC = parseInt(sha256(JSON.stringify(certified-seed.chosen.selected) + "|round9-worldC").slice(0, 8), 16) >>> 0 — deterministic derivation from the SAME certified seed receipt (no new entropy; the round-8 seedB pattern)',
    DISCLOSED_control_third_switch_ratio: p3a.ratio3,
    disclosed_note: 'the control leg of the round-9 SAT9 third-switch readout — computed here because the I-B9 identity unavoidably executes the full control path (round-7/8 disclosure pattern); the DECAYED leg is measured for the first time inside run9; this value gates nothing by itself (the SAT9 gates act on rho20_3 = ratio3(3e-4)/ratio3(wd0))',
    control_third_switch_first10: p3a.first10_3, control_third_switch_last10: p3a.last10_3,
    control_end2_norms: p3a.end2.norms, control_end3_norms: p3a.end3.norms
  };
  console.log('I-B9 saturation stage path:', JSON.stringify(I.IB9_saturation_stage_path));
}

// ---------- I-D9: carried GWIN anchor identity ----------
{
  const g = gGateFlex(seedU32, LR3, TAU4, 0, 100);
  I.ID9_gwin_anchor = { g: g.g_ratio, run4_pin: run4.metrics.g_ratio, bit_exact: g.g_ratio === run4.metrics.g_ratio };
  console.log('I-D9 gwin anchor:', JSON.stringify(I.ID9_gwin_anchor));
}

// ---------- I-F9: DIP9 1x-row anchor identity (the receipted registered-window row) ----------
{
  const tauOf = (lr) => 1 - K4 * LAT / lr;
  const g02 = gGateFlex(seedU32, 0.2, tauOf(0.2), 0, 150);
  const g015 = gGateFlex(seedU32, 0.15, tauOf(0.15), 0, 200);
  const g025 = gGateFlex(seedU32, 0.25, tauOf(0.25), 0, 120);
  I.IF9_dip9_row_anchors = {
    g_02_w150: g02.g_ratio, g_02_bit_exact_vs_run7: g02.g_ratio === run7.metrics_round7.gwin7_g_02,
    g_015_w200: g015.g_ratio, g_015_bit_exact_vs_design6: g015.g_ratio === design6.partC_gwindow.lr0_15_w200.g_ratio,
    g_025_w120: g025.g_ratio, g_025_bit_exact_vs_run7: g025.g_ratio === run7.metrics_round7.gwin7_g_025,
    dip_magnitude_1x: (g015.g_ratio + g025.g_ratio) / 2 - g02.g_ratio,
    dip_magnitude_1x_bit_exact_vs_run8: ((g015.g_ratio + g025.g_ratio) / 2 - g02.g_ratio) === run8.metrics_round8.r8_dip_magnitude
  };
  console.log('I-F9 dip9 row anchors:', JSON.stringify(I.IF9_dip9_row_anchors));
}

const ids = [I.IE9_jepa4_wd0_identity, I.IA9_cure_capture_extension, I.IB9_saturation_stage_path, I.ID9_gwin_anchor, I.IF9_dip9_row_anchors];
const bools = [
  I.IE9_jepa4_wd0_identity.losses_bit_exact && I.IE9_jepa4_wd0_identity.weights_bit_exact,
  I.IA9_cure_capture_extension.D_bit_exact_vs_receipts && I.IA9_cure_capture_extension.exec_bit_exact && I.IA9_cure_capture_extension.slow_bit_exact
    && I.IA9_cure_capture_extension.wc400_bit_exact && I.IA9_cure_capture_extension.wc20000_bit_exact
    && I.IA9_cure_capture_extension.snapshot_wc_norm_20000_bit_exact_vs_own_ckpt && I.IA9_cure_capture_extension.snapshot_wc_norm_75000_bit_exact_vs_own_ckpt
    && I.IA9_cure_capture_extension.cross_execution_snapshots_bit_identical,
  I.IB9_saturation_stage_path.capture_bit_exact_cross_execution && I.IB9_saturation_stage_path.stage1_bit_exact_vs_run7_ctrl20k
    && I.IB9_saturation_stage_path.stage2_bit_exact_vs_run8_ratio2_wd0 && I.IB9_saturation_stage_path.stage1_end_sha_bit_exact_vs_run8
    && I.IB9_saturation_stage_path.full_path_bit_exact_cross_execution,
  I.ID9_gwin_anchor.bit_exact,
  I.IF9_dip9_row_anchors.g_02_bit_exact_vs_run7 && I.IF9_dip9_row_anchors.g_015_bit_exact_vs_design6 && I.IF9_dip9_row_anchors.g_025_bit_exact_vs_run7
    && I.IF9_dip9_row_anchors.dip_magnitude_1x_bit_exact_vs_run8
];
out.schema = 'quilt-jepa/design-probe-v9';
out.note = 'PRE-SEAL pipeline validation for round 9 — GATES NOTHING. All identities are pipeline checks against already-receipted values (design6, design8, run4, run7, run8); no round-9 claim value is measured here except the DISCLOSED control third-switch ratio (I-B9) and the cured-dose arm\'s 75000-checkpoint |Wc| + snapshot shas (I-A9) — the round-7/8 disclosure patterns. The round-9 measurements (the decayed third-switch leg, rho20_3, the saturation-curve increments, the end-of-stage Wc compositions, the cured-dose 75000 switch ratios on both arms, the six DIP9 window-scaled g points) happen for the FIRST time inside run9.';
out.seed_u32 = seedU32;
out.seed_b = seedB;
out.seed_c = seedC;
out.seed_c_derivation = 'seedC = parseInt(sha256(JSON.stringify(certified-seed.chosen.selected) + "|round9-worldC").slice(0, 8), 16) >>> 0 — deterministic derivation from the SAME certified seed receipt as rounds 1-8 (no new entropy; the round-9 third-switch world is a fresh World2 at seedC from its own t=0)';
out.disclosed_pipeline_values = {
  control_third_switch_ratio: I.IB9_saturation_stage_path.DISCLOSED_control_third_switch_ratio,
  control_third_switch_first10: I.IB9_saturation_stage_path.control_third_switch_first10,
  control_third_switch_last10: I.IB9_saturation_stage_path.control_third_switch_last10,
  control_first_switch_ratio: I.IB9_saturation_stage_path.stage1_ratio,
  control_second_switch_ratio: I.IB9_saturation_stage_path.stage2_ratio,
  control_snapshot_weights_sha: I.IB9_saturation_stage_path.snapshot_weights_sha,
  control_end2_norms: I.IB9_saturation_stage_path.control_end2_norms,
  control_end3_norms: I.IB9_saturation_stage_path.control_end3_norms,
  cure_wc75000: I.IA9_cure_capture_extension.DISCLOSED_wc75000,
  cure_snapshot_sha_20000: I.IA9_cure_capture_extension.snapshot_sha_20000,
  cure_snapshot_sha_75000: I.IA9_cure_capture_extension.snapshot_sha_75000
};
out.all_identities_pass = bools.every(Boolean);
out.identity_count = bools.length;
out.wall_ms = Date.now() - T0;
fs.writeFileSync(path.join(RECEIPTS, 'design9.json'), JSON.stringify(out, null, 1) + '\n');
console.log('all identities pass:', out.all_identities_pass, '(' + bools.filter(Boolean).length + '/' + bools.length + ') wall_ms=' + out.wall_ms);
if (!out.all_identities_pass) process.exit(1);
