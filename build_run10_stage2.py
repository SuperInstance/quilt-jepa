#!/usr/bin/env python3
# build_run10_stage2.py — parts P/Q/R inside coreRun8 + metrics10 layer.
import sys

out = open('/tmp/run10_stage1.mjs', encoding='utf-8').read()

def rep(old, new, label):
    global out
    n = out.count(old)
    if n != 1:
        print(f'FAIL [{label}]: {n} matches'); sys.exit(1)
    out = out.replace(old, new)

# ---------------------------------------------------------------- 8. parts P/Q/R after part O
anchor8 = "  console.error('[progress]   r9 dip W-scaling grid done at', Date.now() - T0, 'ms');\n\n  // ---- ROUND-9 REPAIR"
parts = """  console.error('[progress]   r9 dip W-scaling grid done at', Date.now() - T0, 'ms');

  // ---- ROUND 10 part P: SAT10 — the FOURTH switch on TWO cascades ----------------------------
  // (a) the registered D-cascade: stage 1 trivial (probe3's exact stage-1 path) -> stage 2
  // World2(seedB) -> stage 3 World2(seedC) -> stage 4 World2(seedD, registered derivation), no
  // weight reset, 400 steps per stage, both arms at their own dose. (b) the
  // DIFFERENT-PROBE-WORLD E-cascade: the same path with the stage-1 window on a fresh
  // World2(seedE). Stage-1/2/3 arithmetic identity to the carried probe3 is bound bit-exact in
  // the SAT10 verdict vs run8/run9 receipts on BOTH arms; the control's stage-4 legs are the
  // design10 disclosures, bound bit-exact (probe == run). ALL decayed fourth-switch legs are
  // first measured here (inside run10).
  const seedD = parseInt(sha(selJson + R10_SEEDD_SUFFIX).slice(0, 8), 16) >>> 0;
  if (seedD !== design10.seed_d) { console.error('seedD derivation drift: ' + seedD + ' != design10 ' + design10.seed_d); process.exit(2); }
  const seedE = parseInt(sha(selJson + R10_SEEDE_SUFFIX).slice(0, 8), 16) >>> 0;
  if (seedE !== design10.seed_e) { console.error('seedE derivation drift: ' + seedE + ' != design10 ' + design10.seed_e); process.exit(2); }
  const p4decayed = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, WD_MAIN, mm.snapshots['20000'], PLAST_STEPS, 'trivial', 0);
  const p4control = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, 0, m0.snapshots['20000'], PLAST_STEPS, 'trivial', 0);
  const p4edecayed = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, WD_MAIN, mm.snapshots['20000'], PLAST_STEPS, 'world2', seedE);
  const p4econtrol = trivialSwitchProbe4(seedU32, seedB, seedC, seedD, LR3, TAU4, 0, m0.snapshots['20000'], PLAST_STEPS, 'world2', seedE);
  const rho20_4 = p4decayed.ratio4 / p4control.ratio4;
  const rho20_4E = p4edecayed.ratio4 / p4econtrol.ratio4;
  out6.probe4 = { seed_d: seedD, seed_e: seedE, decayed: p4decayed, control: p4control, edecayed: p4edecayed, econtrol: p4econtrol, rho20_4, rho20_4E };
  console.error('[progress]   r10 fourth-switch probes done at', Date.now() - T0, 'ms, rho20_4=' + rho20_4 + ' rho20_4E=' + rho20_4E);

  // ---- ROUND 10 part Q: DOSE10 — the ordering-curve switch probes over the depth ladder ------
  // For each arm (2e-4 cured-dose candidate, 3e-4 main) and each shared-finite ladder depth, the
  // carried trivial-world 400-step switch continuation from the arm's own snapshot at ITS OWN
  // dose (the round-9 75k probe class; the 20k and 75k values re-bind run8/run9 bit-exactly,
  // the 30k/40k/50k interior is NEW). The |Wc| ladder is read off the same snapshots
  // (design10-disclosed interior norms bound bit-exact). The pre-registered ordering-curve law:
  // Delta(d) strictly decreasing with exactly one sign crossing.
  const dose10 = { cure: {}, main: {}, wc_cure: {}, wc_main: {} };
  for (const d of R10_LADDER) {
    const k = String(d);
    dose10.cure[k] = trivialSwitchProbe(seedU32, LR3, TAU4, 2e-4, arms7['0.0002'].snapshots[k], PLAST_STEPS);
    dose10.main[k] = trivialSwitchProbe(seedU32, LR3, TAU4, WD_MAIN, mm.snapshots[k], PLAST_STEPS);
    dose10.wc_cure[k] = norm64(arms7['0.0002'].snapshots[k].Wc);
    dose10.wc_main[k] = norm64(mm.snapshots[k].Wc);
  }
  dose10.wc_capture_validated = R10_LADDER.every((d) => {
    const k = String(d);
    return dose10.wc_cure[k] === arms7['0.0002'].checkpoints[k].wc_norm && dose10.wc_main[k] === mm.checkpoints[k].wc_norm;
  });
  dose10.deltas = R10_LADDER.map((d) => { const k = String(d); return dose10.cure[k].ratio - dose10.main[k].ratio; });
  dose10.delta_strictly_decreasing = dose10.deltas.every((v, i) => i === 0 || v < dose10.deltas[i - 1]);
  let crossings10 = 0;
  for (let i = 1; i < dose10.deltas.length; i++) if ((dose10.deltas[i] > 0) !== (dose10.deltas[i - 1] > 0)) crossings10++;
  dose10.sign_crossings = crossings10;
  dose10.dstar = (() => { for (let i = 0; i < R10_LADDER.length; i++) if (dose10.deltas[i] < 0) return R10_LADDER[i]; return null; })();
  dose10.spearman_pooled = spearmanRanks(
    R10_LADDER.flatMap((d) => [dose10.wc_cure[String(d)], dose10.wc_main[String(d)]]),
    R10_LADDER.flatMap((d) => [dose10.cure[String(d)].ratio, dose10.main[String(d)].ratio])
  );
  out6.dose10 = dose10;
  console.error('[progress]   r10 dose ladder probes done at', Date.now() - T0, 'ms, dstar=' + dose10.dstar + ' crossings=' + crossings10);

  // ---- ROUND 10 part R: DIP10 — the dip W-domain scan (thirteen scales, thirty-nine points) --
  // The {0.15, 0.2, 0.25} mini-grid at W_s(lr) = round(s*30/lr) for the LOW ladder
  // {0.55..0.95} and the HIGH ladder {1.1, 1.25, 1.5, 1.75}; tau from the carried K4 law at
  // each pace, wd 0, trivial world. At s = 1 the windows reproduce the registered W(lr) exactly.
  const dipScan = {};
  for (const s of [...R10_DIP_SCALES_LOW, ...R10_DIP_SCALES_HIGH]) {
    const w015 = Math.round(30 * s / 0.15), w020 = Math.round(30 * s / 0.2), w025 = Math.round(30 * s / 0.25);
    const gA = gGateFlex(seedU32, 0.15, tauOf(0.15), 0, w015);
    const gB = gGateFlex(seedU32, 0.2, tauOf(0.2), 0, w020);
    const gC = gGateFlex(seedU32, 0.25, tauOf(0.25), 0, w025);
    dipScan[String(s)] = {
      w015, w020, w025,
      g015: gA.g_ratio, g020: gB.g_ratio, g025: gC.g_ratio,
      dipmag: (gA.g_ratio + gC.g_ratio) / 2 - gB.g_ratio,
      left: gA.g_ratio > gB.g_ratio, right: gC.g_ratio > gB.g_ratio
    };
    dipScan[String(s)].localmin = dipScan[String(s)].left && dipScan[String(s)].right;
  }
  const lowKeys = R10_DIP_SCALES_LOW.map(String), highKeys = R10_DIP_SCALES_HIGH.map(String);
  const flipsOf = (keys) => { let f = 0; for (let i = 1; i < keys.length; i++) if (dipScan[keys[i]].localmin !== dipScan[keys[i - 1]].localmin) f++; return f; };
  const birthLow = (() => { for (const k of lowKeys) if (dipScan[k].localmin) return k; return null; })();
  const deathHigh = (() => { for (let i = highKeys.length - 1; i >= 0; i--) if (dipScan[highKeys[i]].localmin) return highKeys[i]; return null; })();
  const dipAllFinite = Object.keys(dipScan).every((k) => [dipScan[k].g015, dipScan[k].g020, dipScan[k].g025, dipScan[k].dipmag].every(Number.isFinite));
  out6.dipScan = dipScan;
  console.error('[progress]   r10 dip W-domain scan done at', Date.now() - T0, 'ms, birth=' + birthLow + ' death=' + deathHigh);

  // ---- ROUND-9 REPAIR"""
rep(anchor8, parts, 'parts-PQR')

# ---------------------------------------------------------------- 9. metrics10 layer
L10 = ['20000', '30000', '40000', '50000', '75000']
anchor9 = """  out6.metrics9 = metrics9;
  out6.metrics9Sha = sha(JSON.stringify(metrics9));
  return out6;
}"""
metrics10 = """  out6.metrics9 = metrics9;
  out6.metrics9Sha = sha(JSON.stringify(metrics9));
  // ---- ROUND 10 metrics layer (new this round; carried + round-6..9 layers untouched) --------
  const L10 = R10_LADDER.map(String);
  const metrics10 = {
    // DOSE10 — the ordering-curve switch probes over the depth ladder
    r10_rate_wd2e4: arms7['0.0002'].slow_inflation_rate, r10_D_wd2e4: arms7['0.0002'].D, r10_exec_wd2e4: arms7['0.0002'].executed_to,
    r10_D_main: mm.D, r10_exec_main: mm.executed_to,
""" + ''.join(f"    r10_ratio_2e4_{k}: dose10.cure['{k}'].ratio, r10_first10_2e4_{k}: dose10.cure['{k}'].first10, r10_last10_2e4_{k}: dose10.cure['{k}'].last10,\n" for k in L10) \
    + ''.join(f"    r10_ratio_3e4_{k}: dose10.main['{k}'].ratio, r10_first10_3e4_{k}: dose10.main['{k}'].first10, r10_last10_3e4_{k}: dose10.main['{k}'].last10,\n" for k in L10) \
    + ''.join(f"    r10_wc_2e4_{k}: dose10.wc_cure['{k}'],\n" for k in L10) \
    + ''.join(f"    r10_wc_3e4_{k}: dose10.wc_main['{k}'],\n" for k in L10) + """    r10_wc_capture_validated: dose10.wc_capture_validated,
""" + ''.join(f"    r10_delta_{k}: dose10.deltas[{i}],\n" for i, k in enumerate(L10)) + """    r10_delta_strictly_decreasing: dose10.delta_strictly_decreasing,
    r10_sign_crossings: dose10.sign_crossings,
    r10_dstar: dose10.dstar,
    r10_spearman_pooled: dose10.spearman_pooled,
    r10_dose_all_finite: L10.every((k) => [dose10.cure[k].first10, dose10.cure[k].last10, dose10.main[k].first10, dose10.main[k].last10].every(Number.isFinite)),
    // SAT10 — the fourth switch on the two cascades
    r10_seed_d: seedD, r10_seed_e: seedE,
    r10_dc_stage1_decayed: p4decayed.ratio1, r10_dc_stage2_decayed: p4decayed.ratio2, r10_dc_stage3_decayed: p4decayed.ratio3,
    r10_dc_ratio4_decayed: p4decayed.ratio4, r10_dc_first10_4_decayed: p4decayed.first10_4, r10_dc_last10_4_decayed: p4decayed.last10_4,
    r10_dc_stage1_control: p4control.ratio1, r10_dc_stage2_control: p4control.ratio2, r10_dc_stage3_control: p4control.ratio3,
    r10_dc_ratio4_control: p4control.ratio4, r10_dc_first10_4_control: p4control.first10_4, r10_dc_last10_4_control: p4control.last10_4,
    r10_dc_end1_sha_decayed: p4decayed.end1.sha, r10_dc_end1_sha_control: p4control.end1.sha,
    r10_dc_end2_wc_decayed: p4decayed.end2.norms.wc_norm, r10_dc_end2_wc_control: p4control.end2.norms.wc_norm,
    r10_dc_end3_wc_decayed: p4decayed.end3.norms.wc_norm, r10_dc_end3_wc_control: p4control.end3.norms.wc_norm,
    r10_dc_end4_wc_decayed: p4decayed.end4.norms.wc_norm, r10_dc_end4_wc_control: p4control.end4.norms.wc_norm,
    r10_rho20_4: rho20_4, r10_inc4: rho20_4 - rho20_3,
    r10_ec_stage1_decayed: p4edecayed.ratio1, r10_ec_stage2_decayed: p4edecayed.ratio2, r10_ec_stage3_decayed: p4edecayed.ratio3,
    r10_ec_stage4_decayed: p4edecayed.ratio4, r10_ec_first10_4_decayed: p4edecayed.first10_4, r10_ec_last10_4_decayed: p4edecayed.last10_4,
    r10_ec_stage1_control: p4econtrol.ratio1, r10_ec_stage2_control: p4econtrol.ratio2, r10_ec_stage3_control: p4econtrol.ratio3,
    r10_ec_stage4_control: p4econtrol.ratio4, r10_ec_first10_4_control: p4econtrol.first10_4, r10_ec_last10_4_control: p4econtrol.last10_4,
    r10_ec_end4_wc_decayed: p4edecayed.end4.norms.wc_norm, r10_ec_end4_wc_control: p4econtrol.end4.norms.wc_norm,
    r10_rho20_4_E: rho20_4E,
    r10_sat_all_finite: [p4decayed.first10_1, p4decayed.last10_1, p4decayed.first10_2, p4decayed.last10_2, p4decayed.first10_3, p4decayed.last10_3, p4decayed.first10_4, p4decayed.last10_4,
                         p4control.first10_1, p4control.last10_1, p4control.first10_2, p4control.last10_2, p4control.first10_3, p4control.last10_3, p4control.first10_4, p4control.last10_4,
                         p4edecayed.first10_1, p4edecayed.last10_1, p4edecayed.first10_2, p4edecayed.last10_2, p4edecayed.first10_3, p4edecayed.last10_3, p4edecayed.first10_4, p4edecayed.last10_4,
                         p4econtrol.first10_1, p4econtrol.last10_1, p4econtrol.first10_2, p4econtrol.last10_2, p4econtrol.first10_3, p4econtrol.last10_3, p4econtrol.first10_4, p4econtrol.last10_4].every(Number.isFinite),
    // DIP10 — the W-domain scan
    r10_dip_scan: dipScan,
    r10_dip_low_flips: flipsOf(lowKeys), r10_dip_high_flips: flipsOf(highKeys),
    r10_dip_birth_low: birthLow, r10_dip_death_high: deathHigh,
    r10_dip_all_finite: dipAllFinite
  };
  out6.metrics10 = metrics10;
  out6.metrics10Sha = sha(JSON.stringify(metrics10));
  return out6;
}"""
rep(anchor9, metrics10, 'metrics10')

open('/tmp/run10_stage2.mjs', 'w', encoding='utf-8').write(out)
print('stage 2 OK')
