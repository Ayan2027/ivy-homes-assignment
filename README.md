# Ivy Homes Assignment — Ayan Dhal

## How to run

```bash
npm install
npm run dev
```

Log in with any of the three demo accounts (e.g. `demo1@ivy.homes`), password `ced1568d36`.

The app pulls the full Hyderabad dataset (~4400 listings, ~1650 rentals, ~470 projects)
client-side on first load of each section — this takes a few seconds, since the real
API caps `limit` at 50 regardless of what's requested (see findings).

## Tools used

Built with the help of Claude (Anthropic) throughout — for API investigation (writing
curl commands and interpreting responses), Node scripts to pull and analyze the dataset,
and scaffolding the React frontend (auth/token handling, data layer, and all six screens).
Every hypothesis was tested against the real API/data before being trusted; nothing here
was assumed from the documentation without verification.

## How I decided what to distrust, and what I did about it

The docs came with an explicit warning that they were AI-drafted from a stale changelog,
so I treated every claim as unverified until I'd personally reproduced it against the
running API. The process, roughly in order:

1. **Auth first.** Before writing any app code, I tried the documented `?api_key=` query
   param and it was rejected outright — the real API requires `X-API-Key` as a header.
   Login also returned a different shape than documented (`access_token`, not `token`),
   with a real expiry of 900 seconds (15 minutes), not the documented 86400. This
   directly shaped the app's architecture: I had to implement silent token refresh
   using an undocumented (but very real) `/auth/refresh` endpoint, since the assignment
   requires the app to survive 30 minutes logged in.

2. **Pulled the full dataset early** (per the assignment's own advice) using a throwaway
   Node script, so all ten questions could be answered from real, complete data rather
   than one API call at a time. This immediately surfaced that the real pagination
   envelope (`limit/offset/count/has_more`) doesn't match the documented one
   (`total/page/page_size`), that `limit` is silently clamped to 50 no matter what's
   requested, and that the `total` field itself undercounts the real number of walkable
   records on all three collection endpoints.

3. **Formed and tested specific hypotheses against the full dump** rather than eyeballing
   individual records — for example, testing eight independent "impossibility" rules
   against every listing to find Q4's corrupt records (this surfaced four exactly-10-record
   disjoint groups: negative price, carpet area exceeding super-built-up area, floor
   exceeding the building's own floor count, and non-plot listings with zero bedrooms).

4. **For Q9 (fake listings)**, the real signal wasn't listing content — it was contact
   number reuse under inconsistent names. Legitimate owners/builders in the dataset cap
   out around 6-8 listings under one name; the fraud pattern was phone numbers reused
   up to 32 times under a rotating cast of different names, always under `posted_by:
   "agent"`.

5. **For Q7 (costliest project)**, I found the documented `price_min`/`price_max` fields
   on `/v1/projects` have zero correlation with real listing prices in that project (74%
   of projects even have `price_max < price_min`) — so I derived the answer from actual
   listing prices instead of trusting the field.

6. **Built the frontend last**, once the real API shape was understood, rather than
   coding against the documentation and fixing it afterward.

## What I checked that turned out to be fine

- **A big cluster of listings with `bedroom: 0, bathroom: 0, floor: 0`** initially looked
  like corrupt or fake data. Checking the records directly showed 197 of 207 were
  `property_type: "plot"` — vacant land legitimately has none of these attributes. This
  was real, correct data, not a bug.
- **Listings disagreeing with their own project's `total_floors` field** (98% of linked
  listings didn't match) looked like a documentation violation at first. But the docs
  never actually claim these two fields must agree — so even though the mismatch is
  real, it isn't a documented promise being broken, and I didn't report it as a finding.
- **A magichomes-sourced listing with a suspiciously small `carpet_area`** (105 sqft for
  a 3BHK) suggested a per-website unit bug (square metres vs. square feet). A second
  magichomes listing with a completely normal-scale carpet area disproved this — it
  wasn't a systematic per-source issue, just an isolated record.
- **Duplicate detection for Q2** using exact coordinate matching (`lat, long, floor`)
  found zero duplicates at all, because coordinates carry small per-source jitter even
  for the same physical unit. Switching to a description-based key (apartment name +
  floor + carpet area) found the real, much smaller set of genuine duplicates.

## What I'd do with two more days

- Verify the Q10 methodology against a live `GET /v1/listings?project_id=...` call for a
  sample of projects, rather than only computing it from the local dump, to be certain
  the comparison basis (live-only vs. all listings) matches what the server itself would
  return for that exact documented query.
- Dig further into the phone-number fraud pattern — specifically whether the ~6-8 name
  variants under one number follow any naming pattern (e.g. reused first/last name pairs)
  that would make the fraud detection more precise, and whether there's a lower-volume
  tier of fraud (below the 5+ threshold I used) that a stricter/looser cutoff would catch.
- Add automated tests around the data layer (especially the pagination walk and the
  client-side filter logic), since correctness there is load-bearing for every screen.
- Improve the UI considerably — the current version is functionally complete but visually
  minimal, since time was spent on verifying data correctness first.
- Re-run the full data pull once more right before the deadline to make sure none of the
  ten answers drifted if the underlying dataset is not perfectly static.