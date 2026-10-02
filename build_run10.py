#!/usr/bin/env python3
# build_run10.py — derives run10.mjs from run9.mjs by exact-match surgical edits.
# Every replacement asserts exactly one match; a zero or multi match aborts with no output file.
import sys

src = open('run9.mjs', encoding='utf-8').read()
out = src
edits = []

def rep(old, new, label):
    global out
    n = out.count(old)
    if n != 1:
        print(f'FAIL [{label}]: {n} matches'); sys.exit(1)
    out = out.replace(old, new)
    edits.append(label)

# ---------------------------------------------------------------- 1. header
i1 = out.index('// run9.mjs — quilt-jepa ROUND 9')
i2 = out.index("'use strict';")
header = '''// run10.mjs — quilt-jepa ROUND 10 (wave 64, lane 64-b-r): THE DEPTH-LADDER ROUND. Executes the
// sealed registration-v10.json: the round-4..9 operating point is UNCHANGED (lr 0.3, tau 0.99998,
// K4 = 1.5e-6, amp = 0.9, same seed; core/ byte-untouched) — every round-4 metric must reproduce
// receipts/run4.json BIT-EXACTLY (29/29), every round-5 metric receipts/run5.json BIT-EXACTLY
// (92/92), every round-6 metric design6.json == run6.json == run7.json == run8.json ==
// run9.json, every round-7 metric run7.json == run8.json == run9.json, every round-8 metric
// run8.json == run9.json, every round-9 metric run9.json.metrics_round9 — at SHA level the run's
// carried/round-6/round-7/round-8/round-9 metric shas must equal run9.json's R4 row shas
// (ff60c211… / 7a20e613… / 30657dbe… / 34ec241a… / c972511d…). All twenty-five round-4..9 claims
// are re-scored under their UNCHANGED registered rules (the honest round-8 MECH FAIL and round-9
// CURE9/DIP9 FAILs carry; SAT9 re-binds PASS), and THREE new claims are scored (the round-9-priced
// agenda, registration-v10):
//   DOSE10    — THE DOSE DECISION VIA |Wc|-ROOM ORDERING ACROSS A DEPTH LADDER: the switch ratio
//               is measured on BOTH decayed arms (2e-4 cured-dose candidate, 3e-4 main) at ALL
//               FIVE shared-finite ladder depths {20000, 30000, 40000, 50000, 75000}, each arm at
//               its own dose (the carried PLAST convention, the round-9 75k probe class); the
//               pre-registered ordering-curve law: Delta(d) = ratio(2e-4,d) - ratio(3e-4,d)
//               STRICTLY DECREASING with EXACTLY ONE sign crossing d*; all-engage legs; the
//               DECISION RULE of record executes on PASS (wd 2e-4 CONFIRMED as the plasticity
//               dose of the two-dose regime for round 11, 3e-4 UNCHANGED as longevity main,
//               |Wc|-room RE-PRICED depth-refuted, dose-selection CLOSED)
//   SAT10     — FOURTH-SWITCH PLATEAU on TWO cascades from the arms' own 20k snapshots, no
//               weight reset, 400 steps/stage: the registered D-cascade (trivial -> seedB ->
//               seedC -> seedD) with pre-registered FLAT-PLATEAU rho20_4 ∈ [rho20_3, 1) and
//               inc4 <= inc3; the DIFFERENT-PROBE-WORLD E-cascade (stage-1 on World2(seedE))
//               with rho20_4^E < 1.0; composition end-4 legs on both cascades
//   DIP10     — DIP W-DOMAIN BOUNDARIES: THIRTY-NINE new g-points at THIRTEEN window scales
//               (LOW {0.55..0.95}, HIGH {1.1, 1.25, 1.5, 1.75}), W_s(lr) = round(s*30/lr);
//               BIRTH (localMin(0.95) TRUE, left inequality holds at 0.9 fails at 0.55, right
//               holds at EVERY low scale), DEATH (localMin(1.75) FALSE, localMin(1.1) TRUE),
//               INTERVAL (<= 1 localMin flip per ladder), GATE DOMAIN (dipmag(0.55) < 0.05 AND
//               dipmag(1.75) < 0.05); birth/death brackets of record receipted as findings
// FAIL-CLOSED: the run re-verifies the registration-v10 seal (masked sha + mtime) at startup and
// refuses otherwise. Deterministic core executed twice (R4) and cross-checked bit-for-bit
// against receipts/run4.json, run5.json, design6.json, run6.json, run7.json, run8.json AND
// run9.json (all five metric layers + R4 row shas) AND the disclosed design8.json, design9.json
// AND design10.json pipeline values — probe==run==run-twin==r4==r5==r6==r7==r8==r9, the chain
// now TEN rounds deep.
// Runner-level additions only (no core arithmetic change, no gate constant changed anywhere):
// (i) captureAt extensions — the wd 2e-4 arm's capture list gains [30000, 40000, 50000] and the
//     wd 3e-4 main arm's capture list gains [30000, 40000, 50000] (READ-ONLY weight capture,
//     arithmetic provably unchanged: design10 I-A10a/I-A10b receipt the extended-capture
//     identities on BOTH arms bit-exactly vs the run7/design8/run9/design6 receipts);
// (ii) trivialSwitchProbe4 = the carried trivialSwitchProbe3 + a FOURTH 400-step window on a
//     fresh World2(seedD) + a parameterized stage-1 world ('trivial' — probe3's exact stage-1,
//     or 'world2' with seedE — the different-probe-world E-cascade); stage-1/2/3 arithmetic
//     identity to the carried probe3 proven BIT-EXACT in design10 I-B10 on the receipted
//     control path and re-bound in-run on BOTH arms;
// (iii) the DOSE10 ladder switch probes (the carried trivialSwitchProbe class);
// (iv) THIRTY-NINE DIP10 gGateFlex scan points (the receipted 1x/0.5x/2x rows are re-bound and
//     design10 I-C10 binds the exact (lr, tau, W, wd=0, trivial world) path on all twelve
//     receipted anchor values).
'''
out = out[:i1] + header + out[i2:]
edits.append('header')

# ---------------------------------------------------------------- 2. seal verification target
rep("const REG = path.join(HERE, 'registration-v9.json');",
    "const REG = path.join(HERE, 'registration-v10.json');",
    'reg-path')

# ---------------------------------------------------------------- 3. receipt loads
rep("const design9 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design9.json'), 'utf8')); // round-9 pre-seal probe (gates nothing; disclosed values bound)\nconst run7Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run7.json'), 'utf8')); // round-7 receipt of record (bit-exact binding + R4 row shas)\nconst run8Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run8.json'), 'utf8')); // round-8 receipt of record (bit-exact binding + R4 row shas)",
    "const design9 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design9.json'), 'utf8')); // round-9 pre-seal probe (gates nothing; disclosed values bound)\nconst design10 = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'design10.json'), 'utf8')); // round-10 pre-seal probe (gates nothing; disclosed values bound)\nconst run7Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run7.json'), 'utf8')); // round-7 receipt of record (bit-exact binding + R4 row shas)\nconst run8Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run8.json'), 'utf8')); // round-8 receipt of record (bit-exact binding + R4 row shas)\nconst run9Receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, 'run9.json'), 'utf8')); // round-9 receipt of record (bit-exact binding + R4 row shas)",
    'receipt-loads')

# ---------------------------------------------------------------- 4. round-10 constants
rep("const R9_DIP_W = { '0.5x': { '0.15': 100, '0.2': 75, '0.25': 60 }, '2x': { '0.15': 400, '0.2': 300, '0.25': 240 } }; // W scalings of the registered W(lr) = round(30/lr) row",
    """const R9_DIP_W = { '0.5x': { '0.15': 100, '0.2': 75, '0.25': 60 }, '2x': { '0.15': 400, '0.2': 300, '0.25': 240 } }; // W scalings of the registered W(lr) = round(30/lr) row
const R10_SEEDD_SUFFIX = '|round10-worldD'; // round-10 seedD derivation suffix (registered; no new entropy)
const R10_SEEDE_SUFFIX = '|round10-worldE'; // round-10 seedE derivation suffix (registered; no new entropy)
const R10_MAIN_CAPTURE = [20000, 30000, 40000, 50000, 75000, 100000, 500000]; // main-arm read-only capture list (30000/40000/50000 added — design10 I-A10b identity class; arithmetic unchanged)
const R10_CURE_CAPTURE = [20000, 30000, 40000, 50000, 75000]; // the 2e-4 cured-dose arm's read-only capture steps (the DOSE10 depth ladder; 75000 = deepest receipted checkpoint below its D = 85387)
const R10_LADDER = [20000, 30000, 40000, 50000, 75000]; // the DOSE10 depth ladder (shared-finite depths; 2e-4 diverges at 85387)
const R10_DIP_SCALES_LOW = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]; // DIP10 low ladder (birth bracket between the failed 0.5x and the receipted 1x)
const R10_DIP_SCALES_HIGH = [1.1, 1.25, 1.5, 1.75]; // DIP10 high ladder (death bracket between the receipted 1x and the failed 2x)""",
    'r10-constants')

# ---------------------------------------------------------------- 5. trivialSwitchProbe4
anchor5 = "// spearman (ROUND 8 runner-level addition per registration-v8): Spearman rank correlation,"
probe4 = '''// trivialSwitchProbe4 (ROUND 10 — runner-level addition per registration-v10): stages 1..3 are
// ARITHMETIC-IDENTICAL to the carried trivialSwitchProbe3 (identity proven BIT-EXACT in design10
// I-B10 on the receipted control path); stage 1's world is parameterized: 'trivial' (the
// registered cascade — new World(seedU32), exactly probe3's stage 1) or 'world2' (the
// DIFFERENT-PROBE-WORLD E-cascade — fresh World2(stage1Seed) from its own t=0). Adds the FOURTH
// switch: a fresh World2(seedD) from its own t=0, 400 steps, continuing from the end state of
// stage 3 with NO weight reset between stages. Per-stage end-weight capture after each stage.
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

'''
rep(anchor5, probe4 + anchor5, 'probe4-fn')

# ---------------------------------------------------------------- 6. main-arm capture list
rep("const am = horizonRun5(World2, seedU32, LR3, TAU4, WD_MAIN, T_HORIZON, 'registered', RLONG_CKPTS, R9_MAIN_CAPTURE); // round-9: capture list gains 75000 (read-only — design9 I-A9 identity class; R4 binds every round-6/7/8 metric bit-exact)",
    "const am = horizonRun5(World2, seedU32, LR3, TAU4, WD_MAIN, T_HORIZON, 'registered', RLONG_CKPTS, R10_MAIN_CAPTURE); // round-10: capture list gains 30000/40000/50000 (read-only — design10 I-A10b identity class; R4 binds every round-6/7/8/9 metric bit-exact)",
    'main-capture')

# ---------------------------------------------------------------- 7. cure capture list
rep("const cap = (wd === 2e-4) ? R9_CURE_CAPTURE : [20000]; // round-9: the 2e-4 cured-dose arm gains captureAt [20000, 75000] (read-only — design9 I-A9 identity class; R4 binds every round-7 metric bit-exact)",
    "const cap = (wd === 2e-4) ? R10_CURE_CAPTURE : [20000]; // round-10: the 2e-4 cured-dose arm's capture list gains 30000/40000/50000 (read-only — design10 I-A10a identity class; R4 binds every round-7 metric bit-exact)",
    'cure-capture')

open('/tmp/run10_stage1.mjs', 'w', encoding='utf-8').write(out)
print('stage 1 OK:', edits)
