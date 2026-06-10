#!/usr/bin/env node
// asc-testflight.mjs — drive App Store Connect TestFlight via the ASC API,
// no browser/login needed. Uses the API key already configured in eas.json.
//
// Mints an ES256 JWT from the .p8 key (native crypto, no deps) and calls the
// App Store Connect API. Subcommands:
//   groups                       list beta groups (id + name + internal flag)
//   builds                       list builds for the app (id + version + state)
//   invite <email> <groupId>     add an internal tester to a group (sends email)
//   tester-status <email>        look up a tester's state
//
// Env/config read from eas.json submit.production.ios: ascApiKeyId,
// ascApiKeyIssuerId, ascApiKeyPath, ascAppId.

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

if (!KEY_ID || !ISSUER_ID || !APP_ID) {
  console.error('Missing ascApiKeyId / ascApiKeyIssuerId / ascAppId in eas.json');
  process.exit(1);
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Mint a short-lived ES256 JWT for the App Store Connect API.
function makeToken(nowSec) {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const payload = {
    iss: ISSUER_ID,
    iat: nowSec,
    exp: nowSec + 600, // 10 min (ASC max 20)
    aud: 'appstoreconnect-v1',
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const privateKey = readFileSync(KEY_PATH, 'utf8');
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  // ASC requires JOSE (raw r||s) signatures, which Node emits with dsaEncoding ieee-p1363.
  const sig = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(sig)}`;
}

const API = 'https://api.appstoreconnect.apple.com/v1';

async function asc(method, path, body, nowSec) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${makeToken(nowSec)}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok) {
    const detail = json?.errors?.map((e) => `${e.title}: ${e.detail}`).join('; ') || text;
    throw new Error(`ASC ${method} ${path} -> ${res.status}: ${detail}`);
  }
  return json;
}

async function listGroups(nowSec) {
  const r = await asc('GET', `/betaGroups?filter[app]=${APP_ID}&limit=200`, null, nowSec);
  return (r.data || []).map((g) => ({
    id: g.id,
    name: g.attributes.name,
    isInternal: g.attributes.isInternalGroup,
    publicLinkEnabled: g.attributes.publicLinkEnabled,
    publicLink: g.attributes.publicLink || null,
  }));
}

async function listBuilds(nowSec) {
  const r = await asc('GET', `/builds?filter[app]=${APP_ID}&limit=10&sort=-version`, null, nowSec);
  return (r.data || []).map((b) => ({
    id: b.id,
    version: b.attributes.version,
    processingState: b.attributes.processingState,
    expired: b.attributes.expired,
  }));
}

// Add an internal tester: create the betaTester with a relationship to the
// group. ASC sends the invite email automatically for internal groups.
async function invite(email, groupId, nowSec) {
  const body = {
    data: {
      type: 'betaTesters',
      attributes: { email, firstName: 'Partner', lastName: 'Tester' },
      relationships: {
        betaGroups: { data: [{ type: 'betaGroups', id: groupId }] },
      },
    },
  };
  return asc('POST', '/betaTesters', body, nowSec);
}

// Create an internal beta group (no Apple review needed for internal).
async function createInternalGroup(name, nowSec) {
  const body = {
    data: {
      type: 'betaGroups',
      attributes: { name, isInternalGroup: true },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  };
  const r = await asc('POST', '/betaGroups', body, nowSec);
  return r.data;
}

// Attach a build to a beta group so its testers can install it.
async function addBuildToGroup(groupId, buildId, nowSec) {
  return asc('POST', `/betaGroups/${groupId}/relationships/builds`, {
    data: [{ type: 'builds', id: buildId }],
  }, nowSec);
}

// Expire a build so testers can no longer install it (used to retire a bad
// build once a fixed one is live).
async function expireBuild(buildId, nowSec) {
  return asc('PATCH', `/builds/${buildId}`, {
    data: { type: 'builds', id: buildId, attributes: { expired: true } },
  }, nowSec);
}

async function testerStatus(email, nowSec) {
  const r = await asc(
    'GET',
    `/betaTesters?filter[email]=${encodeURIComponent(email)}&include=betaGroups`,
    null,
    nowSec
  );
  return r.data || [];
}

// nowSec must be passed in (Date.now is fine in a plain script run).
const nowSec = Math.floor(Date.now() / 1000);
const [cmd, ...rest] = process.argv.slice(2);

try {
  if (cmd === 'groups') {
    console.log(JSON.stringify(await listGroups(nowSec), null, 2));
  } else if (cmd === 'builds') {
    console.log(JSON.stringify(await listBuilds(nowSec), null, 2));
  } else if (cmd === 'invite') {
    const [email, groupId] = rest;
    if (!email || !groupId) throw new Error('usage: invite <email> <groupId>');
    const r = await invite(email, groupId, nowSec);
    console.log('✓ invited', email, '->', JSON.stringify(r.data?.attributes || {}));
  } else if (cmd === 'create-group') {
    const name = rest[0] || 'Internal Testers';
    const g = await createInternalGroup(name, nowSec);
    console.log('✓ created group', JSON.stringify({ id: g.id, name: g.attributes.name, internal: g.attributes.isInternalGroup }));
  } else if (cmd === 'add-build') {
    const [groupId, buildId] = rest;
    if (!groupId || !buildId) throw new Error('usage: add-build <groupId> <buildId>');
    await addBuildToGroup(groupId, buildId, nowSec);
    console.log('✓ build', buildId, 'added to group', groupId);
  } else if (cmd === 'expire-build') {
    const [buildId] = rest;
    if (!buildId) throw new Error('usage: expire-build <buildId>');
    await expireBuild(buildId, nowSec);
    console.log('✓ build', buildId, 'expired');
  } else if (cmd === 'tester-status') {
    console.log(JSON.stringify(await testerStatus(rest[0], nowSec), null, 2));
  } else {
    console.log('subcommands: groups | builds | invite <email> <groupId> | tester-status <email>');
  }
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
