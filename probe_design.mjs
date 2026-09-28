// probe_design.mjs — ROUND 3 DESIGN-TIME probe sequence (NOT evidence, NOT gated).
// Receipted in receipts/design3.json and referenced by registration-v3.json BEFORE sealing.
// Sequence: (P1) scale-only repair probe (jepa3-v1: per-latent scale, jepa.js transposed Wc
// inherited) -> gate unreachable; (P2) finite-difference gradient check (probe_grad.mjs) ->
// Wc update TRANSPOSED confirmed; (P3) post-repair probe (jepa3-v2: scale + chain-rule
// indexing) -> gate reaches PASS region on the trivial world. All configs recorded.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { World } = require('./core/world.js');
const { World2 } = require('./core/world2.js');
const { Jepa3 } = require('./core/jepa3.js');

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

function probe(WorldCls, seed, steps, lr) {
  const world = new WorldCls(seed);
  const jepa = new Jepa3(seed);
  jepa.lr = lr;
  const losses = [];
  let obs = world.observe();
  for (let t = 0; t < steps; t++) {
    world.step();
    const o1 = world.observe();
    losses.push(jepa.trainStep(obs, o1));
    obs = o1;
  }
  return {
    steps, lr,
    first10: mean(losses.slice(0, 10)),
    last10: mean(losses.slice(-10)),
    ratio: mean(losses.slice(-10)) / mean(losses.slice(0, 10)),
    finite: losses.every((l) => Number.isFinite(l))
  };
}

const rows = [];
// P3: post-repair (jepa3-v2). Trivial world = the L1 gate world; hard world = explosion check.
for (const [wname, W] of [['trivial(world.js)', World], ['hard(world2)', World2]]) {
  for (const lr of [0.02, 0.05, 0.1]) {
    const r = probe(W, 12345, 100, lr);
    rows.push({ phase: 'P3_post_repair', world: wname, optimizer: 'jepa3-v2 per-latent + chain-rule Wc', ...r });
  }
}
// 400-step hard-world trajectory at the registered lr (design visibility into R1 regime)
{
  const r = probe(World2, 12345, 400, 0.02);
  rows.push({ phase: 'P3_post_repair', world: 'hard(world2)', optimizer: 'jepa3-v2 per-latent + chain-rule Wc', steps: 400, lr: 0.02, ...r });
}
// P1 receipts (recorded numbers from the pre-fix probe run, jepa3-v1, kept for the record)
rows.push(
  { phase: 'P1_scale_only', world: 'trivial(world.js)', optimizer: 'jepa3-v1 per-latent, Wc TRANSPOSED inherited', lr: 0.02, ratio: 1.1035, first10: 0.00790, finite: true },
  { phase: 'P1_scale_only', world: 'trivial(world.js)', optimizer: 'jepa3-v1 per-latent, Wc TRANSPOSED inherited', lr: 0.05, ratio: 1.0136, first10: 0.00783, finite: true },
  { phase: 'P1_scale_only', world: 'trivial(world.js)', optimizer: 'jepa3-v1 per-latent, Wc TRANSPOSED inherited', lr: 0.1, ratio: 0.8869, first10: 0.00772, finite: true },
  { phase: 'P1_scale_only', world: 'hard(world2)', optimizer: 'jepa3-v1 per-latent, Wc TRANSPOSED inherited', lr: 0.02, ratio: 1.0531, first10: 0.00885, finite: true },
  { phase: 'P1_scale_only', world: 'hard(world2)', optimizer: 'jepa3-v1 per-latent, Wc TRANSPOSED inherited', lr: 0.1, ratio: 0.8615, first10: 0.00865, finite: true },
  { phase: 'P1_scale_only', world: 'trivial(world.js)', optimizer: 'jepa.js STARVED 1/N (round-1/2 reference)', lr: 0.02, ratio: 1.1728, first10: 0.00795, finite: true },
  { phase: 'P2_gradient_check', method: 'finite-difference eps=1e-5, cell 3, 4 entries', verdict: 'chain-rule convention matches fd to <=7.5e-9; implemented form errs up to 5.7e-5 incl. sign flips -> Wc update TRANSPOSED in jepa.js', receipt: 'probe_grad.mjs stdout (this commit)' }
);

const doc = {
  schema: 'quilt-jepa/design-probe-v3',
  purpose: 'design-time sanity ONLY — receipted before registration-v3 seal; gates nothing',
  sequence: 'P1 scale-only (gate unreachable) -> P2 gradient check (transposition found) -> P3 scale+indexing (gate reachable)',
  rows
};
const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'receipts', 'design3.json');
fs.writeFileSync(out, JSON.stringify(doc, null, 1));
for (const r of rows) {
  if (r.phase === 'P3_post_repair') console.log(`${r.phase} ${r.world} lr=${r.lr} steps=${r.steps} ratio=${r.ratio.toFixed(4)} first10=${r.first10.toFixed(5)} finite=${r.finite}`);
}
