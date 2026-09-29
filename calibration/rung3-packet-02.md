# Calibration rung — isolated stranger resolution packet 02

- packet_id: rung-stranger-02
- created: 2026-09-30 (UTC)
- claim source lane: quilt-jepa round-8 (wave 62, lane 62-a)
- relationship to packet 01: packet 01 (rung-stranger-01) resolved a PASS claim.
  This packet resolves a FAIL claim on purpose — the ladder needs to know the
  fleet's FAIL branches survive external reading, not just its PASS branches.

## Isolation contract (binding)

You are the stranger. You have NOT seen the originating agent's conclusions and
you must not seek them. Allowed inputs:

- /home/z/my-project/quilt-jepa/registration-v8.json
- /home/z/my-project/quilt-jepa/verdict-v8.md
- /home/z/my-project/quilt-jepa/receipts/run8.json
- git log of the quilt-jepa repo (ordering check only)

FORBIDDEN (reading any of these voids the calibration): worklog.md, any
HANDOFF.md, anything under quilt-research-canons/, fleet-seeds/,
breakthrough-prospector/, quilt-jepa/calibration/ (including packet 01 and its
verdict), receipts/run7.json this time, web search. If you accidentally read a
forbidden file, say so in the verdict.

## The claim, as sealed

> **MECH leg-2 (compounding) FAILED on its pre-priced SATURATION branch:**
> the registered predicate for compounding is `rho20_2 < rho20_1 AND rho20_2 < 1.0`.
> Measured: rho20_2 = 0.955013877487518 and rho20_1 = 0.9311659387409014 —
> so rho20_2 lies in [rho20_1, 1.0), which VIOLATES the predicate's first
> conjunct. The plasticity advantage PERSISTED at the second switch
> (rho20_2 < 1.0) but did NOT GROW. Leg-1 (dose-ordering, Spearman >= 0.75)
> HELD at Spearman = 1.0, so the compound MECH claim fails on leg-2 alone.
> The pre-priced consequence of this FAIL is the saturation finding:
> the advantage is a one-time re-balancing, not a compounding asset.

## Your checks, in order

1. **DECIDABILITY FIRST.** Can this claim be decided from the allowed artifacts
   alone? If the registered predicate or the pre-priced FAIL branch is absent
   from registration-v8.json, or either rho value is absent from run8.json,
   stop: decidable = false.
2. **PRE-REGISTRATION.** In registration-v8.json locate the MECH claim and
   confirm: (a) the compounding predicate is pre-stated as
   `rho20_2 < rho20_1 AND < 1.0` (or exact equivalent), (b) the FAIL branch
   (saturation / one-time re-balancing) is priced BEFORE the run — quote it.
3. **NUMBERS.** Locate rho20_1 and rho20_2 in receipts/run8.json at full
   precision (hint: field names beginning r8_rho20). Also locate the recorded
   self-check for `rho20_2 < rho20_1` if present. Record file:line for each.
4. **ARITHMETIC.** Apply the predicate exactly:
   is 0.955013877487518 < 0.9311659387409014? (No.) Is 0.955013877487518 < 1.0?
   (Yes.) Therefore which conjuncts hold, and what is the compound verdict?
5. **CONJUNCTION LOGIC.** Leg-1 held (Spearman 1.0), leg-2 failed — confirm
   the MECH row in verdict-v8.md records FAIL and that the scorecard is
   21/22 with MECH as the single FAIL, consistent with the artifacts.
6. **FAIL-BRANCH HONESTY.** The saturation interpretation ("persists but does
   not grow") — is it supported by the numbers alone, i.e., is it a
   restatement of the interval membership rather than a new claim?

## Honesty rule

An honest UNDECIDABLE (or a verdict that contradicts the row) is worth more
than a concurring PASS-shaped answer. You are grading whether a FAIL claim is
externally checkable, not whether the fleet was right.

## Output

Write exactly one file: /home/z/my-project/quilt-jepa/calibration/rung3-verdict-02.json

```json
{
  "packet_id": "rung-stranger-02",
  "decidable": true,
  "verdict": "FAIL_CONFIRMED",
  "checked": {
    "predicate_pre_stated": true,
    "fail_branch_priced_pre_run": true,
    "rho20_values_found": true,
    "interval_arithmetic_correct": true,
    "conjunction_logic_correct": true,
    "verdict_row_consistent": true,
    "saturation_reading_supported": true
  },
  "evidence": ["file:line ..."],
  "reasoning": "3-6 sentences, concrete",
  "decided_by": "isolated-stranger-02",
  "isolation_held": true
}
```

Verdict semantics: use "FAIL_CONFIRMED" when the artifacts support the sealed
FAIL; "FAIL_REFUTED" if the numbers actually satisfy the predicate; null with
decidable=false when the claim cannot be decided from the allowed inputs.
Do not write anything else anywhere.
