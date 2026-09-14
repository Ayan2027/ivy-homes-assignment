// pull-data.mjs
// Run with: node pull-data.mjs
// Requires Node 18+ (built-in fetch). Saves raw dumps to ./data/*.json
//
// This is a throwaway analysis script — NOT part of your frontend app.
// It logs in once, refreshes the token as needed, and pages through every
// collection endpoint fully, saving the raw results for offline analysis.

import { writeFileSync, mkdirSync } from "fs";

const BASE_URL = "https://solve.ivy.homes";
const API_KEY = "IVY26-98A6CA1CB0CA";
const EMAIL = "demo1@ivy.homes";
const PASSWORD = "ced1568d36";
const PAGE_LIMIT = 200; // per docs' stated max — script will warn if server clamps it

let accessToken = null;
let refreshToken = null;
let accessExpiresAt = 0; // unix ms

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  accessExpiresAt = Date.now() + data.expires_in * 1000;
  console.log(`Logged in. Access token valid for ${data.expires_in}s.`);
}

async function refresh() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  accessToken = data.access_token;
  refreshToken = data.refresh_token; // rotated — must save the new one
  accessExpiresAt = Date.now() + data.expires_in * 1000;
  console.log("Token refreshed.");
}

async function ensureFreshToken() {
  // Refresh proactively if less than 60s of validity remain
  if (Date.now() > accessExpiresAt - 60_000) {
    await refresh();
  }
}

async function authedGet(path) {
  await ensureFreshToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-API-Key": API_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function pullAll(endpoint, label) {
  let offset = 0;
  let all = [];
  let total = null;

  while (true) {
    const data = await authedGet(`${endpoint}?limit=${PAGE_LIMIT}&offset=${offset}`);
    if (total === null) {
      total = data.total;
      console.log(`${label}: server reports total = ${total}`);
      if (data.count < PAGE_LIMIT && data.has_more) {
        console.log(`  NOTE: server returned count=${data.count} though we asked for limit=${PAGE_LIMIT} and has_more=true — server may be clamping limit lower than docs claim.`);
      }
    }
    all = all.concat(data.results);
    console.log(`  fetched ${all.length}/${total} (offset=${offset}, has_more=${data.has_more})`);

    if (!data.has_more || data.results.length === 0) break;
    offset += data.results.length; // advance by what we actually got, not by PAGE_LIMIT
  }

  if (all.length !== total) {
    console.log(`  ⚠️  MISMATCH: walked ${all.length} records but server's 'total' said ${total}. This itself may be a finding — investigate before trusting either number.`);
  }
  return all;
}

async function main() {
  mkdirSync("./data", { recursive: true });

  await login();

  const listings = await pullAll("/v1/listings", "listings");
  writeFileSync("./data/listings.json", JSON.stringify(listings, null, 2));

  const rentals = await pullAll("/v1/rentals", "rentals");
  writeFileSync("./data/rentals.json", JSON.stringify(rentals, null, 2));

  const projects = await pullAll("/v1/projects", "projects");
  writeFileSync("./data/projects.json", JSON.stringify(projects, null, 2));

  const analytics = await authedGet("/v1/analytics/summary");
  writeFileSync("./data/analytics.json", JSON.stringify(analytics, null, 2));

  console.log("\nDone. Files written to ./data/");
  console.log(`  listings.json: ${listings.length} records`);
  console.log(`  rentals.json:  ${rentals.length} records`);
  console.log(`  projects.json: ${projects.length} records`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
