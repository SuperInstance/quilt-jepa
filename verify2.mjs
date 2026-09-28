// verify2.mjs — stone chain verifier for receipts/run2.json + registration-v2.json seal.
// Fail-closed, exit 0 only if every row re-hashes to its pin, links are parent-correct, the
// tip matches, and the round-2 registration seal (masked self-sha + mtime binding) verifies.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const GENESIS = 'JEPA-GENESIS-1';

const doc = JSON.parse(fs.readFileSync(path.join(HERE, 'receipts', 'run2.json'), 'utf8'));
let prev = GENESIS;
for (const row of doc.chain) {
  const body = JSON.stringify({ i: row.i, id: row.id, type: row.type, payload: row.payload });
  const h = sha(`${row.prev}:${body}:${row.id}`);
  if (row.prev !== prev) { console.error(`FAIL link break at row ${row.i}`); process.exit(1); }
  if (h !== row.sha) { console.error(`FAIL hash mismatch at row ${row.i} (${row.id})`); process.exit(1); }
  prev = row.sha;
}
if (prev !== doc.tip) { console.error('FAIL tip mismatch'); process.exit(1); }

const regPath = path.join(HERE, 'registration-v2.json');
const regRaw = fs.readFileSync(regPath, 'utf8');
const reg = JSON.parse(regRaw);
const masked = reg.registration.seal.self_sha256_masked;
if (!masked || masked === 'TO_BE_SEALED') { console.error('FAIL registration-v2 not sealed'); process.exit(1); }
const maskedRaw = regRaw.replace(`"self_sha256_masked": "${masked}"`, `"self_sha256_masked": "${'0'.repeat(64)}"`);
if (sha(maskedRaw) !== masked) { console.error('FAIL registration-v2 self-sha mismatch (file mutated after seal)'); process.exit(1); }
const st = fs.statSync(regPath);
if (Math.abs(st.mtimeMs - reg.registration.seal.mtime_local_ms) > 2000) { console.error('FAIL registration-v2 mtime binding'); process.exit(1); }

console.log(`OK round-2 chain ${doc.chain.length} rows, tip ${doc.tip.slice(0, 12)}…, claims ${doc.claims_passed}/${doc.claims_total}, registration-v2 seal verified`);
