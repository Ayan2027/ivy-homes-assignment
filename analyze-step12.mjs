// analyze-step12.mjs — run with: node analyze-step12.mjs
import { readFileSync } from "fs";
const load = (p) => JSON.parse(readFileSync(p, "utf-8"));
const listings = load("./data/listings.json");
const projects = load("./data/projects.json");

// Q4 set (locked from step 11)
const negPrice = new Set(listings.filter(l => l.price < 0).map(l => l.listing_id));
const carpetBigger = new Set(listings.filter(l => l.carpet_area > l.super_built_up_area).map(l => l.listing_id));
const floorGtTotal = new Set(listings.filter(l => l.floor > l.total_floors).map(l => l.listing_id));
const nonPlotZeroBed = new Set(listings.filter(l => l.property_type !== "plot" && l.bedroom <= 0).map(l => l.listing_id));
const q4Set = new Set([...negPrice, ...carpetBigger, ...floorGtTotal, ...nonPlotZeroBed]);

// Q9: phone numbers with 2+ distinct names -> all their listings are fake
const byContact = {};
for (const l of listings) (byContact[l.posted_by_contact] ??= []).push(l);
const q9Set = new Set();
for (const arr of Object.values(byContact)) {
  const names = new Set(arr.map(l => l.posted_by_name));
  if (names.size > 1) arr.forEach(l => q9Set.add(l.listing_id));
}
console.log(`Q9 fake_listing_ids: ${q9Set.size} listings`);
console.log(JSON.stringify([...q9Set].sort(), null, 2));

// Q2: unique properties via (lat, long, floor) exact match
const keyLatLongFloor = new Set(listings.map(l => `${l.latitude},${l.longitude},${l.floor}`));
const keyLatLongOnly = new Set(listings.map(l => `${l.latitude},${l.longitude}`));
console.log(`\nQ2 candidates:`);
console.log(`  unique (lat,long,floor) combos: ${keyLatLongFloor.size}  [out of ${listings.length} total records]`);
console.log(`  unique (lat,long) combos only: ${keyLatLongOnly.size}`);

// Q6: is_live true, bedroom==2, excluding Q4 and Q9, mean(price/carpet_area)
const q6pool = listings.filter(l => l.is_live && l.bedroom === 2 && !q4Set.has(l.listing_id) && !q9Set.has(l.listing_id));
const ratios = q6pool.map(l => l.price / l.carpet_area);
const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
console.log(`\nQ6: pool size = ${q6pool.length}, avg_price_per_sqft_2bhk = ${meanRatio.toFixed(2)}`);

// Q8: posted_at treated as bare IST wall-clock, window [REF-7d, REF)
const REF = new Date("2026-09-10T00:00:00+05:30");
const START = new Date(REF.getTime() - 7 * 24 * 60 * 60 * 1000);
function parseAsIST(s) {
  // s like "2026-08-29T20:53:00" with no offset -> treat as IST directly
  return new Date(s + "+05:30");
}
const q8count = listings.filter(l => {
  const d = parseAsIST(l.posted_at);
  return d >= START && d < REF;
}).length;
console.log(`\nQ8: listings_last_7_days (treating posted_at as bare IST) = ${q8count}`);

// Q10: project.total_listings vs actual LIVE-only count
const liveCountByProject = {};
for (const l of listings) if (l.is_live && l.project_id) liveCountByProject[l.project_id] = (liveCountByProject[l.project_id] || 0) + 1;
let mismatches = 0;
for (const p of projects) {
  const actual = liveCountByProject[p.project_id] || 0;
  if (p.total_listings !== actual) mismatches++;
}
console.log(`\nQ10: projects_with_wrong_listing_count (vs live-only actual) = ${mismatches} / ${projects.length}`);
