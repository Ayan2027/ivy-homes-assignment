// analyze-step9.mjs
// Run with: node analyze-step9.mjs

import { readFileSync } from "fs";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const listings = loadJson("./data/listings.json");
const rentals = loadJson("./data/rentals.json");
const projects = loadJson("./data/projects.json");

function report(label, ids) {
  console.log(`  ${label}: ${ids.length} records`);
  if (ids.length > 0 && ids.length <= 15) console.log(`    IDs:`, ids);
  else if (ids.length > 15) console.log(`    first 15 IDs:`, ids.slice(0, 15));
}

console.log("=== CANDIDATE CORRUPT-LISTING RULES (each tested independently) ===\n");

const negPrice = listings.filter((l) => l.price < 0).map((l) => l.listing_id);
report("price < 0", negPrice);

const zeroOrNegArea = listings.filter((l) => l.carpet_area <= 0 || l.super_built_up_area <= 0).map((l) => l.listing_id);
report("carpet_area or super_built_up_area <= 0", zeroOrNegArea);

const carpetBiggerThanSBU = listings.filter((l) => l.carpet_area > l.super_built_up_area).map((l) => l.listing_id);
report("carpet_area > super_built_up_area (impossible: carpet is always <= super built-up)", carpetBiggerThanSBU);

const floorGtTotal = listings.filter((l) => l.floor > l.total_floors).map((l) => l.listing_id);
report("floor > total_floors (own record)", floorGtTotal);

const negFloor = listings.filter((l) => l.floor < 0 || l.total_floors <= 0).map((l) => l.listing_id);
report("floor < 0 or total_floors <= 0", negFloor);

const bedroomZeroOrNeg = listings.filter((l) => l.bedroom <= 0).map((l) => l.listing_id);
report("bedroom <= 0", bedroomZeroOrNeg);

const bathroomZeroOrNeg = listings.filter((l) => l.bathroom <= 0).map((l) => l.listing_id);
report("bathroom <= 0", bathroomZeroOrNeg);

const negBalconyParking = listings.filter((l) => l.balcony < 0 || l.covered_parking < 0).map((l) => l.listing_id);
report("balcony < 0 or covered_parking < 0", negBalconyParking);

// A rough overlap check: how many listings trip more than one rule?
const allFlagged = new Map();
for (const [label, ids] of [
  ["negPrice", negPrice], ["zeroOrNegArea", zeroOrNegArea], ["carpetBiggerThanSBU", carpetBiggerThanSBU],
  ["floorGtTotal", floorGtTotal], ["negFloor", negFloor], ["bedroomZeroOrNeg", bedroomZeroOrNeg],
  ["bathroomZeroOrNeg", bathroomZeroOrNeg], ["negBalconyParking", negBalconyParking],
]) {
  for (const id of ids) {
    if (!allFlagged.has(id)) allFlagged.set(id, []);
    allFlagged.get(id).push(label);
  }
}
console.log(`\n  TOTAL unique listings flagged by ANY rule: ${allFlagged.size}`);
const multiFlagged = [...allFlagged.entries()].filter(([, rules]) => rules.length > 1);
console.log(`  listings flagged by MORE THAN ONE rule: ${multiFlagged.length}`);
if (multiFlagged.length > 0) console.log(`  examples:`, multiFlagged.slice(0, 10));

// Print full details of a few flagged records so we can eyeball them
console.log("\n  Full detail of up to 5 negative-price listings:");
listings.filter((l) => l.price < 0).slice(0, 5).forEach((l) => console.log("   ", JSON.stringify(l)));

// --- Rentals: check for the same kind of impossible values, esp. in Jubilee Hills ---
console.log("\n=== RENTALS sanity check ===");
const rentalPrices = rentals.map((r) => r.price);
console.log(`  price: min=${Math.min(...rentalPrices)}, max=${Math.max(...rentalPrices)}`);
const negRentJubilee = rentals.filter((r) => (r.locality || "").toLowerCase() === "jubilee hills" && r.price < 0);
console.log(`  negative-price rentals in Jubilee Hills: ${negRentJubilee.length}`);

// --- Q7 hypothesis test: does project price_max correlate at all with real listing prices in that project? ---
console.log("\n=== Q7 METHOD CHECK: does project price_max track real listing prices? ===");
const maxListingPriceByProject = {};
for (const l of listings) {
  if (l.project_id) {
    const cur = maxListingPriceByProject[l.project_id] || -Infinity;
    if (l.price > cur) maxListingPriceByProject[l.project_id] = l.price;
  }
}
const byDocPriceMax = [...projects].sort((a, b) => b.price_max - a.price_max).slice(0, 5);
const byRealMaxPrice = Object.entries(maxListingPriceByProject).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log("  Top 5 projects by DOCUMENTED price_max field:", byDocPriceMax.map(p => ({ project_id: p.project_id, price_max: p.price_max })));
console.log("  Top 5 projects by REAL max listing price (from listings.json):", byRealMaxPrice.map(([id, price]) => ({ project_id: id, real_max_price: price })));

// --- total_floors clustering check ---
console.log("\n=== total_floors clustering within a project (sanity check on earlier concern) ===");
function projectById(pid) {
  const p = projects.find((pr) => pr.project_id === pid);
  return p ? p.total_floors : "?";
}
const floorsByProject = {};
for (const l of listings) {
  if (l.project_id) {
    if (!floorsByProject[l.project_id]) floorsByProject[l.project_id] = new Set();
    floorsByProject[l.project_id].add(l.total_floors);
  }
}
const distinctCounts = Object.values(floorsByProject).map((s) => s.size);
const avgDistinct = distinctCounts.reduce((a, b) => a + b, 0) / distinctCounts.length;
console.log(`  average number of DISTINCT total_floors values per project: ${avgDistinct.toFixed(2)}`);
console.log(`  (if this is close to 1, listings within a project agree with each other, even if they disagree with the project's own total_floors field)`);
const sampleProjectIds = Object.keys(floorsByProject).slice(0, 5);
sampleProjectIds.forEach((pid) => {
  console.log(`    ${pid}: distinct total_floors among its listings = [${[...floorsByProject[pid]].join(", ")}], project's own total_floors = ${projectById(pid)}`);
});
