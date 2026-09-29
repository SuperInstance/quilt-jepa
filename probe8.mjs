// probe8.mjs — quilt-jepa ROUND 8 (wave 62, lane 62-a). PRE-SEAL pipeline validation —
// GATES NOTHING. Follows the round-7 discipline (probe7/design7): the probe measures NO
// round-8 claim value except the ones DISCLOSED here and bound bit-exact in the run.
// Identities (all must be TRUE for the receipt to say all_identities_pass):
//   I-A  capture-extension identity: the wd0 anchor arm via horizonRun5 WITH captureAt=[20000]
//        reproduces design6's receipted wd0 anchor BIT-EXACTLY (D, executed_to, slow rate,
//        wc norms at 400/20000) and the captured snapshot's |Wc| equals the receipted value —
//        proves the round-8 read-only weight-capture extensions perturb no arithmetic
//        (run7 already receipted the capture-vs-no-capture identity on this arm: P-RLONG7a).
//   I-B  2e-4 registered-prefix identity: a T=20000 'registered'-stop slice of the wd 2e-4 arm
//        reproduces run7.json's receipted slow rate r7_rate_wd2e4 BIT-EXACTLY (the registered
//        prefix of the contrast-cap arm is the same execution; the round-8 REDOSE claim binds
//        this receipt without re-running the arm).
//   I-C  second-switch determinism + DISCLOSED control value: two independent 20000-step wd0
//        control slices capture BIT-IDENTICAL snapshots; the round-8 trivialSwitchProbe2 stage 1
//        reproduces run7's receipted control first-switch ratio 0.7135257300287862 BIT-EXACTLY
//        (arithmetic identity to the carried trivialSwitchProbe proven on the same snapshot);
//        the full capture→switch→second-switch path executed twice is bit-identical. The
//        control's SECOND-switch ratio (fresh World2 at the round-8 derived seedB, 400 steps)
//        is a NEW number the pipeline computes here — DISCLOSED in registration-v8 and bound
//        bit-exact in the run (the round-7 I1 disclosure pattern). It gates nothing by itself:
//        the MECH gates act on rho20_2 = decayed/control, whose decayed leg is NOT measured
//        anywhere pre-seal.
//   I-D  carried GWIN anchor identity: gGateFlex(0.3, W100, wd0) == run4.metrics.g_ratio bit-exact.
//   I-E  Jepa4(seed, wd=0) == Jepa3(seed) 400-step identity (losses AND all three weight
//        matrices) — the carried fail-closed identity re-verified in the round-8 environment.
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
const RLONG_CKPTS = [400, 1000, 5000, 10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000];
const PLAST_STEPS = 400;
const norm64 = (W) => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i] * W[i]; return Math.sqrt(s); };
const relDisp = (W, W0) => { let d = 0, n = 0; for (let i = 0; i < W.length; i++) { const dd = W[i] - W0[i]; d += dd * dd; n += W[i] * W[i]; } return Math.sqrt(d) / Math.sqrt(n); };
const weightSha = (je) => sha(Buffer.concat([Buffer.from(je.Wc.buffer, je.Wc.byteOffset, je.Wc.byteLength),
                                             Buffer.from(je.Wp.buffer, je.Wp.byteOffset, je.Wp.byteLength),
                                             Buffer.from(je.Wt.buffer, je.Wt.byteOffset, je.Wt.byteLength)]));

// ---------- fail-closed seal verification against the LAST SEALED registration (round-7) ----------
const REG = path.join(HERE, 'registration-v7.json');
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
console.log('seal verified (registration-v7): masked sha ' + storedMasked.slice(0, 12) + '… mtime ' + storedMtime);

const design6 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design6.json'), 'utf8'));
const run7 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run7.json'), 'utf8'));
const run4 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run4.json'), 'utf8'));

// ---------- certified seed + the round-8 worldB derivation (registered in registration-v8) ----------
const seedReceipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'certified-seed.json'), 'utf8'));
const selJson = JSON.stringify(seedReceipt.chosen.selected);
const seedU32 = parseInt(sha(selJson).slice(0, 8), 16) >>> 0;
const SEEDB_SUFFIX = '|round8-worldB';
const seedB = parseInt(sha(selJson + SEEDB_SUFFIX).slice(0, 8), 16) >>> 0;
if (seedU32 !== 2133245488) { console.error('seed derivation drift: ' + seedU32); process.exit(2); }
console.log('seed_u32=' + seedU32 + ' seedB=' + seedB + ' (derivation: sha256(selJson' + JSON.stringify(SEEDB_SUFFIX) + ').slice(0,8))');

// ---------- horizonRun5 (verbatim from run7.mjs / probe6 lineage) ----------
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

// ---------- gGateFlex / r1Flex / r2Flex (verbatim from run7.mjs) ----------
function gGateFlex(seedU32, lr, tau, wd, steps) {
  const world = new World(seedU32);
  const jepa = new Jepa4(seedU32, wd);
  jepa.lr = lr; jepa.tau = tau;
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) { world.step(); const o1 = world.observe(); losses.push(jepa.trainStep(obs, o1)); obs = o1; }
  return { g_ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)), g_first10: mean(losses.slice(0, 10)), g_last10: mean(losses.slice(-10)) };
}

// ---------- trivialSwitchProbe (verbatim from run7.mjs — the carried PLAST readout) ----------
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

// ---------- trivialSwitchProbe2 (ROUND 8 — stage 1 arithmetic-identical to trivialSwitchProbe,
// plus end-weight capture and the SECOND switch: a fresh World2 at seedB from its own t=0,
// 400 steps, continuing from the end state of stage 1 with no weight reset) ----------
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

const T0 = Date.now();
const out = { identities: {} };
const I = out.identities;

// ---------- I-E: Jepa4-wd0 identity (carried, cheap, first) ----------
{
  const world = new World2(seedU32);
  const a = new Jepa3(seedU32); a.lr = LR3; a.tau = TAU4;
  const b = new Jepa4(seedU32, 0); b.lr = LR3; b.tau = TAU4;
  const la = [], lb = [];
  let obs = world.observe();
  for (let t = 0; t < 400; t++) { world.step(); const o1 = world.observe(); la.push(a.trainStep(obs, o1)); lb.push(b.trainStep(obs, o1)); obs = o1; }
  let lossesExact = true;
  for (let i = 0; i < la.length; i++) if (la[i] !== lb[i]) { lossesExact = false; break; }
  I.IE_jepa4_wd0_identity = { steps: 400, losses_bit_exact: lossesExact, weights_bit_exact: weightSha(a) === weightSha(b), weights_sha: weightSha(a) };
  console.log('I-E jepa4-wd0 identity:', lossesExact && weightSha(a) === weightSha(b));
}

// ---------- I-A: capture-extension identity on the wd0 anchor arm ----------
{
  const arm = horizonRun5(World2, seedU32, LR3, TAU4, 0, T_HORIZON, 'contrast', RLONG_CKPTS, [20000]);
  const slow = Math.log(arm.checkpoints['20000'].wc_norm / arm.checkpoints['400'].wc_norm) / 19600;
  const d6 = design6.partA_longevity.arms['wd0_anchor'];
  const snapNorm = norm64(arm.snapshots['20000'].Wc);
  I.IA_capture_extension = {
    D: arm.D, D_bit_exact_vs_design6: arm.D === d6.D && arm.D === 30174,
    executed_to: arm.executed_to, exec_bit_exact: arm.executed_to === d6.executed_to,
    slow, slow_bit_exact: slow === d6.slow_inflation_rate,
    wc400: arm.checkpoints['400'].wc_norm, wc400_bit_exact: arm.checkpoints['400'].wc_norm === d6.checkpoints['400'].wc_norm,
    wc20000: arm.checkpoints['20000'].wc_norm, wc20000_bit_exact: arm.checkpoints['20000'].wc_norm === d6.checkpoints['20000'].wc_norm,
    captured_at: arm.captured_at, snapshot_wc_norm: snapNorm,
    snapshot_wc_norm_bit_exact_vs_receipted_20000: snapNorm === d6.checkpoints['20000'].wc_norm
  };
  console.log('I-A capture extension:', JSON.stringify(I.IA_capture_extension));
}

// ---------- I-B: 2e-4 registered-prefix identity vs run7's receipted rate ----------
{
  const slice = horizonRun5(World2, seedU32, LR3, TAU4, 2e-4, 20000, 'registered', [400, 20000], []);
  const slow = Math.log(slice.checkpoints['20000'].wc_norm / slice.checkpoints['400'].wc_norm) / 19600;
  const receipted = run7.metrics_round7.r7_rate_wd2e4;
  I.IB_wd2e4_registered_prefix = {
    T: 20000, stop_rule: 'registered', D: slice.D, executed_to: slice.executed_to,
    wc400: slice.checkpoints['400'].wc_norm, wc20000: slice.checkpoints['20000'].wc_norm,
    slow, receipted_run7_rate_wd2e4: receipted,
    slow_bit_exact_vs_run7: slow === receipted
  };
  console.log('I-B 2e-4 registered prefix:', JSON.stringify(I.IB_wd2e4_registered_prefix));
}

// ---------- I-C: second-switch determinism + DISCLOSED control value ----------
{
  const s1 = horizonRun5(World2, seedU32, LR3, TAU4, 0, 20000, 'registered', [20000], [20000]);
  const s2 = horizonRun5(World2, seedU32, LR3, TAU4, 0, 20000, 'registered', [20000], [20000]);
  const shaOf = (snap) => sha(Buffer.concat([Buffer.from(snap.Wc.buffer, snap.Wc.byteOffset, snap.Wc.byteLength),
                                             Buffer.from(snap.Wp.buffer, snap.Wp.byteOffset, snap.Wp.byteLength),
                                             Buffer.from(snap.Wt.buffer, snap.Wt.byteOffset, snap.Wt.byteLength)]));
  const captureBitExact = shaOf(s1.snapshots['20000']) === shaOf(s2.snapshots['20000']);
  // stage-1 arithmetic identity: probe2's first window == the carried trivialSwitchProbe on the same snapshot
  const carried = trivialSwitchProbe(seedU32, LR3, TAU4, 0, s1.snapshots['20000'], PLAST_STEPS);
  const p2a = trivialSwitchProbe2(seedU32, seedB, LR3, TAU4, 0, s1.snapshots['20000'], PLAST_STEPS);
  const p2b = trivialSwitchProbe2(seedU32, seedB, LR3, TAU4, 0, s2.snapshots['20000'], PLAST_STEPS);
  const receiptedCtrl = run7.metrics_round7.plast_ratio_ctrl20k;
  I.IC_second_switch_determinism = {
    snapshot_step: 20000, wd: 0,
    capture_bit_exact_cross_execution: captureBitExact,
    snapshot_weights_sha: shaOf(s1.snapshots['20000']),
    stage1_carried_ratio: carried.ratio,
    stage1_probe2_ratio: p2a.ratio1,
    stage1_arithmetic_identity_bit_exact: carried.ratio === p2a.ratio1,
    stage1_vs_run7_receipted_ctrl20k_bit_exact: p2a.ratio1 === receiptedCtrl,
    receipted_run7_ctrl20k: receiptedCtrl,
    full_path_bit_exact_cross_execution: p2a.ratio1 === p2b.ratio1 && p2a.ratio2 === p2b.ratio2 && p2a.end_weights_sha === p2b.end_weights_sha,
    seed_b: seedB,
    DISCLOSED_control_second_switch_ratio: p2a.ratio2,
    disclosed_note: 'the control leg of the round-8 MECH second-switch readout — computed here because the I-C identity unavoidably executes the full control path (round-7 I1 disclosure pattern); the DECAYED leg is measured for the first time inside run8; this value gates nothing by itself (the MECH gates act on rho20_2 = decayed/control)',
    control_second_switch_first10: p2a.first10_2, control_second_switch_last10: p2a.last10_2
  };
  console.log('I-C second switch:', JSON.stringify(I.IC_second_switch_determinism));
}

// ---------- I-D: carried GWIN anchor identity ----------
{
  const g = gGateFlex(seedU32, LR3, TAU4, 0, 100);
  I.ID_gwin_anchor = { g: g.g_ratio, run4_pin: run4.metrics.g_ratio, bit_exact: g.g_ratio === run4.metrics.g_ratio };
  console.log('I-D gwin anchor:', JSON.stringify(I.ID_gwin_anchor));
}

const ids = [I.IE_jepa4_wd0_identity, I.IA_capture_extension, I.IB_wd2e4_registered_prefix, I.IC_second_switch_determinism, I.ID_gwin_anchor];
const bools = [
  I.IE_jepa4_wd0_identity.losses_bit_exact && I.IE_jepa4_wd0_identity.weights_bit_exact,
  I.IA_capture_extension.D_bit_exact_vs_design6 && I.IA_capture_extension.exec_bit_exact && I.IA_capture_extension.slow_bit_exact && I.IA_capture_extension.wc400_bit_exact && I.IA_capture_extension.wc20000_bit_exact && I.IA_capture_extension.snapshot_wc_norm_bit_exact_vs_receipted_20000,
  I.IB_wd2e4_registered_prefix.slow_bit_exact_vs_run7,
  I.IC_second_switch_determinism.capture_bit_exact_cross_execution && I.IC_second_switch_determinism.stage1_arithmetic_identity_bit_exact && I.IC_second_switch_determinism.stage1_vs_run7_receipted_ctrl20k_bit_exact && I.IC_second_switch_determinism.full_path_bit_exact_cross_execution,
  I.ID_gwin_anchor.bit_exact
];
out.schema = 'quilt-jepa/design-probe-v8';
out.note = 'PRE-SEAL pipeline validation for round 8 — GATES NOTHING. All identities are pipeline checks against already-receipted values (design6, run7, run4); no round-8 claim value is measured here except the DISCLOSED control second-switch ratio (I-C, the round-7 I1 disclosure pattern). The round-8 measurements (the four new dose-curve switch ratios, the Spearman correlation, the decayed second-switch leg, rho20_2, the guards at 2e-4/2.5e-4, g(0.1, W300)) happen for the FIRST time inside run8.';
out.seed_u32 = seedU32;
out.seed_b = seedB;
out.seed_b_derivation = 'seedB = parseInt(sha256(JSON.stringify(certified-seed.chosen.selected) + "|round8-worldB").slice(0, 8), 16) >>> 0 — deterministic derivation from the SAME certified seed receipt as rounds 1-7 (no new entropy; the round-8 second-switch world is a fresh World2 at seedB from its own t=0)';
out.disclosed_pipeline_values = {
  control_second_switch_ratio: I.IC_second_switch_determinism.DISCLOSED_control_second_switch_ratio,
  control_first_switch_ratio: I.IC_second_switch_determinism.stage1_probe2_ratio,
  control_snapshot_weights_sha: I.IC_second_switch_determinism.snapshot_weights_sha
};
out.all_identities_pass = bools.every(Boolean);
out.identity_count = bools.length;
out.wall_ms = Date.now() - T0;
fs.writeFileSync(path.join(RECEIPTS, 'design8.json'), JSON.stringify(out, null, 1) + '\n');
console.log('all identities pass:', out.all_identities_pass, '(' + bools.filter(Boolean).length + '/' + bools.length + ') wall_ms=' + out.wall_ms);
if (!out.all_identities_pass) process.exit(1);
