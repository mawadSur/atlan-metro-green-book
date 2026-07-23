# Muslim Green Book — World Cup Growth Execution Review

Source reviewed: Claude artifact `287cc443-f94a-4c5d-9a9c-4b39ac451a6c`, copied locally for execution.

## My review of the plan

### Strong parts
- Correct wedge: do not compete with Zabihah/Muslim Pro on global coverage; win on World Cup city-specific usefulness.
- Correct urgency: July match window means distribution work matters more than polished roadmap work.
- Correct retention thesis: second opens matter more than first downloads; prayer-time push is the retention lever.
- Correct channel mix: mosque trust + halal restaurant table-tents + Muslim travel accounts + fan community utility posts.

### Main risks
- Push notifications still require a real device/build verification loop, but local Firebase/Apple credential files exist and the EAS production environment already has a `GOOGLE_SERVICES_JSON` secret configured.
- Multi-city writes were approved for every FIFA World Cup 2026 host city and loaded into the linked Supabase project. OSM coverage varies sharply by city; Monterrey returned no tagged halal/masjid rows and needs manual curation.
- Restaurant verification says “call 82 spots”; I prepared the call tracker/script, but I cannot truthfully mark calls complete without actually calling.
- Community posting and DMs can become spam if done from cold/bot accounts. I prepared channel-specific drafts; owner review is still recommended before sending.
- The App Store listing is live and configured in `web/src/lib/storeLinks.ts`; Android still falls back to web until the Play Store listing is published.

## Founder-only items — status

| ID | Task | Status | What I did | What still needs you |
|---|---|---|---|---|
| Y1 | Pull APNs + Firebase credentials | PARTIAL | Confirmed local credential files exist and EAS production has `GOOGLE_SERVICES_JSON` configured. | Still need Apple/EAS credential validation and a real physical-device push test. Do not paste secrets into chat. |
| Y2 | Approve multi-city data load | DONE | Loaded all 16 FIFA World Cup 2026 host cities into the linked Supabase project. | Manual curation still recommended for sparse Mexico host-city data. |
| Y3 | Secure one mosque | PREPARED | Created Jummah ask/script and Al-Farooq-focused outreach text. | You/relationship owner must ask Al-Farooq for mention + QR board. |
| Y4 | Greenlight restaurant owners you know | PREPARED | Created table-tent pitch and restaurant tracker. | Tell me which owners you know / authorize outreach to. |
| Y5 | Set budget | PREPARED | Created budget tiers. | Pick $100 / $200 / $300 and authorize spend/printing. |

## Hermes-assigned items — status

| ID | Task | Status | Output |
|---|---|---|---|
| H1 | Print/place flyers + table-tents | PREPARED | `docs/worldcup-blitz-kit.md`, verification CSV. Physical placement still needs human/print budget. |
| H2 | DM halal-travel accounts | APPROVED / READY | Templates and target list in `docs/worldcup-outreach-targets.csv`. Sending still needs access to the founder's social/email account sessions. |
| H3 | Fan community posts | APPROVED / READY | Drafts in `docs/worldcup-blitz-kit.md`. Posting still needs access to the founder's Reddit/social account sessions. |
| H4 | Verify restaurant data | PREPARED | `docs/worldcup-restaurant-verification.csv` with call script fields. Calls not completed. |
| H5 | Build tracker | DONE | `docs/worldcup-growth-tracker.csv`. |
| H6 | Per-channel short links | PARTIAL | UTM/source links are in tracker and smart `/go` route added. True short domains require Bitly/Rebrandly/domain config. |
| H7 | Source ATL Muslim micro-creators | DONE FIRST PASS | `docs/worldcup-outreach-targets.csv`. |
| H8 | ASO research | DONE FIRST PASS | `docs/worldcup-aso-research.md`. |

## Claude/build items — status

| ID | Task | Status | Notes |
|---|---|---|---|
| C2 | Multi-city data load | DONE | Generated local seed files for all 16 FIFA World Cup 2026 host cities and upserted them into the linked Supabase project. |
| C3 | Prayer-time push | PARTIAL | Local Firebase/Apple credential files exist and EAS production has Android `GOOGLE_SERVICES_JSON`; still needs Apple credential validation and physical-device test. |
| C4 | Smart-route QR | IMPLEMENTED LOCALLY | Added `/go` route + route helper. iOS now routes to the live App Store listing; Android routes to Play Store only after configured, otherwise web app. |
| C5 | Near-stadium accuracy pass | PREPARED | Mercedes-Benz Stadium is in curated data; call/verification tracker created. Needs factual verification before publishing claims like prayer-room gates/halal sections. |
| C6 | Keep plan + tracker current | STARTED | This doc + tracker are the working source of truth. |

## Files created/changed
- `docs/worldcup-growth-execution.md` — this review and execution status.
- `docs/worldcup-blitz-kit.md` — flyer/table-tent/Jummah/DM/Reddit copy.
- `docs/worldcup-growth-tracker.csv` — campaign tracker with UTM/source links.
- `docs/worldcup-outreach-targets.csv` — first-pass account/community/creator list.
- `docs/worldcup-restaurant-verification.csv` — restaurant/masjid call tracker.
- `docs/worldcup-aso-research.md` — competitor and keyword review.
- `assets/marketing/qr-universal.svg`, `qr-mosque-alfarooq.svg`, `qr-tabletent-general.svg` — generated QR codes.
- `assets/marketing/flyer-mosque-universal.svg`, `table-tent-general.svg` — print-ready first-pass SVG creative.
- `web/src/lib/storeLinks.ts` — live iOS App Store URL configured; Play Store remains blank until published.
- `web/src/lib/smartRoute.ts` — smart routing helper.
- `web/src/app/go/route.ts` — universal QR route.
- `tests/smartRoute.test.mjs` — unit tests for smart routing helper.
