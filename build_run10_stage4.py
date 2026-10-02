#!/usr/bin/env python3
# build_run10_stage4.py — receipt-assembly completion (the stage1-3 chain left run9's assembly
# verbatim, which would (a) write the round-10 receipt to receipts/run9.json — OVERWRITING the
# round-9 receipt of record — and (b) score R4 on its round-9 form: no round-10 twin layer, no
# sha-chain to run9.json's R4 row, no run9-layer / design10-disclosed cross-check lists).
# Stage 4 completes the derivation, still by exact-match single-match-replacement edits from
# run9.mjs (reads /tmp/run10_stage3.mjs — the stage-3 output — and writes run10.mjs).
# Every replacement asserts exactly one match; a zero or multi match aborts with no output file.
# Zero arithmetic change: the edits touch ONLY the receipt assembly + R4 bookkeeping (cross-check
# lists, sha bindings, payload fields) + console printouts + outDoc metadata.
import sys

out = open('/tmp/run10_stage3.mjs', encoding='utf-8').read()

def rep(old, new, label):
    global out
    n = out.count(old)
    if n != 1:
        print(f'FAIL [{label}]: {n} matches'); sys.exit(1)
    out = out.replace(old, new)

# ---------------------------------------------------------------- 14. metrics10: the two
# missing E-cascade stage-1 disclosure fields (design10 I-B10 binds them cross-execution; the
# R4 design10-disclosed list must cover EVERY disclosed pipeline value).
rep("    r10_ec_stage4_control: p4econtrol.ratio4, r10_ec_first10_4_control: p4econtrol.first10_4, r10_ec_last10_4_control: p4econtrol.last10_4,\n",
    "    r10_ec_stage4_control: p4econtrol.ratio4, r10_ec_first10_4_control: p4econtrol.first10_4, r10_ec_last10_4_control: p4econtrol.last10_4,\n"
    "    r10_ec_first10_1_control: p4econtrol.first10_1, r10_ec_last10_1_control: p4econtrol.last10_1,\n",
    'metrics10-ec1')

# ---------------------------------------------------------------- 15. R4 extension: run9-layer
# cross-check lists + the sha-level chain to run9.json's R4 row + the design10-disclosed list +
# the round-10 twin layer in shaAll. Inserted after the design9Bad computation.
anchor15 = "  const design9Bad = design9Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, design9: b }));"
ext15 = anchor15 + """
  // ROUND-10: the round-9 receipt of record — run9.json's FIVE metric layers must reproduce
  // bit-exactly (carried, round-6, round-7, round-8, round-9), plus the SHA-LEVEL chain
  // extension: the run's metric shas equal run9.json's R4 row shas (the r4..r9 chain extends
  // to r10 — the TEN sha-level bindings of the registration's R4 rule).
  const run9CarriedPairs = Object.keys(run9Receipt.metrics).map((k) => [k, r1.metrics[k], run9Receipt.metrics[k]]);
  const run9CarriedBad = run9CarriedPairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, run9: b }));
  const run9R6Pairs = Object.keys(run9Receipt.metrics_round6).map((k) => [k, q1.metrics[k], run9Receipt.metrics_round6[k]]);
  const run9R6Bad = run9R6Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, run9: b }));
  const run9R7Pairs = Object.keys(run9Receipt.metrics_round7).map((k) => [k, q1.metrics7[k], run9Receipt.metrics_round7[k]]);
  const run9R7Bad = run9R7Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, run9: b }));
  const run9R8Pairs = Object.keys(run9Receipt.metrics_round8).map((k) => [k, q1.metrics8[k], run9Receipt.metrics_round8[k]]);
  const run9R8Bad = run9R8Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, run9: b }));
  const run9R9Pairs = Object.keys(run9Receipt.metrics_round9).map((k) => [k, q1.metrics9[k], run9Receipt.metrics_round9[k]]);
  const run9R9Bad = run9R9Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, run9: b }));
  const run9R4row = run9Receipt.chain.find((r) => r.type === 'R4_determinism').payload;
  const shaChainOk10 = r1.metricsSha === run9R4row.sha_carried_run1 && r2.metricsSha === run9R4row.sha_carried_run2
    && q1.metricsSha === run9R4row.sha_round6_run1 && q2.metricsSha === run9R4row.sha_round6_run2
    && q1.metrics7Sha === run9R4row.sha_round7_run1 && q2.metrics7Sha === run9R4row.sha_round7_run2
    && q1.metrics8Sha === run9R4row.sha_round8_run1 && q2.metrics8Sha === run9R4row.sha_round8_run2
    && q1.metrics9Sha === run9R4row.sha_round9_run1 && q2.metrics9Sha === run9R4row.sha_round9_run2;
  // ROUND-10: the disclosed design10 pipeline values must equal the run bit-exactly (probe == run)
  // — the design10-disclosed cross-check list covers EVERY key of design10.disclosed_pipeline_values.
  const design10Pairs = [
    ['probe4.stage4.control', q1.metrics10.r10_dc_ratio4_control, design10.disclosed_pipeline_values.control_fourth_switch_ratio],
    ['probe4.stage4.first10.control', q1.metrics10.r10_dc_first10_4_control, design10.disclosed_pipeline_values.control_fourth_switch_first10],
    ['probe4.stage4.last10.control', q1.metrics10.r10_dc_last10_4_control, design10.disclosed_pipeline_values.control_fourth_switch_last10],
    ['probe4.end4wc.control', q1.metrics10.r10_dc_end4_wc_control, design10.disclosed_pipeline_values.control_end4_norms.wc_norm],
    ['probe4.stage1.control', q1.metrics8.r8_stage1_control, design10.disclosed_pipeline_values.control_first_switch_ratio],
    ['probe4.stage2.control', q1.metrics8.r8_ratio2_wd0, design10.disclosed_pipeline_values.control_second_switch_ratio],
    ['probe4.stage3.control', q1.metrics9.r9_ratio3_wd0, design10.disclosed_pipeline_values.control_third_switch_ratio],
    ['probe4E.stage1.control', q1.metrics10.r10_ec_stage1_control, design10.disclosed_pipeline_values.control_ecascade_stage1_ratio],
    ['probe4E.stage2.control', q1.metrics10.r10_ec_stage2_control, design10.disclosed_pipeline_values.control_ecascade_stage2_ratio],
    ['probe4E.stage3.control', q1.metrics10.r10_ec_stage3_control, design10.disclosed_pipeline_values.control_ecascade_stage3_ratio],
    ['probe4E.stage4.control', q1.metrics10.r10_ec_stage4_control, design10.disclosed_pipeline_values.control_ecascade_stage4_ratio],
    ['probe4E.stage1.first10.control', q1.metrics10.r10_ec_first10_1_control, design10.disclosed_pipeline_values.control_ecascade_stage1_first10],
    ['probe4E.stage1.last10.control', q1.metrics10.r10_ec_last10_1_control, design10.disclosed_pipeline_values.control_ecascade_stage1_last10],
    ['probe4E.stage4.first10.control', q1.metrics10.r10_ec_first10_4_control, design10.disclosed_pipeline_values.control_ecascade_stage4_first10],
    ['probe4E.stage4.last10.control', q1.metrics10.r10_ec_last10_4_control, design10.disclosed_pipeline_values.control_ecascade_stage4_last10],
    ['probe4E.end4wc.control', q1.metrics10.r10_ec_end4_wc_control, design10.disclosed_pipeline_values.control_ecascade_end4_norms.wc_norm],
    ['dose10.cure_wc_30000', q1.metrics10.r10_wc_2e4_30000, design10.disclosed_pipeline_values.cure_wc_30000],
    ['dose10.cure_wc_40000', q1.metrics10.r10_wc_2e4_40000, design10.disclosed_pipeline_values.cure_wc_40000],
    ['dose10.cure_wc_50000', q1.metrics10.r10_wc_2e4_50000, design10.disclosed_pipeline_values.cure_wc_50000],
    ['dose10.main_wc_30000', q1.metrics10.r10_wc_3e4_30000, design10.disclosed_pipeline_values.main_wc_30000],
    ['dose10.main_wc_40000', q1.metrics10.r10_wc_3e4_40000, design10.disclosed_pipeline_values.main_wc_40000],
    ['dose10.main_wc_50000', q1.metrics10.r10_wc_3e4_50000, design10.disclosed_pipeline_values.main_wc_50000],
    ['seed.d', q1.metrics10.r10_seed_d, design10.seed_d],
    ['seed.e', q1.metrics10.r10_seed_e, design10.seed_e]
  ];
  const design10Bad = design10Pairs.filter(([k, a, b]) => a !== b).map(([k, a, b]) => ({ key: k, run: a, design10: b }));"""
rep(anchor15, ext15, 'r4-extension')

# ---------------------------------------------------------------- 16. shaAll gains the round-10 layer
rep("  const shaAll1 = sha(JSON.stringify({ carried: r1.metrics, round6: q1.metrics, round7: q1.metrics7, round8: q1.metrics8, round9: q1.metrics9 }));\n"
    "  const shaAll2 = sha(JSON.stringify({ carried: r2.metrics, round6: q2.metrics, round7: q2.metrics7, round8: q2.metrics8, round9: q2.metrics9 }));",
    "  const shaAll1 = sha(JSON.stringify({ carried: r1.metrics, round6: q1.metrics, round7: q1.metrics7, round8: q1.metrics8, round9: q1.metrics9, round10: q1.metrics10 }));\n"
    "  const shaAll2 = sha(JSON.stringify({ carried: r2.metrics, round6: q2.metrics, round7: q2.metrics7, round8: q2.metrics8, round9: q2.metrics9, round10: q2.metrics10 }));",
    'shaAll10')

# ---------------------------------------------------------------- 17. R4 claim text (round-10 form)
rep("    claim: 'two FULL executions byte-identical (carried + round-6 + round-7 + round-8 + round-9 metric layers) AND every round-4 metric bit-equal to run4.json (29/29) AND every round-5 metric bit-equal to run5.json (92/92) AND every round-5 probe pair bit-equal to design5.json AND every round-6 metric bit-equal to design6.json AND run6.json AND run7.json AND run8.json AND every round-7 metric bit-equal to run7.json AND run8.json AND every round-8 metric bit-equal to run8.json (SHA-LEVEL chain to run8.json\\'s R4 row shas ff60c211/7a20e613/30657dbe/34ec241a) AND every disclosed round-8 pipeline value bit-equal to design8.json AND every disclosed round-9 pipeline value bit-equal to design9.json — probe == run == run-twin == round-4-run == round-5-run == round-6-run == round-7-run == round-8-run, the chain NINE rounds deep',",
    "    claim: 'two FULL executions byte-identical (carried + round-6 + round-7 + round-8 + round-9 + round-10 metric layers) AND every round-4 metric bit-equal to run4.json (29/29) AND every round-5 metric bit-equal to run5.json (92/92) AND every round-5 probe pair bit-equal to design5.json AND every round-6 metric bit-equal to design6.json AND run6.json AND run7.json AND run8.json AND run9.json AND every round-7 metric bit-equal to run7.json AND run8.json AND run9.json AND every round-8 metric bit-equal to run8.json AND run9.json AND every round-9 metric bit-equal to run9.json (SHA-LEVEL chain to run9.json\\'s R4 row shas ff60c211/7a20e613/30657dbe/34ec241a/c972511d) AND every disclosed round-8 AND round-9 AND round-10 pipeline value bit-equal to design8.json AND design9.json AND design10.json — probe == run == run-twin == round-4-run == round-5-run == round-6-run == round-7-run == round-8-run == round-9-run, the chain TEN rounds deep',",
    'r4-claim')

# ---------------------------------------------------------------- 18. R4 pass condition (round-10 form)
rep("    pass: r1.metricsSha === r2.metricsSha && q1.metricsSha === q2.metricsSha && q1.metrics7Sha === q2.metrics7Sha && q1.metrics8Sha === q2.metrics8Sha && q1.metrics9Sha === q2.metrics9Sha && shaAll1 === shaAll2\n"
    "      && carriedBad.length === 0 && probeBad.length === 0 && run5Bad.length === 0 && probe6Bad.length === 0 && run6CarriedBad.length === 0 && run6Bad.length === 0 && design7Bad.length === 0\n"
    "      && run7CarriedBad.length === 0 && run7R6Bad.length === 0 && run7R7Bad.length === 0 && shaChainOk && design8Bad.length === 0\n"
    "      && run8CarriedBad.length === 0 && run8R6Bad.length === 0 && run8R7Bad.length === 0 && run8R8Bad.length === 0 && shaChainOk9 && design9Bad.length === 0,",
    "    pass: r1.metricsSha === r2.metricsSha && q1.metricsSha === q2.metricsSha && q1.metrics7Sha === q2.metrics7Sha && q1.metrics8Sha === q2.metrics8Sha && q1.metrics9Sha === q2.metrics9Sha && q1.metrics10Sha === q2.metrics10Sha && shaAll1 === shaAll2\n"
    "      && carriedBad.length === 0 && probeBad.length === 0 && run5Bad.length === 0 && probe6Bad.length === 0 && run6CarriedBad.length === 0 && run6Bad.length === 0 && design7Bad.length === 0\n"
    "      && run7CarriedBad.length === 0 && run7R6Bad.length === 0 && run7R7Bad.length === 0 && shaChainOk && design8Bad.length === 0\n"
    "      && run8CarriedBad.length === 0 && run8R6Bad.length === 0 && run8R7Bad.length === 0 && run8R8Bad.length === 0 && shaChainOk9 && design9Bad.length === 0\n"
    "      && run9CarriedBad.length === 0 && run9R6Bad.length === 0 && run9R7Bad.length === 0 && run9R8Bad.length === 0 && run9R9Bad.length === 0 && shaChainOk10 && design10Bad.length === 0,",
    'r4-pass')

# ---------------------------------------------------------------- 19. R4 payload: sha fields + chain-to-run9 + cross-check rows
rep("    sha_round9_run1: q1.metrics9Sha, sha_round9_run2: q2.metrics9Sha,\n",
    "    sha_round9_run1: q1.metrics9Sha, sha_round9_run2: q2.metrics9Sha,\n"
    "    sha_round10_run1: q1.metrics10Sha, sha_round10_run2: q2.metrics10Sha,\n",
    'r4-sha-fields')

rep("    sha_chain_to_run8: { sha_carried_run1: run8R4row.sha_carried_run1, sha_round6_run1: run8R4row.sha_round6_run1, sha_round7_run1: run8R4row.sha_round7_run1, sha_round8_run1: run8R4row.sha_round8_run1, bound: shaChainOk9 },",
    "    sha_chain_to_run8: { sha_carried_run1: run8R4row.sha_carried_run1, sha_round6_run1: run8R4row.sha_round6_run1, sha_round7_run1: run8R4row.sha_round7_run1, sha_round8_run1: run8R4row.sha_round8_run1, bound: shaChainOk9 },\n"
    "    sha_chain_to_run9: { sha_carried_run1: run9R4row.sha_carried_run1, sha_round6_run1: run9R4row.sha_round6_run1, sha_round7_run1: run9R4row.sha_round7_run1, sha_round8_run1: run9R4row.sha_round8_run1, sha_round9_run1: run9R4row.sha_round9_run1, bound: shaChainOk10 },",
    'r4-chain-to-run9')

rep("    design9_cross_check: { shared: design9Pairs.length, mismatches: design9Bad }\n  });",
    "    design9_cross_check: { shared: design9Pairs.length, mismatches: design9Bad },\n"
    "    run9_carried_cross_check: { shared: run9CarriedPairs.length, mismatches: run9CarriedBad },\n"
    "    run9_round6_cross_check: { shared: run9R6Pairs.length, mismatches: run9R6Bad },\n"
    "    run9_round7_cross_check: { shared: run9R7Pairs.length, mismatches: run9R7Bad },\n"
    "    run9_round8_cross_check: { shared: run9R8Pairs.length, mismatches: run9R8Bad },\n"
    "    run9_round9_cross_check: { shared: run9R9Pairs.length, mismatches: run9R9Bad },\n"
    "    design10_cross_check: { shared: design10Pairs.length, mismatches: design10Bad }\n  });",
    'r4-xcheck-rows')

# ---------------------------------------------------------------- 20. console summary: new cross-check + round-10 detail lines
rep("console.log('design9 disclosed cross-check:', r4row.design9_cross_check.shared + '/' + r4row.design9_cross_check.shared, 'mismatches:', r4row.design9_cross_check.mismatches.length);",
    "console.log('design9 disclosed cross-check:', r4row.design9_cross_check.shared + '/' + r4row.design9_cross_check.shared, 'mismatches:', r4row.design9_cross_check.mismatches.length);\n"
    "console.log('sha-chain to run9 R4 row bound (r4..r10, ten bindings):', r4row.sha_chain_to_run9.bound);\n"
    "console.log('run9 carried cross-check:', r4row.run9_carried_cross_check.shared + '/' + r4row.run9_carried_cross_check.shared, 'mismatches:', r4row.run9_carried_cross_check.mismatches.length);\n"
    "console.log('run9 round-6 cross-check:', r4row.run9_round6_cross_check.shared + '/' + r4row.run9_round6_cross_check.shared, 'mismatches:', r4row.run9_round6_cross_check.mismatches.length);\n"
    "console.log('run9 round-7 cross-check:', r4row.run9_round7_cross_check.shared + '/' + r4row.run9_round7_cross_check.shared, 'mismatches:', r4row.run9_round7_cross_check.mismatches.length);\n"
    "console.log('run9 round-8 cross-check:', r4row.run9_round8_cross_check.shared + '/' + r4row.run9_round8_cross_check.shared, 'mismatches:', r4row.run9_round8_cross_check.mismatches.length);\n"
    "console.log('run9 round-9 cross-check:', r4row.run9_round9_cross_check.shared + '/' + r4row.run9_round9_cross_check.shared, 'mismatches:', r4row.run9_round9_cross_check.mismatches.length);\n"
    "console.log('design10 disclosed cross-check:', r4row.design10_cross_check.shared + '/' + r4row.design10_cross_check.shared, 'mismatches:', r4row.design10_cross_check.mismatches.length);\n"
    "console.log('ROUND-10 detail: DOSE10 deltas ' + R10_LADDER.map((d, i) => d + ':' + q1.metrics10['r10_delta_' + d].toFixed(6)).join(' ')\n"
    "  + ' | dstar=' + q1.metrics10.r10_dstar + ' crossings=' + q1.metrics10.r10_sign_crossings + ' spearman_pooled=' + q1.metrics10.r10_spearman_pooled.toFixed(6));\n"
    "console.log('  DOSE10 ratios: ' + R10_LADDER.map((d) => d + ': 2e-4=' + q1.metrics10['r10_ratio_2e4_' + d].toFixed(6) + ' 3e-4=' + q1.metrics10['r10_ratio_3e4_' + d].toFixed(6)).join(' | '));\n"
    "console.log('  SAT10 curve: rho20_3=' + q1.metrics9.r9_rho20_3.toFixed(6) + ' -> rho20_4=' + q1.metrics10.r10_rho20_4.toFixed(6) + ' (inc4=' + q1.metrics10.r10_inc4.toFixed(6) + ' vs inc3=' + q1.metrics9.r9_inc3.toFixed(6) + ')'\n"
    "  + ' | E-cascade rho20_4^E=' + q1.metrics10.r10_rho20_4_E.toFixed(6)\n"
    "  + ' | dc ratio4: decayed=' + q1.metrics10.r10_dc_ratio4_decayed.toFixed(6) + ' control=' + q1.metrics10.r10_dc_ratio4_control.toFixed(6));\n"
    "console.log('  DIP10 scan: ' + Object.keys(q1.metrics10.r10_dip_scan).map((s) => s + ':' + (q1.metrics10.r10_dip_scan[s].localmin ? 'MIN' : (q1.metrics10.r10_dip_scan[s].left ? 'left' : 'flat') ) + '/dipmag=' + q1.metrics10.r10_dip_scan[s].dipmag.toFixed(4)).join(' '));",
    'console-summary')

# ---------------------------------------------------------------- 21. outDoc: round-10 identity + metrics + receipt path
rep("  schema: 'quilt-jepa/run-receipt-v9',", "  schema: 'quilt-jepa/run-receipt-v10',", 'schema')
rep("  seed_c: parseInt(sha(selJson + R9_SEEDC_SUFFIX).slice(0, 8), 16) >>> 0,\n  lr_registered: LR3,",
    "  seed_c: parseInt(sha(selJson + R9_SEEDC_SUFFIX).slice(0, 8), 16) >>> 0,\n"
    "  seed_d: parseInt(sha(selJson + R10_SEEDD_SUFFIX).slice(0, 8), 16) >>> 0,\n"
    "  seed_e: parseInt(sha(selJson + R10_SEEDE_SUFFIX).slice(0, 8), 16) >>> 0,\n"
    "  lr_registered: LR3,",
    'outdoc-seeds')
rep("  round9_constants: { seedC_suffix: R9_SEEDC_SUFFIX, main_capture: R9_MAIN_CAPTURE, cure_capture: R9_CURE_CAPTURE, dip_lr: R9_DIP_LR, dip_W_scalings: R9_DIP_W, cure_D_ratio_band: [2.5, 3.2] },",
    "  round9_constants: { seedC_suffix: R9_SEEDC_SUFFIX, main_capture: R9_MAIN_CAPTURE, cure_capture: R9_CURE_CAPTURE, dip_lr: R9_DIP_LR, dip_W_scalings: R9_DIP_W, cure_D_ratio_band: [2.5, 3.2] },\n"
    "  round10_constants: { seedD_suffix: R10_SEEDD_SUFFIX, seedE_suffix: R10_SEEDE_SUFFIX, main_capture: R10_MAIN_CAPTURE, cure_capture: R10_CURE_CAPTURE, ladder: R10_LADDER, dip_scales_low: R10_DIP_SCALES_LOW, dip_scales_high: R10_DIP_SCALES_HIGH },",
    'outdoc-constants')
rep("  metrics_round9: q1.metrics9,\n  chain: chain.rows,",
    "  metrics_round9: q1.metrics9,\n  metrics_round10: q1.metrics10,\n  chain: chain.rows,",
    'outdoc-metrics10')
rep("  operating_point_note: 'UNCHANGED from round 4/5/6/7/8 (core/ byte-untouched) — ROUND 9 THE CURED-DOSE ROUND adds CURE9/SAT9/DIP9 at the same operating point; carried claims must reproduce run4.json (29/29) AND run5.json (92/92) bit-exactly; round-6 claims design6.json AND run6.json AND run7.json AND run8.json bit-exactly; round-7 claims run7.json AND run8.json bit-exactly; round-8 claims run8.json bit-exactly; the SHA-LEVEL chain extends to run8.json\\'s R4 row (ff60c211/7a20e613/30657dbe/34ec241a); the disclosed design8 AND design9 pipeline values bind bit-exactly; runner-level additions only: captureAt extensions ([20000, 75000] on the 2e-4 arm; 75000 on the main arm — design9 I-A9 identity class), trivialSwitchProbe3 (stage-1/2 arithmetic identity to the carried probe2, design9 I-B9, re-bound on both arms), six DIP9 gGateFlex points (the 1x row receipted, design9 I-F9)',",
    "  operating_point_note: 'UNCHANGED from round 4/5/6/7/8/9 (core/ byte-untouched) — ROUND 10 THE DEPTH-LADDER ROUND adds DOSE10/SAT10/DIP10 at the same operating point; carried claims must reproduce run4.json (29/29) AND run5.json (92/92) bit-exactly; round-6 claims design6.json AND run6.json AND run7.json AND run8.json AND run9.json bit-exactly; round-7 claims run7.json AND run8.json AND run9.json bit-exactly; round-8 claims run8.json AND run9.json bit-exactly; round-9 claims run9.json bit-exactly; the SHA-LEVEL chain extends to run9.json\\'s R4 row (ff60c211/7a20e613/30657dbe/34ec241a/c972511d) — the TEN sha-level bindings; the disclosed design8 AND design9 AND design10 pipeline values bind bit-exactly (design10-disclosed list covers every key); runner-level additions only: captureAt extensions ([20000, 30000, 40000, 50000, 75000] on the 2e-4 arm; [20000, 30000, 40000, 50000, 75000, 100000, 500000] on the main arm — design10 I-A10a/I-A10b identity class), trivialSwitchProbe4 (stage-1/2/3 arithmetic identity to the carried probe3, design10 I-B10, re-bound on both arms, both cascades), the DOSE10 ladder switch probes (the carried trivialSwitchProbe class), thirty-nine DIP10 gGateFlex points (the receipted 1x/0.5x/2x rows re-bound, design10 I-C10)',",
    'outdoc-note')
rep("fs.writeFileSync(path.join(RECEIPTS, 'run9.json'), JSON.stringify(outDoc, null, 1));",
    "fs.writeFileSync(path.join(RECEIPTS, 'run10.json'), JSON.stringify(outDoc, null, 1));",
    'receipt-path')

open('/tmp/run10_stage4.mjs', 'w', encoding='utf-8').write(out)
open('run10.mjs', 'w', encoding='utf-8').write(out)
print('stage 4 OK — run10.mjs written (assembly complete)')
