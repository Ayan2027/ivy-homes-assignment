import { readFileSync } from "fs";
const listings = JSON.parse(readFileSync("./data/listings.json", "utf-8"));

function uniqueBy(keyFn, label) {
  const set = new Set(listings.map(keyFn));
  console.log(`  ${label}: ${set.size} unique / ${listings.length} total`);
  return set.size;
}

console.log("=== Q2 KEY CANDIDATES ===");
uniqueBy(l => `${l.apartment_name}|${l.floor}|${l.carpet_area}`, "apartment_name+floor+carpet_area");
uniqueBy(l => `${l.apartment_name}|${l.floor}|${l.carpet_area}|${l.locality}`, "apartment_name+floor+carpet_area+locality");
uniqueBy(l => `${l.apartment_name}|${l.floor}|${l.bedroom}|${l.locality}`, "apartment_name+floor+bedroom+locality");
uniqueBy(l => `${l.apartment_name}|${l.floor}|${l.super_built_up_area}|${l.locality}`, "apartment_name+floor+super_built_up_area+locality");

// Show a concrete example: find apartment_name+floor+carpet_area duplicates and print them side by side
const groups = {};
for (const l of listings) {
  const k = `${l.apartment_name}|${l.floor}|${l.carpet_area}`;
  (groups[k] ??= []).push(l);
}
const dupGroups = Object.values(groups).filter(g => g.length > 1);
console.log(`\n  groups with 2+ records (apartment_name+floor+carpet_area): ${dupGroups.length}`);
if (dupGroups.length > 0) {
  console.log("  Example duplicate group:");
  dupGroups[0].forEach(l => console.log("   ", JSON.stringify({listing_id:l.listing_id, website:l.website, apartment_name:l.apartment_name, floor:l.floor, carpet_area:l.carpet_area, latitude:l.latitude, longitude:l.longitude, price:l.price, posted_by_contact:l.posted_by_contact})));
}
