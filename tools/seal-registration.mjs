// seal-registration.mjs — one-shot (idempotent): write mtime first, then masked self-sha over final bytes.
// Scheme (must match verify.mjs): self_sha256_masked = sha256(final file bytes with the
// self_sha256_masked VALUE replaced by 64 zeros). mtime forced to fixedMs afterwards.
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const p = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'registration.json');
const fixedMs = parseInt(process.argv[2] || '1790574965122', 10); // stable default = original seal moment
let raw = fs.readFileSync(p, 'utf8');
// 1) normalize: ensure mtime_local_ms is present and self mask is zeros
raw = raw.replace(/"mtime_local_ms": \d+/, '"mtime_local_ms": ' + fixedMs);
if (!raw.includes('"mtime_local_ms"')) {
  raw = raw.replace('"sealed_by": "keeper, wave 49, before first run"', '"sealed_by": "keeper, wave 49, before first run", "mtime_local_ms": ' + fixedMs);
}
raw = raw.replace(/"self_sha256_masked": "[0-9a-f]{64}"/, '"self_sha256_masked": "' + '0'.repeat(64) + '"');
fs.writeFileSync(p, raw);
// 2) hash final bytes, substitute mask -> sha
const body = fs.readFileSync(p, 'utf8');
const selfSha = crypto.createHash('sha256').update(body).digest('hex');
fs.writeFileSync(p, body.replace('"self_sha256_masked": "' + '0'.repeat(64) + '"', '"self_sha256_masked": "' + selfSha + '"'));
// 3) force mtime binding
fs.utimesSync(p, new Date(fixedMs), new Date(fixedMs));
console.log('sealed self_sha256_masked=' + selfSha + ' mtime_local_ms=' + fixedMs);
