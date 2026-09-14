# Ivy Homes — Property Records

**Ayan Dhal** · Software Engineering Internship Assignment, September 2026
**Live app:** https://ivy-homes-assignment-two-self.vercel.app/
**City:** Hyderabad

A frontend built against a real property API whose documentation is deliberately
wrong in places — plus the forensic work of figuring out exactly where, and a
dataset audit that surfaces corrupt and fraudulent listings the API never flags on
its own.

---

## Contents

- [What this is](#what-this-is)
- [Live demo & login](#live-demo--login)
- [Tech stack](#tech-stack)
- [Running it locally](#running-it-locally)
- [Project structure](#project-structure)
- [How I decided what to distrust](#how-i-decided-what-to-distrust-and-what-i-did-about-it)
- [What I checked that turned out to be fine](#what-i-checked-that-turned-out-to-be-fine)
- [Findings summary](#findings-summary)
- [The ten answers](#the-ten-answers)
- [Tools used](#tools-used)
- [What I'd do with two more days](#what-id-do-with-two-more-days)

---

## What this is

Ivy Homes runs a real property API. Its documentation was drafted by an AI from a
stale changelog and shipped unreviewed — some endpoints don't exist, some exist at
a different path, some fields aren't in the units the docs claim, and some data in
the API itself is corrupt or fraudulent in ways nothing in a single response
announces. The assignment: build a working frontend on top of the *real* API
anyway, and hand back an evidence-backed list of everywhere the documentation is
wrong.

The API itself is honest — every response tells the truth about what the server
just did. The work here was entirely about not trusting a written description of
it, verifying every claim against live behaviour, and then forming and testing
hypotheses about problems that only show up once you look at the full dataset
rather than one record at a time.

## Live demo & login

**https://ivy-homes-assignment-two-self.vercel.app/**

| Field | Value |
|---|---|
| Email | `demo1@ivy.homes` (also `demo2@`, `demo3@`) |
| Password | `ced1568d36` |

## Tech stack

- **React 19 + Vite** — frontend framework and build tool
- **React Router 7** — client-side routing, including a protected-route wrapper
- **lucide-react** — icon set used throughout the UI
- Plain **Node scripts** (no framework) for pulling and analyzing the dataset —
  kept separate from the app so the forensic work is auditable on its own
- No backend of my own: the app talks directly to `https://solve.ivy.homes`,
  with a thin data layer handling auth, token refresh, full-dataset pagination,
  and an in-browser cache so each section only pays the pagination cost once
  per session

## Running it locally

```bash
npm install
npm run dev
```

Log in with any of the three demo accounts above. On first visit to a section,
the app pulls the full Hyderabad dataset (~4,400 listings, ~1,650 rentals, ~470
projects) client-side — this takes a few seconds, since the real API caps
`limit` at 50 regardless of what's requested (see [Findings](#findings-summary)).

## Project structure

```
src/
  api/            auth, config, and the full-dataset fetch/cache layer
  context/        AuthContext — login state, silent token refresh
  components/     NavBar, ProtectedRoute
  pages/          the six required screens
pull-data.mjs     one-off script: pages every collection endpoint to completion,
                  saves raw JSON to data/
analyze-step*.mjs sequential scripts, one per investigation step — dedup logic,
                  corrupt-record rules, fraud detection, project count checks
data/             the raw pulled dataset (listings, rentals, projects)
submission.json   the graded deliverable — API key, answers, findings
```

The `analyze-step*.mjs` scripts are left numbered and separate rather than
squashed into one file on purpose — they're the actual record of how each
answer was derived, in the order I derived it.

## How I decided what to distrust, and what I did about it

The docs came with an explicit warning that they were AI-drafted from a stale
changelog, so I treated every claim as unverified until I'd personally
reproduced it against the running API. Roughly in order:

1. **Auth first.** Before writing any app code, I tried the documented
   `?api_key=` query param — rejected outright; the real API requires
   `X-API-Key` as a header. Login also returned a different shape than
   documented (`access_token`, not `token`), with a real expiry of 900 seconds
   (15 minutes), not the documented 86,400. This directly shaped the app's
   architecture: silent token refresh against an undocumented (but very real)
   `/auth/refresh` endpoint, since the assignment requires the app to survive
   30 minutes logged in.

2. **Pulled the full dataset early**, using a throwaway Node script, so all ten
   questions could be answered from complete real data rather than one API call
   at a time. This immediately surfaced that the real pagination envelope
   (`limit/offset/count/has_more`) doesn't match the documented one
   (`total/page/page_size`), that `limit` is silently clamped to 50 no matter
   what's requested, and that the `total` field itself undercounts the real
   number of walkable records on all three collection endpoints.

3. **Formed and tested specific hypotheses against the full dump**, rather than
   eyeballing individual records — e.g. testing several independent
   "impossibility" rules against every listing for Q4, which surfaced four
   exactly-10-record disjoint groups: negative price, carpet area exceeding
   super-built-up area, floor exceeding the building's own floor count, and
   non-plot listings with zero bedrooms.

4. **For Q9 (fake listings)**, the real signal wasn't listing content — it was
   contact-number reuse under inconsistent names. Legitimate owners/builders in
   the dataset cap out around 6–8 listings under one consistent name; the fraud
   pattern was phone numbers reused up to 32 times under a rotating cast of
   different names, always under `posted_by: "agent"`.

5. **For Q7 (costliest project)**, I found the documented `price_min`/`price_max`
   fields on `/v1/projects` have no correlation with real listing prices in
   that project (74% of projects even have `price_max < price_min`) — so I
   derived the answer from actual listing prices instead of trusting the field.

6. **Built the frontend last**, once the real API shape was understood, rather
   than coding against the documentation and fixing it afterward.

## What I checked that turned out to be fine

- **A cluster of listings with `bedroom: 0, bathroom: 0, floor: 0`** initially
  looked corrupt. Checking directly showed 197 of 207 were
  `property_type: "plot"` — vacant land legitimately has none of these
  attributes. Real, correct data, not a bug.
- **Listings disagreeing with their own project's `total_floors`** (98% of
  linked listings didn't match) looked like a violation at first — but the docs
  never actually claim these two fields must agree, so even though the
  mismatch is real, it isn't a documented promise being broken, and I didn't
  report it as a finding.
- **A single listing with a suspiciously small `carpet_area`** (105 sqft for a
  3BHK) suggested a per-source unit bug (sqm vs. sqft). A second listing from
  the same source with a completely normal-scale area disproved this — an
  isolated bad record, not a systematic issue.
- **Duplicate detection for Q2** using exact coordinate matching
  (`lat, long, floor`) found zero duplicates, because coordinates carry small
  per-source jitter even for the same physical unit. Switching to a
  description-based key (apartment name + floor + carpet area) found the real,
  much smaller set of genuine duplicates.

## Findings summary

15 documented discrepancies, all reproduced against the live API and recorded
with evidence in `submission.json`:

| Category | Count | Examples |
|---|---|---|
| `auth` | 3 | API key must go in a header, not a query param · login response shape and token lifetime both wrong |
| `pagination` | 3 | offset-based envelope, not page-based · `limit` silently clamped to 50 · `total` undercounts the real walkable record count |
| `missing_endpoint` | 2 | `/v1/analytics/summary` and `/v1/favourites` are both documented but 404 |
| `undocumented_endpoint` | 1 | `/auth/refresh` exists and is required — the docs claim no refresh flow |
| `data_quality` | 2 | 40 physically impossible listings · project `price_min`/`price_max` are unusable |
| `consistency` | 1 | 27% of projects report a listing count that disagrees with reality |
| `completeness` | 1 | 21% of "active" listings are actually `is_live: false` |
| `timestamps` | 1 | `posted_at` is bare IST, not UTC/`Z` as documented |
| `fraud` | 1 | 261 listings share a contact number reused under different names |

## The ten answers

All computed from the fully paginated dataset (not sampled), against the fixed
reference moment `2026-09-10T00:00:00+05:30`. Full values, methodology, and
evidence IDs are in `submission.json`; the corrupt/fake listing IDs and the
audit counts are also visible live on the app's **Insights** screen, computed
client-side from the same dataset so they can't drift from what the app itself
shows a user.

## Tools used

Built with the help of Claude (Anthropic) throughout — for API investigation
(curl commands, interpreting responses), Node scripts to pull and analyze the
dataset, and the React frontend (auth/token handling, data layer, all six
screens, and the visual design). Every hypothesis was tested against the real
API/data before being trusted; nothing here was assumed from the documentation
without verification.

## What I'd do with two more days

- Verify the Q10 methodology against a live `GET /v1/listings?project_id=...`
  call for a sample of projects, rather than only computing it from the local
  dump, to be certain the comparison basis (live-only vs. all listings) matches
  what the server itself returns for that exact documented query.
- Dig further into the phone-number fraud pattern — whether the name variants
  under one number follow a pattern (e.g. reused first/last name pairs) that
  would make detection more precise, and whether a lower-volume tier of fraud
  exists below the threshold I used.
- Add automated tests around the data layer (especially the pagination walk
  and client-side filtering), since correctness there is load-bearing for
  every screen.
- Re-run the full data pull once more right before any re-evaluation, in case
  the underlying dataset isn't perfectly static.