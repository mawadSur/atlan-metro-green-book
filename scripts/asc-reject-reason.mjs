#!/usr/bin/env node
// asc-reject-reason.mjs — READ-ONLY probe to find the App Store review
// rejection reason / Resolution Center message via the ASC API.
// Mirrors asc-submit.mjs's JWT auth. Makes no mutations whatsoever.

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const eas = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8'));
const ios = eas.submit?.production?.ios || {};
const KEY_ID = ios.ascApiKeyId;
const ISSUER_ID = ios.ascApiKeyIssuerId;
const APP_ID = ios.ascAppId;
const KEY_PATH = join(ROOT, (ios.ascApiKeyPath || '').replace(/^\.\//, ''));

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function makeToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign('SHA256');
  signer.update(input);
  signer.end();
  const sig = signer.sign({ key: readFileSync(KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64url(sig)}`;
}

const API = 'https://api.appstoreconnect.apple.com/v1';

async function asc(method, path) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 60000);
  try {
    const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
      method,
      headers: { authorization: `Bearer ${makeToken()}`, 'content-type': 'application/json' },
      signal: ctl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
    return { ok: res.ok, status: res.status, json, text };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function show(label, r) {
  console.log(`\n=== ${label} -> ${r.status}${r.ok ? '' : ' (ERR)'} ===`);
  if (r.json) console.log(JSON.stringify(r.json, null, 2).slice(0, 6000));
  else console.log(r.text.slice(0, 2000));
}

(async () => {
  // 1) Review submissions for the app (these carry the overall review state).
  const subs = await asc('GET',
    `/apps/${APP_ID}/reviewSubmissions?limit=20&include=items,lastUpdatedByActor,submittedByActor`);
  show('reviewSubmissions', subs);

  const subList = subs.json?.data || [];
  // Look at each submission's items + any resolution-center / rejection info.
  for (const s of subList) {
    const sid = s.id;
    const items = await asc('GET',
      `/reviewSubmissions/${sid}/items?include=appStoreVersion,appCustomProductPageVersion`);
    show(`reviewSubmission ${sid} items`, items);
  }

  // 2) App store versions + their submission + appStoreReviewDetail.
  const vers = await asc('GET',
    `/apps/${APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState,platform,createdDate`);
  show('appStoreVersions', vers);

  for (const v of (vers.json?.data || [])) {
    const vid = v.id;
    // appStoreVersionSubmission (older flow) — may carry rejection.
    const vsub = await asc('GET', `/appStoreVersions/${vid}/appStoreVersionSubmission`);
    show(`version ${v.attributes.versionString} appStoreVersionSubmission`, vsub);
    // appStoreReviewDetail.
    const rd = await asc('GET', `/appStoreVersions/${vid}/appStoreReviewDetail`);
    show(`version ${v.attributes.versionString} appStoreReviewDetail`, rd);
  }

  // 3) Resolution Center: try the documented + undocumented endpoints.
  // The public API historically does NOT expose the Resolution Center thread,
  // but newer endpoints exist for rejection messaging. Probe them.
  const probes = [
    `/apps/${APP_ID}/appStoreVersionExperiments`,        // sanity
    `/apps/${APP_ID}?include=appStoreVersions`,          // current versions/state
    `/apps/${APP_ID}/builds?limit=5&sort=-version&fields[builds]=version,processingState,expired,uploadedDate`,
  ];
  for (const p of probes) show(p, await asc('GET', p));

  // 4) Try resolutionCenter-style relationships that some teams report exist.
  for (const v of (vers.json?.data || [])) {
    const vid = v.id;
    for (const rel of ['resolutionCenterThreads', 'resolutionCenterMessages']) {
      const r = await asc('GET', `/appStoreVersions/${vid}/${rel}`);
      show(`version ${v.attributes.versionString} ${rel}`, r);
    }
  }

  // 5) App-level resolution center probes.
  for (const rel of ['resolutionCenterThreads', 'reviewRejections', 'betaAppReviewSubmissions']) {
    show(`app ${rel}`, await asc('GET', `/apps/${APP_ID}/${rel}`));
  }
})();
