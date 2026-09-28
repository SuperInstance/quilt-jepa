// seal-file.mjs — generic one-shot sealer (round-2: any registration file). Same scheme as
// seal-registration.mjs (must match verify.mjs family): self_sha256_masked = sha256(final file
// bytes with the mask VALUE replaced by 64 zeros); mtime forced to fixedMs afterwards.
// usage: node tools/seal-file.mjs <path-to-json> <fixedMs>
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const p = path.resolve(process.argv[2]);
const fixedMs = parseInt(process.argv[3], 10);
if (!p || !Number.isFinite(fixedMs)) { console.error('usage: node tools/seal-file.mjs <path> <fixedMs>'); process.exit(2); }
let raw = fs.readFileSync(p, 'utf8');
raw = raw.replace(/"mtime_local_ms":\s*\d+/, '"mtime_local_ms": ' + fixedMs);
// normalize ANY current mask value (placeholder like TO_BE_SEALED, zeros, or a stale sha) to zeros
// (v1 bug receipted: the old regex only matched [0-9a-f]{64}, so a fresh placeholder silently
//  no-oped BOTH replaces while the tool still printed "sealed" — run against unsealed reg = VOID)
if (!/"self_sha256_masked":\s*"/.test(raw)) { console.error('no seal block found in ' + p); process.exit(2); }
raw = raw.replace(/"self_sha256_masked":\s*"[^"]*"/, '"self_sha256_masked": "' + '0'.repeat(64) + '"');
fs.writeFileSync(p, raw);
const body = fs.readFileSync(p, 'utf8');
const selfSha = crypto.createHash('sha256').update(body).digest('hex');
fs.writeFileSync(p, body.replace('"self_sha256_masked": "' + '0'.repeat(64) + '"', '"self_sha256_masked": "' + selfSha + '"'));
fs.utimesSync(p, new Date(fixedMs), new Date(fixedMs));
console.log('sealed ' + p + ' self_sha256_masked=' + selfSha + ' mtime_local_ms=' + fixedMs);
