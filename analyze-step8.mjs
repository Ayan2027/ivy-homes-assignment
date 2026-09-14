// analyze-step8.mjs
// Run with: node analyze-step8.mjs

import { readFileSync } from "fs";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const listings = loadJson("./data/listings.json");
const rentals = loadJson("./data/rentals.json");
const projects = loadJson("./data/projects.json");

// --- 1. Project price scale sanity check ---
// We saw one project with price_min=76.7, price_max=2.68 (max < min!).
// Check how common/weird this is across all projects.
const priceMins = projects.map((p) => p.price_min).filter((v) => v != null);
const priceMaxs = projects.map((p) => p.price_max).filter((v) => v != null);
const inverted = projects.filter((p) => p.price_max < p.price_min);

function stats(arr, label) {
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = arr.reduce((a, b) => a + b, 0);
  console.log(`  ${label}: min=${sorted[0]}, max=${sorted[sorted.length - 1]}, mean=${(sum / arr.length).toFixed(2)}, median=${sorted[Math.floor(sorted.length / 2)]}`);
}

console.log("=== PROJECT PRICE SCALE CHECK ===");
stats(priceMins, "price_min");
stats(priceMaxs, "price_max");
console.log(`  projects where price_max < price_min: ${inverted.length} / ${projects.length}`);
console.log(`  sample of 5 inverted projects:`, inverted.slice(0, 5).map(p => ({ project_id: p.project_id, price_min: p.price_min, price_max: p.price_max })));

// Compare to listing price scale for reference
const listingPrices = listings.map((l) => l.price).filter((v) => v != null);
console.log("\n=== LISTING PRICE SCALE (for comparison) ===");
stats(listingPrices, "price");

// --- 2. Q10 candidate: project.total_listings vs actual counted listings ---
console.log("\n=== Q10 CANDIDATE: total_listings mismatch check ===");
const countAllByProject = {};
const countLiveByProject = {};
for (const l of listings) {
  if (l.project_id) {
    countAllByProject[l.project_id] = (countAllByProject[l.project_id] || 0) + 1;
    if (l.is_live) countLiveByProject[l.project_id] = (countLiveByProject[l.project_id] || 0) + 1;
  }
}
let mismatchVsAll = 0;
let mismatchVsLive = 0;
const mismatchExamples = [];
for (const p of projects) {
  const actualAll = countAllByProject[p.project_id] || 0;
  const actualLive = countLiveByProject[p.project_id] || 0;
  const docSays = p.total_listings;
  if (docSays !== actualAll) mismatchVsAll++;
  if (docSays !== actualLive) mismatchVsLive++;
  if (docSays !== actualAll && mismatchExamples.length < 10) {
    mismatchExamples.push({ project_id: p.project_id, total_listings_field: docSays, actual_all: actualAll, actual_live: actualLive });
  }
}
console.log(`  projects total: ${projects.length}`);
console.log(`  mismatches vs count of ALL listings (live+inactive) with that project_id: ${mismatchVsAll}`);
console.log(`  mismatches vs count of LIVE-ONLY listings with that project_id: ${mismatchVsLive}`);
console.log(`  sample mismatches (vs ALL):`, mismatchExamples);

// --- 3. Q5 candidate: total monthly rent in Jubilee Hills ---
console.log("\n=== Q5 CANDIDATE: rentals in Jubilee Hills ===");
// print unique locality strings so we can check casing/spelling before trusting a filter
const uniqueLocalities = [...new Set(rentals.map((r) => r.locality))].sort();
console.log(`  unique locality values in rentals.json (${uniqueLocalities.length} total):`, uniqueLocalities.slice(0, 30));

const jubileeVariants = rentals.filter((r) => (r.locality || "").toLowerCase().trim() === "jubilee hills");
const sumRent = jubileeVariants.reduce((sum, r) => sum + (r.price || 0), 0);
console.log(`  rentals matching locality "jubilee hills" (case-insensitive): ${jubileeVariants.length}`);
console.log(`  sum of price field: ${sumRent}`);

// --- 4. Listing vs project total_floors mismatch, just to characterize the pattern we saw once ---
console.log("\n=== total_floors cross-check (listing vs its project) ===");
const projectById = Object.fromEntries(projects.map((p) => [p.project_id, p]));
let floorMismatch = 0;
let checked = 0;
for (const l of listings) {
  if (l.project_id && projectById[l.project_id]) {
    checked++;
    if (l.total_floors !== projectById[l.project_id].total_floors) floorMismatch++;
  }
}
console.log(`  listings checked (had a resolvable project): ${checked}`);
console.log(`  listings whose total_floors disagrees with their project's total_floors: ${floorMismatch}`);
