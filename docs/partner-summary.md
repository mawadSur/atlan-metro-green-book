# Muslim Green Book — Partner Summary

## What we are building

Muslim Green Book is a free Atlanta-focused guide for Muslim World Cup visitors and local Muslims. The goal is to help people quickly find:

- halal restaurants
- nearby masjids
- prayer times
- Qibla direction
- family-friendly and Muslim-friendly places
- match-day resources around Mercedes-Benz Stadium

The positioning is not “another global halal directory.” The wedge is: a practical, local, World Cup-ready Muslim fan guide for Atlanta.

## Why this matters now

Atlanta will have World Cup traffic, including Muslim visitors who will need fast answers for food, prayer, and local planning. The highest-leverage window is before and during match weeks, when people are searching, scanning QR codes, and sharing practical resources.

The key metric is not only first opens/downloads. The important behavior is second opens: people coming back for prayer times, Qibla, halal food, or match-day planning.

## Current status

### Done / prepared

- Atlanta data exists in the app.
- World Cup growth execution plan was reviewed.
- Campaign tracker was created.
- Mosque flyer copy was created.
- Restaurant table-tent copy was created.
- Influencer DM copy was created.
- Reddit/community post draft was created.
- ATL Muslim creator / media target list was created.
- Restaurant and masjid verification tracker was created.
- App Store Optimization research was drafted.
- QR assets and first-pass flyer/table-tent SVG assets were generated.
- Smart QR route was implemented locally at `/go`.
- Tests passed for the new route.

### Important links / files

Execution tracker:
`docs/worldcup-growth-execution.md`

Copy kit:
`docs/worldcup-blitz-kit.md`

Campaign tracker:
`docs/worldcup-growth-tracker.csv`

Outreach targets:
`docs/worldcup-outreach-targets.csv`

Restaurant / masjid verification tracker:
`docs/worldcup-restaurant-verification.csv`

ASO research:
`docs/worldcup-aso-research.md`

Marketing assets:
`assets/marketing/`

## Shareable app / QR links

Universal QR route format:

`https://atlan-green-book.vercel.app/go?utm_source=CHANNEL&utm_medium=qr&utm_campaign=worldcup26`

Examples:

Mosque board:
`https://atlan-green-book.vercel.app/go?utm_source=mosque_alfarooq&utm_medium=qr&utm_campaign=worldcup26`

Restaurant table tent:
`https://atlan-green-book.vercel.app/go?utm_source=tabletent_general&utm_medium=qr&utm_campaign=worldcup26`

Influencer/social:
`https://atlan-green-book.vercel.app/go?utm_source=influencer_dm&utm_medium=social&utm_campaign=worldcup26`

Community post:
`https://atlan-green-book.vercel.app/go?utm_source=reddit_worldcup&utm_medium=community&utm_campaign=worldcup26`

Note: `/go` is implemented locally and needs to be deployed before relying on it publicly.

## What is blocked

### 1. App Store / Play Store links

The smart QR route can send iOS users to App Store and Android users to Play Store, but the actual store links are not configured yet.

Current blocker:
- App Store URL missing
- Play Store URL missing

Once available, they go in:
`web/src/lib/storeLinks.ts`

### 2. Push notifications

Prayer-time and match-day push notifications are blocked until we have:

- APNs / Apple push credentials
- Firebase / FCM credentials

These should be saved locally and not pasted into chat.

### 3. Live multi-city data

Dallas, Houston, and Miami can be prepared, but production writes need:

- final city approval
- verified source data
- Supabase production access
- safe import + validation

### 4. Real-world verification

Restaurant/masjid hours, halal status, prayer space, and match-day claims need actual verification before public promotion.

## Tasks your partner can do

### High priority — distribution

1. Secure one mosque partner

Ask one high-traffic masjid, ideally Al-Farooq or another central mosque, for:

- one Jummah announcement
- permission to place a QR flyer
- permission to leave a small QR board/table sign

Suggested ask:

“Assalamu alaikum — we’re sharing a free Atlanta Muslim fan guide for World Cup visitors. It helps people find halal food, masjids, prayer times, and Qibla. Could we make a short Jummah announcement and place a QR flyer so visitors can find resources easily?”

2. Get permission from 5-10 halal restaurants

Ask owners/managers if we can leave a small QR table tent.

Suggested ask:

“Assalamu alaikum / hi — this is a free guide for Muslim World Cup visitors looking for halal food and prayer resources in Atlanta. Could we leave a small QR table tent here during match week? It points people to nearby halal restaurants, masjids, prayer times, and Qibla.”

Start with restaurants that are already friendly or where someone has a relationship.

3. Verify restaurant and masjid data

Use:
`docs/worldcup-restaurant-verification.csv`

For each place, confirm:

- current hours
- halal status
- whether they have prayer space
- whether they are open during match days
- whether they allow QR flyer/table-tent placement

4. Reach out to local creators

Use:
`docs/worldcup-outreach-targets.csv`

Good first targets:

- @halalatlanta
- @eathalalatlanta
- @atlhalalbites
- @atlhalal
- @halalfoodeatz
- The Halal Guys Midtown Atlanta

Suggested DM:

“Assalamu alaikum — quick useful resource for your audience: Muslim Green Book is a free Atlanta guide for Muslim World Cup fans, with halal food, nearby masjids, prayer times, Qibla, and match-day spots. Would you be open to sharing one story/reel before the Atlanta match window?”

5. Post in relevant communities

Possible communities:

- World Cup fan communities
- Atlanta local communities
- Morocco / Senegal / Algeria fan communities
- Muslim travel communities

Do not spam. Frame it as a free utility and ask for corrections/additions.

### Medium priority — product/content

6. Validate Mercedes-Benz Stadium claims

Before publishing any stadium-specific details, verify:

- prayer room availability
- wudu access
- halal food vendors/sections
- family-friendly zones
- match-day access rules

7. Review app copy and screenshots

Partner can review:

- App Store subtitle
- screenshot captions
- landing page description
- flyer/table-tent wording

8. Help choose print budget

Recommended tiers:

- $100: basic mosque flyers + 10 table tents
- $200: color flyers + 25 table tents + one micro-creator story
- $300: color flyers + 50 table tents + two micro-creators or one paid reel

### Technical/admin tasks if partner has access

9. Provide App Store / Play Store URLs when live

Needed for smart routing.

10. Provide push credentials via secure local file transfer

Needed for prayer-time reminders and retention.

11. Help confirm production database access

Needed before multi-city import.

## Suggested 7-day plan

### Day 1
- Confirm App Store / Play Store status.
- Pick print budget.
- Pick first mosque target.
- Pick first 10 restaurants.

### Day 2
- Print first flyer/table-tent batch.
- Ask mosque for Jummah announcement.
- Contact first 5 restaurants.

### Day 3
- Contact next 5 restaurants.
- Verify top 20 restaurant/masjid records.
- Send first creator DMs.

### Day 4
- Post in 1-2 communities.
- Update data corrections.
- Prepare screenshots / short demo video.

### Day 5
- Place flyers/table tents.
- Follow up with creators.
- Check QR scan/source metrics.

### Day 6
- Double down on the best-performing source.
- Fix incorrect listings.
- Add any missing high-value places.

### Day 7
- Review results.
- Decide whether to expand spend, cities, or creator outreach.

## Decision needed from partner

Please answer these:

1. Which mosque can you help us get into first?
2. Which 5-10 halal restaurant owners do you know personally?
3. Are we comfortable sending DMs from a founder/personal account?
4. What print budget should we start with: $100, $200, or $300?
5. Do we have App Store / Play Store links yet?
6. Who can verify stadium/prayer/halal details near Mercedes-Benz Stadium?

## Best next action

The fastest path is not more code. The fastest path is:

1. deploy `/go`
2. print QR flyer/table tent
3. secure one mosque
4. place QR at 5-10 halal restaurants
5. send 10 personalized creator/community messages
6. verify and update the highest-traffic listings
