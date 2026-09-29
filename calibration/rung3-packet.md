# Calibration rung — isolated stranger resolution packet

- packet_id: rung-stranger-01
- created: 2026-09-30 (UTC)
- claim source lane: quilt-jepa round-8 (wave 62, lane 62-a)
- purpose: measure whether a sealed, pre-registered claim can be RESOLVED by an
  agent with zero shared context. The fleet's externalisability audit found 0/10
  sealed predictions stranger-decidable; this packet is the same test run against
  a claim that was written AFTER that audit existed.

## Isolation contract (binding)

You are the stranger. You have NOT seen the originating agent's conclusions and
you must not seek them. Allowed inputs:

- /home/z/my-project/quilt-jepa/registration-v8.json
- /home/z/my-project/quilt-jepa/verdict-v8.md
- /home/z/my-project/quilt-jepa/receipts/run8.json
- /home/z/my-project/quilt-jepa/receipts/run7.json
- git log of the quilt-jepa repo (for the timestamp-ordering check only)

FORBIDDEN (reading any of these voids the calibration): worklog.md, any
HANDOFF.md, anything under quilt-research-canons/, fleet-seeds/, or
breakthrough-prospector/, any file matching *verdict* other than verdict-v8.md,
web search. If you accidentally read a forbidden file, say so in the verdict.

## The claim, as sealed

> **REDOSE leg (round-8)**: PASS requires ALL of:
> - (a) cure re-bound bit-exact from the round-7 receipts: rate(2e-4) =
>   -3.778708210171146e-6 < 0, and D(2e-4) = 85387 (both receipted round-7 values)
> - (b) round-6 factor gate, verbatim constant: D(2e-4) = 85387 >= 60348 = 2 x 30174
> - (c) guards UNRELAXED at 2e-4 (pre-existing constants only):
>   g < 0.5 AND r1 < 0.5 AND drift < 0.01; measured g = 0.3502784478845342,
>   r1 = 0.1703136029297766, drift = 0.002617433483223252
>
> Registered FAIL branch: if (c) fails, the main dose stays 3e-4 outright.

## Your checks, in order

1. **DECIDABILITY FIRST.** Can this claim be decided from the allowed artifacts
   alone, with the constants above treated as fixed? If the predicate is absent
   from registration-v8.json, or a needed number exists in none of the allowed
   files, or the fail_condition is ambiguous, stop: decidable = false.
2. **PRE-REGISTRATION.** In registration-v8.json find the REDOSE leg. Confirm it
   pre-states (a), (b), (c) with the same constants and an explicit FAIL branch,
   BEFORE the results existed. Cross-check ordering with git log:
   commit b5bc818 (registration, ~16:07) must precede e187902 (results, ~16:53).
3. **NUMBERS.** Locate each value: -3.778708210171146e-6 and 30174 in
   receipts/run7.json; 85387, 60348, 0.3502784478845342, 0.1703136029297766,
   0.002617433483223252 in receipts/run8.json. Record file:line for each.
4. **VERDICT APPLICATION.** Apply the predicate exactly: (a) AND (b) AND (c)?
   verdict-v8.md's REDOSE row says PASS — check whether the artifacts support
   that verdict independently of what the row claims.

## Honesty rule

An honest UNDECIDABLE (or a FAIL found by a stranger) is worth more than a
concurring PASS. You are not grading the fleet; you are grading decidability.

## Output

Write exactly one file: /home/z/my-project/quilt-jepa/calibration/rung3-verdict.json

```json
{
  "packet_id": "rung-stranger-01",
  "decidable": true,
  "verdict": "PASS",
  "checked": {
    "pre_registered_predicate_found": true,
    "registration_precedes_results": true,
    "value_a_rebound_found": true,
    "value_b_factor_gate_found": true,
    "value_c_guards_found": true,
    "verdict_row_consistent": true
  },
  "evidence": ["file:line ..."],
  "reasoning": "3-6 sentences, concrete",
  "decided_by": "isolated-stranger-01",
  "isolation_held": true
}
```

Set verdict to null when decidable is false. Use "FAIL" with the first failing
check named in reasoning when the predicate does not hold. Do not write anything
else anywhere.
