#!/usr/bin/env python3
# build_run10_stage3.py — staging path, header row, verdict rows, verdicts regex.
import sys

out = open('/tmp/run10_stage2.mjs', encoding='utf-8').read()

def rep(old, new, label):
    global out
    n = out.count(old)
    if n != 1:
        print(f'FAIL [{label}]: {n} matches'); sys.exit(1)
    out = out.replace(old, new)

# ---------------------------------------------------------------- 10. staging path
rep("const STAGING = path.join(RECEIPTS, '.run9-staging.json');",
    "const STAGING = path.join(RECEIPTS, '.run10-staging.json');",
    'staging-path')

# ---------------------------------------------------------------- 11. header chain row
old_header = """chain.add('header', {
  repo: 'quilt-jepa', round: 9, executed_in: 'wave 63 (lane 63-b)', seed_u32: seedU32,
  seed_b: parseInt(sha(selJson + R8_SEEDB_SUFFIX).slice(0, 8), 16) >>> 0,
  seed_b_derivation: 'seedB = parseInt(sha256(selJson + "|round8-worldB").slice(0, 8), 16) >>> 0 — registered round-8 derivation (no new entropy), re-bound vs design8.seed_b AND run8.seed_b',
  seed_c: parseInt(sha(selJson + R9_SEEDC_SUFFIX).slice(0, 8), 16) >>> 0,
  seed_c_derivation: 'seedC = parseInt(sha256(selJson + "|round9-worldC").slice(0, 8), 16) >>> 0 — registered round-9 derivation from the SAME certified seed receipt (no new entropy), fail-closed vs design9.seed_c',
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration-v9.json (sealed pre-run, self_sha256_masked 84de8046… + mtime 1790900000000; RE-VERIFIED fail-closed at this run\\'s startup)',
  scope: 'round-4/5/6/7/8 operating point UNCHANGED (lr 0.3, tau 0.99998, K4 1.5e-6, amp 0.9; core/ byte-untouched) — THE CURED-DOSE ROUND: all nineteen round-4..8 claims re-scored under their UNCHANGED rules (the honest round-8 MECH FAIL carries; run4 29/29, run5 92/92, design6 AND run6 AND run7 AND run8 bit-exact at all four metric layers, sha-level chain to run8.json R4 row ff60c211/7a20e613/30657dbe/34ec241a) + 3 new claims: CURE9 cured-dose re-registration (wd 2e-4 re-bound bit-exact + plasticity at its OWN dose at 20k re-bound and 75000 NEW + dose-ordering extended to 75k + |Wc|-room composition at 75k + D-ratio band [2.5, 3.2] declared re-scoring), SAT9 saturation successor (THIRD switch on fresh World2(seedC = 2856986428): pre-registered CONCAVE-SATURATION curve rho20_3 ∈ [rho20_2, 1) with non-expanding increment + Wc-room persistence through switches), DIP9 dip-law shape (the {0.15, 0.2, 0.25} mini-grid at 0.5x/2x W scalings: local-min survival + depth monotone in W + monotone recovery along W)',
  resume_repair: '63-b-r lane repair (receipt-assembly only; zero arithmetic, zero gate change, core/ byte-untouched): the prior incarnation died pre-receipt — its staged runner referenced coreRun8-internal locals (arms7/m0) OUT OF SCOPE in the design9 snapshot-sha binding rows, and staging drops snapshot bytes by design (pack()), so both the prior execution and the first resumed one died at a ReferenceError BEFORE any receipt write. Repair: coreRun8 computes the three registered design9 snapshot shas (cure 20000/75000, control 20000 — P-R4 "bound bit-exact in the run") from the LIVE snapshots into the side-channel out6.snap_shas (outside every metrics layer — the five metric-layer shas are byte-unchanged and still bind the staged first executions); the assembly binds them from the snap_shas-carrying execution FAIL-CLOSED (a snap_shas-less staged coreRun8 #2 is re-executed fresh, its metrics re-bound to the staged twin at all five R4 layers). The pre-repair staging state is committed as a receipt (02c5389).',
  probe_provenance: 'probe9.mjs/design9.json receipted PRE-SEAL with 5 fail-closed pipeline identities (I-E9 Jepa4-wd0; I-A9 cured-dose capture-extension on the 2e-4 arm; I-B9 saturation stage-path identity + control third-switch disclosure; I-D9 GWIN anchor; I-F9 DIP9 1x-row anchors) — ALL TRUE; the I-B9 identity unavoidably computed the CONTROL third-switch ratio (0.7354070016984524 — disclosed in registration-v9 and bound bit-exact here; the disclosed fact that the control RE-ADAPTS within the third-switch window, unlike the second, is folded into the SAT9 registration) and the I-A9 identity the cured arm\\'s 75000-checkpoint |Wc| (8.691686529662682) and both snapshot shas; no other round-9 claim value measured pre-seal (no decayed third-switch leg, no rho20_3, no saturation increment, no 75000 switch ratio on either arm, no wc75(3e-4), no window-scaled g point)'
});"""
new_header = """chain.add('header', {
  repo: 'quilt-jepa', round: 10, executed_in: 'wave 64 (lane 64-b-r)', seed_u32: seedU32,
  seed_b: parseInt(sha(selJson + R8_SEEDB_SUFFIX).slice(0, 8), 16) >>> 0,
  seed_b_derivation: 'seedB = parseInt(sha256(selJson + "|round8-worldB").slice(0, 8), 16) >>> 0 — registered round-8 derivation (no new entropy), re-bound vs design8.seed_b AND run8.seed_b',
  seed_c: parseInt(sha(selJson + R9_SEEDC_SUFFIX).slice(0, 8), 16) >>> 0,
  seed_c_derivation: 'seedC = parseInt(sha256(selJson + "|round9-worldC").slice(0, 8), 16) >>> 0 — registered round-9 derivation from the SAME certified seed receipt (no new entropy), fail-closed vs design9.seed_c',
  seed_d: parseInt(sha(selJson + R10_SEEDD_SUFFIX).slice(0, 8), 16) >>> 0,
  seed_d_derivation: 'seedD = parseInt(sha256(selJson + "|round10-worldD").slice(0, 8), 16) >>> 0 — registered round-10 derivation from the SAME certified seed receipt (no new entropy), fail-closed vs design10.seed_d',
  seed_e: parseInt(sha(selJson + R10_SEEDE_SUFFIX).slice(0, 8), 16) >>> 0,
  seed_e_derivation: 'seedE = parseInt(sha256(selJson + "|round10-worldE").slice(0, 8), 16) >>> 0 — registered round-10 derivation from the SAME certified seed receipt (no new entropy), fail-closed vs design10.seed_e',
  seed_receipt: { label: seedReceipt.label, mode: seedReceipt.mode, schema: seedReceipt.schema, note: seedReceipt.note },
  registration: 'registration-v10.json (sealed pre-run, self_sha256_masked 4802bc85… + mtime 1791100000000; RE-VERIFIED fail-closed at this run\\'s startup)',
  scope: 'round-4/5/6/7/8/9 operating point UNCHANGED (lr 0.3, tau 0.99998, K4 1.5e-6, amp 0.9; core/ byte-untouched) — THE DEPTH-LADDER ROUND: all twenty-five round-4..9 claims re-scored under their UNCHANGED rules (the honest round-8 MECH FAIL and round-9 CURE9/DIP9 FAILs carry, SAT9 re-binds PASS; run4 29/29, run5 92/92, design6 AND run6 AND run7 AND run8 AND run9 bit-exact at all five metric layers, sha-level chain to run9.json R4 row ff60c211/7a20e613/30657dbe/34ec241a/c972511d) + 3 new claims: DOSE10 the dose decision via |Wc|-room ordering across a depth ladder {20000, 30000, 40000, 50000, 75000} on BOTH decayed arms (20k/75k re-bind run8/run9 bit-exact, 30k/40k/50k NEW; pre-registered ordering-curve law Delta strictly decreasing with exactly one sign crossing; DECISION RULE of record on PASS: wd 2e-4 CONFIRMED as the plasticity dose of the two-dose regime for round 11, 3e-4 UNCHANGED as longevity main, |Wc|-room RE-PRICED depth-refuted, dose-selection CLOSED), SAT10 fourth-switch plateau on TWO cascades (registered D-cascade trivial/seedB/seedC/seedD: FLAT-PLATEAU rho20_4 ∈ [rho20_3, 1) with inc4 <= inc3; DIFFERENT-PROBE-WORLD E-cascade with stage-1 on World2(seedE): rho20_4^E < 1.0; composition end-4 legs on both), DIP10 dip W-domain boundaries (THIRTY-NINE new g-points at THIRTEEN window scales: BIRTH localMin(0.95) TRUE + left holds at 0.9 fails at 0.55 + right holds at every low scale; DEATH localMin(1.75) FALSE + localMin(1.1) TRUE; INTERVAL <= 1 flip per ladder; GATE DOMAIN dipmag(0.55) < 0.05 AND dipmag(1.75) < 0.05)',
  resume_receipt: '64-b → 64-b-r (wave 64): the prior incarnation (64-b) died on a backend result-return deadline AFTER the design probe but BEFORE registration — the keeper-verified resume state (untracked probe10.mjs + receipts/design10.json, repo clean at e52a1fb2 == remote) is committed unchanged in the registration commit aee0335 (probe + design10 receipted PRE-SEAL, audited vs the round-7/8/9 conventions and re-verified against run7/run8/run9/design6/design8/design9 receipts bit-exactly). No round-10 measurement of any kind happened before this registration was sealed AND pushed (aee0335, remote==local verified).',
  probe_provenance: 'probe10.mjs/design10.json receipted PRE-SEAL with 6 fail-closed pipeline identities (I-E10 Jepa4-wd0; I-A10a cure-arm capture-extension over the depth ladder; I-A10b main-arm capture-extension; I-B10 fourth-switch stage-path + disclosed control legs on BOTH cascades; I-C10 the twelve receipted DIP anchors; I-D10 GWIN anchor) — ALL TRUE; the I-B10 identity unavoidably computed the CONTROL fourth-switch ratios (D-cascade 0.976422859819224; E-cascade stages 0.7339388216462988 / 1.1899577897104565 / 0.7320487218963793 / 0.9776795481211076 — disclosed in registration-v10 and bound bit-exact here) and the I-A10a identity the cured arm\\'s interior checkpoint |Wc| norms (30000/40000/50000: 10.284571782125024 / 9.687502951781555 / 9.25800362624802 — NEW numbers, the round-7/8 receipts carry only the 400/20000/75000 norms of this arm) and the I-A10b identity the main arm\\'s interior norms (design6 re-binds); no other round-10 claim value measured pre-seal (no decayed fourth-switch leg on either cascade, no rho20_4, no rho20_4^E, no ladder switch ratio at 30000/40000/50000 on either arm, no DIP10 scan point)'
});"""
rep(old_header, new_header, 'header-row')

# ---------------------------------------------------------------- 12. verdict rows (insert before R4 block)
anchor12 = "// R4: twin determinism + cross-round/probe bit-identity\n{"
verdicts = '''// DOSE10: the dose decision via the depth-ladder ordering curve (round-10 claim 1) — verdict rule VERBATIM from registration-v10
{
  const p = q1.metrics10;
  const R = run9Receipt.metrics_round9;
  const d10 = design10.disclosed_pipeline_values;
  const L = R10_LADDER.map(String);
  const checks = {
    rate_2e4_bit_exact: p.r10_rate_wd2e4 === run7Receipt.metrics_round7.r7_rate_wd2e4 && p.r10_rate_wd2e4 === -3.778708210171146e-6,
    rate_negative: p.r10_rate_wd2e4 < 0,
    D_bit_exact_85387: p.r10_D_wd2e4 === 85387 && p.r10_D_wd2e4 === run7Receipt.metrics_round7.r7_D_wd2e4 && p.r10_D_wd2e4 === run8Receipt.metrics_round8.r8_D_wd2e4,
    exec_bit_exact_85387: p.r10_exec_wd2e4 === 85387 && p.r10_exec_wd2e4 === run8Receipt.metrics_round8.r8_exec_wd2e4,
    main_arm_bound: p.r10_D_main === null && p.r10_exec_main === 500000,
    ratio_2e4_20k_bit_exact: p.r10_ratio_2e4_20000 === run8Receipt.metrics_round8.r8_dose_ratio_2e4 && p.r10_ratio_2e4_20000 === 0.6841500024733943,
    ratio_3e4_20k_bit_exact: p.r10_ratio_3e4_20000 === run7Receipt.metrics_round7.plast_ratio_20k && p.r10_ratio_3e4_20000 === 0.6644108562180416,
    ratio_2e4_75k_bit_exact: p.r10_ratio_2e4_75000 === R.r9_ratio_2e4_75000 && p.r10_ratio_2e4_75000 === 0.5507446127932,
    ratio_3e4_75k_bit_exact: p.r10_ratio_3e4_75000 === R.r9_ratio_3e4_75000 && p.r10_ratio_3e4_75000 === 0.5980059011717661,
    wc_ladder_2e4_bit_exact: p.r10_wc_2e4_20000 === 11.130270846539293 && p.r10_wc_2e4_20000 === run8Receipt.metrics_round8.r8_dose_wc_2e4 && p.r10_wc_2e4_30000 === d10.cure_wc_30000 && p.r10_wc_2e4_40000 === d10.cure_wc_40000 && p.r10_wc_2e4_50000 === d10.cure_wc_50000 && p.r10_wc_2e4_75000 === R.r9_ckpt_wc75_2e4 && p.r10_wc_2e4_75000 === 8.691686529662682,
    wc_ladder_3e4_bit_exact: p.r10_wc_3e4_20000 === design6.partA_longevity.arms['wd3e-4_main'].checkpoints['20000'].wc_norm && p.r10_wc_3e4_20000 === 9.769638164817229 && p.r10_wc_3e4_30000 === d10.main_wc_30000 && p.r10_wc_3e4_40000 === d10.main_wc_40000 && p.r10_wc_3e4_50000 === d10.main_wc_50000 && p.r10_wc_3e4_75000 === R.r9_ckpt_wc75_3e4 && p.r10_wc_3e4_75000 === 6.443616949719879,
    wc_capture_validated: p.r10_wc_capture_validated === true,
    engage_all_depths_both_arms: L.every((k) => p['r10_ratio_2e4_' + k] < 1.0 && p['r10_ratio_3e4_' + k] < 1.0),
    delta_strictly_decreasing: p.r10_delta_strictly_decreasing === true,
    delta_single_crossing: p.r10_sign_crossings === 1 && p.r10_delta_20000 > 0 && p.r10_delta_75000 < 0,
    dstar_bracketed: p.r10_dstar !== null && p.r10_dstar > 20000 && p.r10_dstar <= 75000,
    all_finite: p.r10_dose_all_finite
  };
  chain.add('DOSE10_dose_decision_depth_ladder', {
    law: 'the round-9 CURE9 ordering-reversal FAIL deferred the dose decision with the reversal as the priced question; round 10 re-prices the ordering as a DEPTH LAW: the switch ratio on BOTH decayed arms at ALL FIVE shared-finite ladder depths (each arm at its own dose, the carried PLAST convention, the round-9 75k probe class), the pre-registered ordering-curve law Delta(d) = ratio(2e-4, d) - ratio(3e-4, d) STRICTLY DECREASING with EXACTLY ONE sign crossing d* (the receipted endpoints +0.01973914625535267 / -0.047261288378566135 are declared re-scoring anchors), all-engage legs, the |Wc| ladder re-bound bit-exact',
    ladder: Object.fromEntries(L.map((k) => [k, { ratio_2e4: p['r10_ratio_2e4_' + k], ratio_3e4: p['r10_ratio_3e4_' + k], delta: p['r10_delta_' + k], wc_2e4: p['r10_wc_2e4_' + k], wc_3e4: p['r10_wc_3e4_' + k], first10_2e4: p['r10_first10_2e4_' + k], last10_2e4: p['r10_last10_2e4_' + k], first10_3e4: p['r10_first10_3e4_' + k], last10_3e4: p['r10_last10_3e4_' + k] }])),
    ordering_curve: { delta_strictly_decreasing: p.r10_delta_strictly_decreasing, sign_crossings: p.r10_sign_crossings, d_star: p.r10_dstar, d_star_meaning: 'the first ladder depth where ratio(2e-4) < ratio(3e-4) — the milder cure becomes the faster re-adapter from here to the deepest shared-finite state' },
    mechanism_finding_gate_nothing: { spearman_pooled_wc_vs_ratio: p.r10_spearman_pooled, wc_gap_by_depth: Object.fromEntries(L.map((k) => [k, p['r10_wc_2e4_' + k] - p['r10_wc_3e4_' + k]])), note: 'the receipted |Wc| gap GROWS monotonically with depth (1.36 -> 2.25) while the ordering INVERTS — |Wc| room cannot be the ordering carrier at depth (the round-8 20k law, Spearman 1.0, re-scored pooled across the ladder)' },
    checks, all_checks_pass: Object.values(checks).every(Boolean),
    fail_branches_priced: 're-bind fails = infra drift (RETAIN wd 3e-4 outright, candidate demoted); engage fails at any depth on either arm = the plasticity advantage is not robust across the finite ladder (decision DEFERRED again, 2e-4 stays candidate-only); the curve is not strictly decreasing or has multiple crossings = the reversal is NOT a lawful depth phenomenon (ordering mechanism re-priced as multi-factor, decision DEFERRED, 2e-4 neither confirmed nor demoted)',
    decision_on_pass: 'wd 2e-4 CONFIRMED as the plasticity dose of the TWO-DOSE REGIME for round 11 (the cured dose of record for deep-window re-adaptation — the faster re-adapter at every ladder depth >= d*, including the deepest shared-finite state 75000); wd 3e-4 REMAINS the longevity main dose UNCHANGED (and the receipted faster re-adapter for shallow windows d < d*); the |Wc|-room mechanism is RE-PRICED depth-refuted as the ordering carrier; the dose-selection question is CLOSED — the crossing law d* joins the operating point of record',
    claim: 'THE DOSE DECISION: the ordering reversal is a lawful depth phenomenon (single crossing) and the cured dose engages at every finite depth on both arms',
    pass: Object.values(checks).every(Boolean),
    void_as_gated: !gPass
  });
}
// SAT10: fourth-switch plateau on two cascades (round-10 claim 2) — verdict rule VERBATIM from registration-v10
{
  const p = q1.metrics10;
  const d10 = design10.disclosed_pipeline_values;
  const checks = {
    dc_stage1_decayed_bit_exact: p.r10_dc_stage1_decayed === 0.6644108562180416 && p.r10_dc_stage1_decayed === q1.metrics8.r8_stage1_decayed,
    dc_stage2_decayed_bit_exact: p.r10_dc_stage2_decayed === 1.1268925734915027 && p.r10_dc_stage2_decayed === q1.metrics8.r8_ratio2_3e4,
    dc_end1_sha_decayed_bit_exact: p.r10_dc_end1_sha_decayed === q1.metrics8.r8_end_weights_sha_decayed,
    dc_stage3_decayed_rebinds_run9: p.r10_dc_stage3_decayed === run9Receipt.metrics_round9.r9_ratio3_3e4 && p.r10_dc_stage3_decayed === q1.metrics9.r9_ratio3_3e4,
    dc_stage1_control_bit_exact: p.r10_dc_stage1_control === 0.7135257300287862 && p.r10_dc_stage1_control === q1.metrics9.r9_stage1_control,
    dc_stage2_control_bit_exact: p.r10_dc_stage2_control === 1.17997507686084 && p.r10_dc_stage2_control === q1.metrics9.r9_stage2_control,
    dc_end1_sha_control_bit_exact: p.r10_dc_end1_sha_control === q1.metrics8.r8_end_weights_sha_control && p.r10_dc_end1_sha_control === q1.metrics9.r9_end1_sha_control,
    dc_stage3_control_bit_exact: p.r10_dc_stage3_control === 0.7354070016984524 && p.r10_dc_stage3_control === design9.disclosed_pipeline_values.control_third_switch_ratio,
    dc_stage4_control_design10_bit_exact: p.r10_dc_ratio4_control === d10.control_fourth_switch_ratio,
    plateau_persists: p.r10_rho20_4 >= q1.metrics9.r9_rho20_3 && p.r10_rho20_4 < 1.0,
    increment_not_expanding: p.r10_inc4 <= q1.metrics9.r9_inc3,
    composition_end2: p.r10_dc_end2_wc_decayed < p.r10_dc_end2_wc_control,
    composition_end3: p.r10_dc_end3_wc_decayed < p.r10_dc_end3_wc_control,
    composition_end4: p.r10_dc_end4_wc_decayed < p.r10_dc_end4_wc_control && p.r10_dc_end4_wc_control === d10.control_end4_norms.wc_norm,
    ec_stage1_control_bit_exact: p.r10_ec_stage1_control === d10.control_ecascade_stage1_ratio,
    ec_stage2_control_bit_exact: p.r10_ec_stage2_control === d10.control_ecascade_stage2_ratio,
    ec_stage3_control_bit_exact: p.r10_ec_stage3_control === d10.control_ecascade_stage3_ratio,
    ec_stage4_control_bit_exact: p.r10_ec_stage4_control === d10.control_ecascade_stage4_ratio,
    ec_advantage_persists: p.r10_rho20_4_E < 1.0,
    ec_composition_end4: p.r10_ec_end4_wc_decayed < p.r10_ec_end4_wc_control && p.r10_ec_end4_wc_control === d10.control_ecascade_end4_norms.wc_norm,
    all_finite: p.r10_sat_all_finite
  };
  chain.add('SAT10_fourth_switch_plateau', {
    law: 'the round-9 SAT9 finding (curve FLAT at rho20_3 = 0.9553466155442152, increment collapsed 71x to 0.0003327380566972016, trivial-world readout only) prices its successor on a FOURTH switch over TWO cascades (both from the arms\\' own 20k snapshots, no weight reset, 400 steps/stage, both arms at their own dose): the registered D-cascade (trivial -> World2(seedB = 1657638767) -> World2(seedC = 2856986428) -> World2(seedD = 808219675)) with the pre-registered FLAT-PLATEAU continuation rho20_4 ∈ [rho20_3, 1) and non-expanding increment, and the DIFFERENT-PROBE-WORLD E-cascade (stage-1 window on a fresh World2(seedE = 3972732037) — the round-9 trivial-world caveat\\'s priced answer) with rho20_4^E < 1.0; the control\\'s D-cascade stage-4 leg (0.976422859819224) and E-cascade stage-1..4 legs are the design10 disclosures, bound bit-exact; ALL decayed fourth-switch legs are first measured in run10',
    stages: {
      dcascade_decayed_3e4: { ratio1: p.r10_dc_stage1_decayed, ratio2: p.r10_dc_stage2_decayed, ratio3: p.r10_dc_stage3_decayed, ratio4: p.r10_dc_ratio4_decayed, first10_4: p.r10_dc_first10_4_decayed, last10_4: p.r10_dc_last10_4_decayed, end_wc: { after2: p.r10_dc_end2_wc_decayed, after3: p.r10_dc_end3_wc_decayed, after4: p.r10_dc_end4_wc_decayed } },
      dcascade_control_wd0: { ratio1: p.r10_dc_stage1_control, ratio2: p.r10_dc_stage2_control, ratio3: p.r10_dc_stage3_control, ratio4: p.r10_dc_ratio4_control, first10_4: p.r10_dc_first10_4_control, last10_4: p.r10_dc_last10_4_control, end_wc: { after2: p.r10_dc_end2_wc_control, after3: p.r10_dc_end3_wc_control, after4: p.r10_dc_end4_wc_control } },
      ecascade_decayed_3e4: { ratio1: p.r10_ec_stage1_decayed, ratio2: p.r10_ec_stage2_decayed, ratio3: p.r10_ec_stage3_decayed, ratio4: p.r10_ec_stage4_decayed, first10_4: p.r10_ec_first10_4_decayed, last10_4: p.r10_ec_last10_4_decayed, end4_wc: p.r10_ec_end4_wc_decayed },
      ecascade_control_wd0: { ratio1: p.r10_ec_stage1_control, ratio2: p.r10_ec_stage2_control, ratio3: p.r10_ec_stage3_control, ratio4: p.r10_ec_stage4_control, first10_4: p.r10_ec_first10_4_control, last10_4: p.r10_ec_last10_4_control, end4_wc: p.r10_ec_end4_wc_control }
    },
    saturation_curve: { rho20_1: q1.metrics9.r9_rho20_1, rho20_2: q1.metrics9.r9_rho20_2, rho20_3: q1.metrics9.r9_rho20_3, rho20_4: p.r10_rho20_4, rho20_4_E: p.r10_rho20_4_E, inc3: q1.metrics9.r9_inc3, inc4: p.r10_inc4, expected_branch: 'rho20_4 ∈ [rho20_3, 1) AND inc4 <= inc3 (FLAT PLATEAU) AND rho20_4^E < 1.0 (advantage persists in the different probe world)' },
    seeds: { seed_d: p.r10_seed_d, seed_e: p.r10_seed_e },
    checks, all_checks_pass: Object.values(checks).every(Boolean),
    fail_branches_priced: 'rho20_4 >= 1 = WASHOUT at the fourth switch (the plateau breaks); rho20_4 < rho20_3 = COMPOUNDING RESUMES (contradicts the round-8/9 sealed findings, re-opens the question); inc4 > inc3 while rho20_4 < 1 = EXPANDING STEPS (convex wash-out precursor); rho20_4^E >= 1 = the plateau is a TRIVIAL-WORLD ARTIFACT (the advantage does not survive the all-hard-world cascade); a composition leg fails = the room is consumed by re-adaptation',
    claim: 'FOURTH-SWITCH PLATEAU: the plasticity advantage holds flat through the fourth switch on the registered cascade AND persists in a different probe world, with its |Wc|-room carrier intact',
    pass: Object.values(checks).every(Boolean),
    void_as_gated: !gPass
  });
}
// DIP10: dip W-domain boundaries (round-10 claim 3) — verdict rule VERBATIM from registration-v10
{
  const p = q1.metrics10;
  const S = p.r10_dip_scan;
  const LOW = R10_DIP_SCALES_LOW.map(String), HIGH = R10_DIP_SCALES_HIGH.map(String);
  const checks = {
    anchor_02_bit_exact: q1.metrics9.r9_g02_w150 === run7Receipt.metrics_round7.gwin7_g_02,
    anchor_015_bit_exact: q1.partC.lr0_15_w200.g_ratio === design6.partC_gwindow.lr0_15_w200.g_ratio,
    anchor_025_bit_exact: q1.metrics7.gwin7_g_025 === run7Receipt.metrics_round7.gwin7_g_025,
    dipmag_1x_bit_exact: q1.metrics9.r9_dipmag_1x === q1.metrics8.r8_dip_magnitude && q1.metrics9.r9_dipmag_1x === 0.0736349882819407,
    row_05x_rebinds_run9: q1.metrics9.r9_g_015_w100 === run9Receipt.metrics_round9.r9_g_015_w100 && q1.metrics9.r9_g_02_w75 === run9Receipt.metrics_round9.r9_g_02_w75 && q1.metrics9.r9_g_025_w60 === run9Receipt.metrics_round9.r9_g_025_w60,
    row_2x_rebinds_run9: q1.metrics9.r9_g_015_w400 === run9Receipt.metrics_round9.r9_g_015_w400 && q1.metrics9.r9_g_02_w300 === run9Receipt.metrics_round9.r9_g_02_w300 && q1.metrics9.r9_g_025_w240 === run9Receipt.metrics_round9.r9_g_025_w240,
    birth_localmin_095: S['0.95'].localmin === true,
    birth_left_09: S['0.9'].left === true,
    birth_left_fails_055: S['0.55'].left === false,
    birth_right_all_low: LOW.every((k) => S[k].right === true),
    death_localmin_175_false: S['1.75'].localmin === false,
    death_localmin_11_true: S['1.1'].localmin === true,
    interval_low_flips_le_1: p.r10_dip_low_flips <= 1,
    interval_high_flips_le_1: p.r10_dip_high_flips <= 1,
    gate_low: S['0.55'].dipmag < 0.05,
    gate_high: S['1.75'].dipmag < 0.05,
    all_finite: p.r10_dip_all_finite
  };
  chain.add('DIP10_dip_w_domain', {
    law: 'the round-9 DIP9 FAIL proved the lr-0.2 dip\\'s local-minimum shape is WINDOW-FRAGILE on both sides (0.5x kills the left flank, 2x makes the site a local max) and priced this round\\'s boundary mapping: the {0.15, 0.2, 0.25} mini-grid at THIRTEEN window scales W_s(lr) = round(s*30/lr) — LOW {0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95} bracketing the birth, HIGH {1.1, 1.25, 1.5, 1.75} bracketing the death — THIRTY-NINE new points, tau from the carried K4 law, wd 0, trivial world; pre-registered: BIRTH (localMin(0.95) TRUE, left inequality holds at 0.9 fails at 0.55, right inequality holds at EVERY low scale), DEATH (localMin(1.75) FALSE, localMin(1.1) TRUE), INTERVAL (<= 1 localMin flip along each ordered ladder), GATE DOMAIN (dipmag(0.55) < 0.05 AND dipmag(1.75) < 0.05)',
    scan: Object.fromEntries([...LOW, ...HIGH].map((k) => [k, { w015: S[k].w015, w020: S[k].w020, w025: S[k].w025, g015: S[k].g015, g020: S[k].g020, g025: S[k].g025, dipmag: S[k].dipmag, left: S[k].left, right: S[k].right, localmin: S[k].localmin }])),
    domain_of_record: { birth_scale_low: p.r10_dip_birth_low, death_scale_high: p.r10_dip_death_high, low_flips: p.r10_dip_low_flips, high_flips: p.r10_dip_high_flips, note: 'the W-domain boundary brackets of record — receipted findings, gate-nothing beyond the registered inequalities' },
    checks, all_checks_pass: Object.values(checks).every(Boolean),
    fail_branches_priced: 'localMin(0.95) false = the shape is NOT recovered at any priced scale below the registered window (1x is an ISOLATED survivor); the right-inequality leg fails at any low scale = the dip\\'s right flank is also window-fragile under contraction; localMin(1.75) true = the death is later than priced (re-bracketed between 1.75x and 2x); localMin(1.1) false = the death is earlier than priced (re-bracketed between 1.0 and 1.1); more than one flip on either ladder = the W-domain is FRAGMENTED (the dip is not a single structural feature of the W axis); a gate leg fails = the 0.05 gate\\'s domain extends beyond a ladder extreme',
    claim: 'DIP W-DOMAIN: the local-minimum shape is born and dies inside bracketed scale intervals — the W-domain of the dip law is an interval containing the registered window, with a bounded 0.05-gate domain',
    pass: Object.values(checks).every(Boolean),
    void_as_gated: !gPass
  });
}
// R4: twin determinism + cross-round/probe bit-identity
{'''
rep(anchor12, verdicts, 'verdict-rows')

# ---------------------------------------------------------------- 13. verdicts regex
rep("for (const row of chain.rows) if (/^(G|L2|R|PLAST|MECH|REDOSE|OVERDECAY|CURE9|SAT9|DIP9)/.test(row.type)) verdicts[row.type] = row.payload.pass;",
    "for (const row of chain.rows) if (/^(G|L2|R|PLAST|MECH|REDOSE|OVERDECAY|CURE9|SAT9|DIP9|DOSE10|SAT10|DIP10)/.test(row.type)) verdicts[row.type] = row.payload.pass;",
    'verdicts-regex')

open('/tmp/run10_stage3.mjs', 'w', encoding='utf-8').write(out)
print('stage 3 OK')
