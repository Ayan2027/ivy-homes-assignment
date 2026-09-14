// analyze-step7.mjs
// Run with: node analyze-step7.mjs
// Reads the already-saved JSON dumps and checks:
//  1. Are there duplicate listing_id / project_id values (pagination drift)?
//  2. What's the is_live true/false split on listings?
//  3. Basic sanity numbers to compare against the server's 'total' fields.

import { readFileSync } from "fs";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function checkDuplicates(records, idField, label) {
  const seen = new Map();
  for (const r of records) {
    const id = r[idField];
    seen.set(id, (seen.get(id) || 0) + 1);
  }
  const uniqueCount = seen.size;
  const dupIds = [...seen.entries()].filter(([, count]) => count > 1);

  console.log(`\n=== ${label} ===`);
  console.log(`  total records in file: ${records.length}`);
  console.log(`  unique ${idField} values: ${uniqueCount}`);
  console.log(`  duplicate ${idField} values: ${dupIds.length}`);
  if (dupIds.length > 0) {
    console.log(`  first 10 duplicated IDs (id -> count):`);
    dupIds.slice(0, 10).forEach(([id, count]) => console.log(`    ${id} -> ${count}`));
  }
  return { uniqueCount, dupCount: dupIds.length };
}

const listings = loadJson("./data/listings.json");
const rentals = loadJson("./data/rentals.json");
const projects = loadJson("./data/projects.json");

checkDuplicates(listings, "listing_id", "LISTINGS");
checkDuplicates(rentals, "listing_id", "RENTALS");
checkDuplicates(projects, "project_id", "PROJECTS");

// is_live split on listings
const liveTrue = listings.filter((l) => l.is_live === true).length;
const liveFalse = listings.filter((l) => l.is_live === false).length;
const liveMissing = listings.length - liveTrue - liveFalse;
console.log(`\n=== is_live split (listings) ===`);
console.log(`  is_live: true  -> ${liveTrue}`);
console.log(`  is_live: false -> ${liveFalse}`);
console.log(`  missing/other  -> ${liveMissing}`);

// is_verified split, just for extra visibility
const verifiedTrue = listings.filter((l) => l.is_verified === true).length;
console.log(`\n=== is_verified split (listings), for reference ===`);
console.log(`  is_verified: true -> ${verifiedTrue} / ${listings.length}`);

// project_id linkage sanity: how many listings point to a project_id
// that doesn't exist in our projects dump?
const projectIds = new Set(projects.map((p) => p.project_id));
const orphanListings = listings.filter(
  (l) => l.project_id !== null && l.project_id !== undefined && !projectIds.has(l.project_id)
);
console.log(`\n=== project_id linkage check ===`);
console.log(`  listings with a project_id not found in projects.json: ${orphanListings.length}`);
if (orphanListings.length > 0) {
  console.log(`  first 5 examples:`, orphanListings.slice(0, 5).map((l) => ({ listing_id: l.listing_id, project_id: l.project_id })));
}
