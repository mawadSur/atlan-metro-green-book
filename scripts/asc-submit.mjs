#!/usr/bin/env node
// asc-submit.mjs — drive an App Store *review submission* via the ASC API,
// no browser/login. Companion to asc-testflight.mjs (which handles TestFlight).
//
// Reads creds from eas.json submit.production.ios and listing copy from
// scripts/asc-listing.json. Mints an ES256 JWT (native crypto, no deps).
//
// Subcommands (run in roughly this order):
//   state                      print version/listing/build/review readiness
//   metadata                   write description/keywords/subtitle/urls/promo/whatsNew
//   category                   set primary=TRAVEL, secondary=LIFESTYLE
//   age-rating                 declare 4+ (no objectionable content)
//   pricing                    set the app to Free in all territories
//   content-rights             declare we own / are licensed for all content
//   screenshots <dir>          upload every *.png in <dir> to the 6.9" set
//   attach-build <buildId>     attach a TestFlight build to the version
//   review-detail <name> <email> <phone>   set App Review contact
//   submit                     create + submit the review submission
//   all <buildId> <name> <email> <phone> <shotsDir>   run everything in order

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createSign, createHash } from 'node:crypto';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const eas = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8'));
const ios = eas.submit?.production?.ios || {};
const KEY_ID = ios.ascApiKeyId;
const ISSUER_ID = ios.ascApiKeyIssuerId;
const APP_ID = ios.ascAppId;
const KEY_PATH = join(ROOT, (ios.ascApiKeyPath || '').replace(/^\.\//, ''));
const LISTING = JSON.parse(readFileSync(join(__dirname, 'asc-listing.json'), 'utf8'));
const LOCALE = LISTING.locale || 'en-US';

if (!KEY_ID || !ISSUER_ID || !APP_ID) {
  console.error('Missing ascApiKeyId / ascApiKeyIssuerId / ascAppId in eas.json');
  process.exit(1);
}

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

async function asc(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${makeToken()}`, 'content-type': 'application/json' },
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

// --- helpers to locate the editable version + its localization ---------------

const EDITABLE = [
  'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED',
  'METADATA_REJECTED', 'INVALID_BINARY',
];

async function editableVersion() {
  const r = await asc('GET', `/apps/${APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState,platform`);
  const v = (r.data || []).find((x) => x.attributes.platform === 'IOS' && EDITABLE.includes(x.attributes.appStoreState))
    || (r.data || []).find((x) => x.attributes.platform === 'IOS');
  if (!v) throw new Error('no iOS appStoreVersion found');
  return v;
}

async function versionLocalization(versionId) {
  const r = await asc('GET', `/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
  const loc = (r.data || []).find((l) => l.attributes.locale === LOCALE) || (r.data || [])[0];
  if (!loc) throw new Error(`no localization (wanted ${LOCALE})`);
  return loc;
}

// --- subcommands -------------------------------------------------------------

async function cmdState() {
  const v = await editableVersion();
  const loc = await versionLocalization(v.id);
  const a = loc.attributes;
  const build = await asc('GET', `/appStoreVersions/${v.id}/build`).catch(() => null);
  const review = await asc('GET', `/appStoreVersions/${v.id}/appStoreReviewDetail`).catch(() => null);
  const shots = await countScreenshots(loc.id);
  console.log(JSON.stringify({
    version: v.attributes.versionString,
    state: v.attributes.appStoreState,
    description: !!a.description, keywords: a.keywords || null,
    subtitle: a.subtitle || null, supportUrl: a.supportUrl || null,
    promo: !!a.promotionalText, whatsNew: !!a.whatsNew,
    buildAttached: !!build?.data, screenshots: shots,
    reviewContact: review?.data ? {
      first: review.data.attributes.contactFirstName,
      email: review.data.attributes.contactEmail,
      phone: review.data.attributes.contactPhone,
    } : null,
  }, null, 2));
}

async function cmdMetadata() {
  const v = await editableVersion();
  const loc = await versionLocalization(v.id);
  const attrs = {
    description: LISTING.description,
    keywords: LISTING.keywords,
    promotionalText: LISTING.promotionalText,
    supportUrl: LISTING.supportUrl,
    marketingUrl: LISTING.marketingUrl,
  };
  // whatsNew only applies to app *updates*, not a first release — including it
  // on a PREPARE_FOR_SUBMISSION version 1.0 is rejected ("cannot be edited").
  if (LISTING.whatsNew && process.env.ASC_WITH_WHATSNEW) attrs.whatsNew = LISTING.whatsNew;
  await asc('PATCH', `/appStoreVersionLocalizations/${loc.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: attrs },
  });
  // subtitle + privacy policy live on the appInfoLocalization, not the version localization
  await setAppInfoLoc();
  console.log('✓ metadata written for', LOCALE);
}

// subtitle + privacyPolicyUrl live on the appInfoLocalization (per-locale on the
// editable appInfo), not on the version localization.
async function setAppInfoLoc() {
  const infos = await asc('GET', `/apps/${APP_ID}/appInfos?include=appInfoLocalizations`);
  const info = (infos.data || []).find((i) => EDITABLE.includes(i.attributes.appStoreState)) || (infos.data || [])[0];
  const locs = (infos.included || []).filter((x) =>
    x.type === 'appInfoLocalizations' &&
    info?.relationships?.appInfoLocalizations?.data?.some((d) => d.id === x.id));
  const loc = locs.find((l) => l.attributes.locale === LOCALE) || locs[0];
  if (!loc) return;
  const attrs = {};
  if (LISTING.subtitle) attrs.subtitle = LISTING.subtitle;
  if (LISTING.privacyPolicyUrl) attrs.privacyPolicyUrl = LISTING.privacyPolicyUrl;
  if (!Object.keys(attrs).length) return;
  await asc('PATCH', `/appInfoLocalizations/${loc.id}`, {
    data: { type: 'appInfoLocalizations', id: loc.id, attributes: attrs },
  });
  console.log('✓ subtitle + privacy policy url set');
}

async function cmdCategory() {
  const infos = await asc('GET', `/apps/${APP_ID}/appInfos`);
  const info = (infos.data || []).find((i) => EDITABLE.includes(i.attributes.appStoreState)) || (infos.data || [])[0];
  await asc('PATCH', `/appInfos/${info.id}`, {
    data: {
      type: 'appInfos', id: info.id,
      relationships: {
        primaryCategory: { data: { type: 'appCategories', id: 'TRAVEL' } },
        secondaryCategory: { data: { type: 'appCategories', id: 'LIFESTYLE' } },
      },
    },
  });
  console.log('✓ category: primary=TRAVEL, secondary=LIFESTYLE');
}

async function cmdAgeRating() {
  // In the current ASC API the declaration hangs off appInfo, not the version.
  const infos = await asc('GET', `/apps/${APP_ID}/appInfos`);
  const info = (infos.data || []).find((i) => EDITABLE.includes(i.attributes.appStoreState)) || (infos.data || [])[0];
  const decl = await asc('GET', `/appInfos/${info.id}/ageRatingDeclaration`);
  const id = decl.data?.id;
  if (!id) throw new Error('no ageRatingDeclaration on appInfo');
  // Apple's 2025 expanded questionnaire. This is a halal/mosque/prayer-times
  // directory with no objectionable content: all frequency fields NONE, all
  // capability flags off / NOT_PRESENT. User reviews are not user-generated
  // content in Apple's sense; there is no chat, ads, gambling, or web browser.
  const none = {
    alcoholTobaccoOrDrugUseOrReferences: 'NONE',
    contests: 'NONE',
    gamblingSimulated: 'NONE',
    medicalOrTreatmentInformation: 'NONE',
    profanityOrCrudeHumor: 'NONE',
    sexualContentGraphicAndNudity: 'NONE',
    sexualContentOrNudity: 'NONE',
    horrorOrFearThemes: 'NONE',
    matureOrSuggestiveThemes: 'NONE',
    violenceCartoonOrFantasy: 'NONE',
    violenceRealistic: 'NONE',
    violenceRealisticProlongedGraphicOrSadistic: 'NONE',
    gunsOrOtherWeapons: 'NONE',
    healthOrWellnessTopics: false,
    unrestrictedWebAccess: false,
    gambling: false,
    advertising: false,
    messagingAndChat: false,
    userGeneratedContent: false,
    parentalControls: false,
    lootBox: false,
    ageAssurance: false,
    kidsAgeBand: null,
  };
  await asc('PATCH', `/ageRatingDeclarations/${id}`, {
    data: { type: 'ageRatingDeclarations', id, attributes: none },
  });
  console.log('✓ age rating declared (no objectionable content → 4+)');
}

async function cmdContentRights() {
  // We do not use third-party content requiring rights documentation.
  await asc('PATCH', `/apps/${APP_ID}`, {
    data: { type: 'apps', id: APP_ID, attributes: { contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT' } },
  });
  console.log('✓ content rights: does not use third-party content');
}

async function cmdPricing() {
  // Free: create an appPriceSchedule with the base territory and the free
  // price tier. ASC v3 pricing uses appPriceSchedules + appPricePoints.
  const baseTerr = 'USA';
  // Find the free price point for the base territory.
  const pp = await asc('GET',
    `/apps/${APP_ID}/appPricePoints?filter[territory]=${baseTerr}&include=territory&limit=200`);
  // Free tier = price point with customerPrice "0.00"
  const free = (pp.data || []).find((p) => Number(p.attributes?.customerPrice) === 0);
  if (!free) throw new Error('could not find free ($0) price point for ' + baseTerr);
  await asc('POST', '/appPriceSchedules', {
    data: {
      type: 'appPriceSchedules',
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
        baseTerritory: { data: { type: 'territories', id: baseTerr } },
        manualPrices: { data: [{ type: 'appPrices', id: '${price1}' }] },
      },
    },
    included: [{
      type: 'appPrices', id: '${price1}',
      attributes: { startDate: null },
      relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } },
    }],
  });
  console.log('✓ pricing set to Free (base territory USA, applies to all)');
}

function countScreenshots(locId) {
  return asc('GET', `/appStoreVersionLocalizations/${locId}/appScreenshotSets?include=appScreenshots`)
    .then((r) => {
      const out = {};
      for (const s of (r.data || [])) {
        const n = (r.included || []).filter((i) => i.type === 'appScreenshots'
          && s.relationships?.appScreenshots?.data?.some((d) => d.id === i.id)).length;
        out[s.attributes.screenshotDisplayType] = n;
      }
      return out;
    }).catch(() => ({}));
}

// Upload one screenshot: reserve → PUT bytes to the upload operations → commit.
async function uploadScreenshot(setId, filePath) {
  const bytes = readFileSync(filePath);
  const fileName = basename(filePath);
  const reserve = await asc('POST', '/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileName, fileSize: bytes.length },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
    },
  });
  const shot = reserve.data;
  for (const op of shot.attributes.uploadOperations) {
    const headers = {};
    for (const h of (op.requestHeaders || [])) headers[h.name] = h.value;
    const slice = bytes.subarray(op.offset, op.offset + op.length);
    const put = await fetch(op.url, { method: op.method, headers, body: slice });
    if (!put.ok) throw new Error(`upload PUT ${put.status} for ${fileName}`);
  }
  const md5 = createHash('md5').update(bytes).digest('hex');
  await asc('PATCH', `/appScreenshots/${shot.id}`, {
    data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: md5 } },
  });
  return shot.id;
}

async function cmdScreenshots(dir, displayTypeArg) {
  if (!dir) throw new Error('usage: screenshots <dir> [displayType]');
  const v = await editableVersion();
  const loc = await versionLocalization(v.id);
  // 6.9" iPhone = APP_IPHONE_67 (Apple's enum still uses 67 for the 6.7/6.9
  // family); 12.9" iPad = APP_IPAD_PRO_3GEN_129. Required because the build
  // ships supportsTablet=true. Override via the second arg.
  const displayType = displayTypeArg || 'APP_IPHONE_67';
  // Find or create the screenshot set for this display type.
  const sets = await asc('GET', `/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
  let set = (sets.data || []).find((s) => s.attributes.screenshotDisplayType === displayType);
  if (!set) {
    const created = await asc('POST', '/appScreenshotSets', {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: displayType },
        relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } },
      },
    });
    set = created.data;
  }
  const files = readdirSync(dir).filter((f) => /\.png$/i.test(f) && !f.startsWith('_')).sort();
  console.log(`uploading ${files.length} screenshots to ${displayType}...`);
  for (const f of files) {
    const id = await uploadScreenshot(set.id, join(dir, f));
    console.log('  ✓', f, '->', id);
  }
}

async function cmdAttachBuild(buildId) {
  if (!buildId) throw new Error('usage: attach-build <buildId>');
  const v = await editableVersion();
  await asc('PATCH', `/appStoreVersions/${v.id}`, {
    data: { type: 'appStoreVersions', id: v.id, relationships: { build: { data: { type: 'builds', id: buildId } } } },
  });
  console.log('✓ build', buildId, 'attached to version', v.attributes.versionString);
}

async function cmdReviewDetail(first, last, email, phone) {
  if (!first || !email || !phone) throw new Error('usage: review-detail <first> <last> <email> <phone>');
  const v = await editableVersion();
  const existing = await asc('GET', `/appStoreVersions/${v.id}/appStoreReviewDetail`).catch(() => ({ data: null }));
  const attrs = {
    contactFirstName: first, contactLastName: last || '',
    contactEmail: email, contactPhone: phone,
    demoAccountRequired: false,
    notes: 'No login required. Location permission is used on-device for nearby places, prayer times, and Qibla; data is not collected. Push notifications are opt-in.',
  };
  if (existing.data?.id) {
    await asc('PATCH', `/appStoreReviewDetails/${existing.data.id}`, {
      data: { type: 'appStoreReviewDetails', id: existing.data.id, attributes: attrs },
    });
  } else {
    await asc('POST', '/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails', attributes: attrs,
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } },
      },
    });
  }
  console.log('✓ review contact set:', first, last, email, phone);
}

async function cmdSubmit() {
  const v = await editableVersion();
  // ASC v2 submission flow: create a reviewSubmission, add the version as an
  // item, then PATCH submitted=true.
  const sub = await asc('POST', '/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  });
  const subId = sub.data.id;
  await asc('POST', '/reviewSubmissionItems', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } },
      },
    },
  });
  await asc('PATCH', `/reviewSubmissions/${subId}`, {
    data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } },
  });
  console.log('✓ SUBMITTED for review. reviewSubmission id =', subId);
}

// --- dispatch ----------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
try {
  switch (cmd) {
    case 'state': await cmdState(); break;
    case 'metadata': await cmdMetadata(); break;
    case 'category': await cmdCategory(); break;
    case 'age-rating': await cmdAgeRating(); break;
    case 'content-rights': await cmdContentRights(); break;
    case 'pricing': await cmdPricing(); break;
    case 'screenshots': await cmdScreenshots(rest[0], rest[1]); break;
    case 'attach-build': await cmdAttachBuild(rest[0]); break;
    case 'review-detail': await cmdReviewDetail(rest[0], rest[1], rest[2], rest[3]); break;
    case 'submit': await cmdSubmit(); break;
    default:
      console.log('subcommands: state | metadata | category | age-rating | content-rights | pricing | screenshots <dir> | attach-build <buildId> | review-detail <first> <last> <email> <phone> | submit');
  }
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
