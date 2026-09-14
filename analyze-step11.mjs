// analyze-step11.mjs
// Run with: node analyze-step11.mjs

import { readFileSync } from "fs";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const listings = loadJson("./data/listings.json");

// --- Re-derive all four corrupt candidate groups precisely ---
const negPrice = new Set(listings.filter((l) => l.price < 0).map((l) => l.listing_id));
const carpetBigger = new Set(listings.filter((l) => l.carpet_area > l.super_built_up_area).map((l) => l.listing_id));
const floorGtTotal = new Set(listings.filter((l) => l.floor > l.total_floors).map((l) => l.listing_id));
const nonPlotZeroBedroom = new Set(
  listings.filter((l) => l.property_type !== "plot" && l.bedroom <= 0).map((l) => l.listing_id)
);

console.log("=== Q4 CANDIDATE GROUPS ===");
console.log(`  negative price: ${negPrice.size}`);
console.log(`  carpet_area > super_built_up_area: ${carpetBigger.size}`);
console.log(`  floor > total_floors: ${floorGtTotal.size}`);
console.log(`  non-plot with bedroom <= 0: ${nonPlotZeroBedroom.size}`);
console.log(`  IDs (non-plot zero bedroom):`, [...nonPlotZeroBedroom]);

const allFour = new Set([...negPrice, ...carpetBigger, ...floorGtTotal, ...nonPlotZeroBedroom]);
console.log(`\n  UNION of all four groups (unique listing_ids): ${allFour.size}`);
console.log(`  (if this equals 40, all four groups are fully disjoint)`);
console.log(`\n  Sorted final Q4 candidate list:`);
console.log(JSON.stringify([...allFour].sort(), null, 2));

// --- Q9: characterize repeated phone numbers properly ---
console.log("\n\n=== Q9 INVESTIGATION: repeated contact numbers ===");
const byContact = {};
for (const l of listings) {
  if (!byContact[l.posted_by_contact]) byContact[l.posted_by_contact] = [];
  byContact[l.posted_by_contact].push(l);
}

// For numbers appearing >= 5 times, check: how many DISTINCT names use this number,
// and what posted_by types are involved
const heavyRepeaters = Object.entries(byContact)
  .filter(([, arr]) => arr.length >= 5)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`  phone numbers appearing 5+ times: ${heavyRepeaters.length}`);
console.log(`\n  Detail on top 15 heaviest repeaters:`);
for (const [contact, arr] of heavyRepeaters.slice(0, 15)) {
  const distinctNames = new Set(arr.map((l) => l.posted_by_name));
  const postedByTypes = {};
  for (const l of arr) postedByTypes[l.posted_by] = (postedByTypes[l.posted_by] || 0) + 1;
  const localities = new Set(arr.map((l) => l.locality));
  console.log(
    `    ${contact}: ${arr.length} listings | distinct names used: ${distinctNames.size} | posted_by breakdown: ${JSON.stringify(postedByTypes)} | distinct localities: ${localities.size}`
  );
  if (distinctNames.size > 1) {
    console.log(`      >>> MULTIPLE NAMES ON ONE NUMBER:`, [...distinctNames]);
  }
}

// Baseline: for posted_by === "owner" specifically, what's the normal max listings-per-number?
const ownerListings = listings.filter((l) => l.posted_by === "owner");
const ownerByContact = {};
for (const l of ownerListings) ownerByContact[l.posted_by_contact] = (ownerByContact[l.posted_by_contact] || 0) + 1;
const ownerCounts = Object.values(ownerByContact).sort((a, b) => b - a);
console.log(`\n  Among listings with posted_by="owner" (${ownerListings.length} total):`);
console.log(`    top 10 listings-per-number counts:`, ownerCounts.slice(0, 10));

const agentListings = listings.filter((l) => l.posted_by === "agent");
const agentByContact = {};
for (const l of agentListings) agentByContact[l.posted_by_contact] = (agentByContact[l.posted_by_contact] || 0) + 1;
const agentCounts = Object.values(agentByContact).sort((a, b) => b - a);
console.log(`\n  Among listings with posted_by="agent" (${agentListings.length} total):`);
console.log(`    top 10 listings-per-number counts:`, agentCounts.slice(0, 10));

const builderListings = listings.filter((l) => l.posted_by === "builder");
const builderByContact = {};
for (const l of builderListings) builderByContact[l.posted_by_contact] = (builderByContact[l.posted_by_contact] || 0) + 1;
const builderCounts = Object.values(builderByContact).sort((a, b) => b - a);
console.log(`\n  Among listings with posted_by="builder" (${builderListings.length} total):`);
console.log(`    top 10 listings-per-number counts:`, builderCounts.slice(0, 10));
