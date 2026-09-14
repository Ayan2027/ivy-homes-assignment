// analyze-step10.mjs
// Run with: node analyze-step10.mjs

import { readFileSync } from "fs";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const listings = loadJson("./data/listings.json");
const projects = loadJson("./data/projects.json");

// Re-derive the "big cluster": bedroom<=0 (which, from step9, always implies bathroom<=0 too)
const suspectCluster = listings.filter((l) => l.bedroom <= 0);
console.log(`=== SUSPECT CLUSTER (bedroom <= 0): ${suspectCluster.length} records ===\n`);

// Print a handful in full so we can eyeball the pattern
console.log("Sample of 5 full records from the cluster:");
suspectCluster.slice(0, 5).forEach((l) => console.log(" ", JSON.stringify(l)));

// Check phone number repetition WITHIN the cluster
const contactCountsInCluster = {};
for (const l of suspectCluster) {
  contactCountsInCluster[l.posted_by_contact] = (contactCountsInCluster[l.posted_by_contact] || 0) + 1;
}
const repeatedInCluster = Object.entries(contactCountsInCluster).filter(([, c]) => c > 1);
console.log(`\nDistinct phone numbers in cluster: ${Object.keys(contactCountsInCluster).length} (out of ${suspectCluster.length} records)`);
console.log(`Phone numbers appearing MORE THAN ONCE within the cluster: ${repeatedInCluster.length}`);
console.log(`Top 10 most-repeated numbers in cluster:`, repeatedInCluster.sort((a, b) => b[1] - a[1]).slice(0, 10));

// Check phone number repetition ACROSS THE WHOLE DATASET (not just the cluster) for comparison/baseline
const contactCountsAll = {};
for (const l of listings) {
  contactCountsAll[l.posted_by_contact] = (contactCountsAll[l.posted_by_contact] || 0) + 1;
}
const repeatedAll = Object.entries(contactCountsAll).filter(([, c]) => c > 1);
console.log(`\n=== BASELINE: phone number repetition across ALL ${listings.length} listings ===`);
console.log(`Distinct phone numbers overall: ${Object.keys(contactCountsAll).length}`);
console.log(`Numbers appearing more than once overall: ${repeatedAll.length}`);
console.log(`Top 10 most-repeated numbers overall:`, repeatedAll.sort((a, b) => b[1] - a[1]).slice(0, 10));

// Check description text duplication - do many cluster records share the EXACT same description?
const descCounts = {};
for (const l of suspectCluster) {
  descCounts[l.description] = (descCounts[l.description] || 0) + 1;
}
const repeatedDesc = Object.entries(descCounts).filter(([, c]) => c > 1);
console.log(`\nExact-duplicate descriptions within cluster: ${repeatedDesc.length} distinct texts repeated`);
if (repeatedDesc.length > 0) console.log(`Examples:`, repeatedDesc.slice(0, 3));

// posted_by / is_verified / website / is_live breakdown of the cluster, for characterization
function breakdown(arr, field) {
  const counts = {};
  for (const item of arr) counts[item[field]] = (counts[item[field]] || 0) + 1;
  return counts;
}
console.log(`\nCluster breakdown by posted_by:`, breakdown(suspectCluster, "posted_by"));
console.log(`Cluster breakdown by is_verified:`, breakdown(suspectCluster, "is_verified"));
console.log(`Cluster breakdown by is_live:`, breakdown(suspectCluster, "is_live"));
console.log(`Cluster breakdown by website:`, breakdown(suspectCluster, "website"));
console.log(`Cluster breakdown by property_type:`, breakdown(suspectCluster, "property_type"));

// --- Verify the Q7 candidate listing is clean (not in any of the three corrupt groups) ---
console.log(`\n=== Q7 CANDIDATE VERIFICATION ===`);
const topListing = listings.reduce((max, l) => (l.price > max.price ? l : max), listings[0]);
console.log(`Highest-priced listing overall:`, JSON.stringify(topListing));
const isCorrupt =
  topListing.price < 0 ||
  topListing.carpet_area > topListing.super_built_up_area ||
  topListing.floor > topListing.total_floors;
console.log(`Is this listing in any corrupt category? ${isCorrupt}`);
const itsProject = projects.find((p) => p.project_id === topListing.project_id);
console.log(`Its project record:`, itsProject ? JSON.stringify(itsProject) : "NONE (no project_id)");
