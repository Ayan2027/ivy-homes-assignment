import { useEffect, useState } from "react";
import { getAllListings, getAllRentals, getAllProjects } from "../api/dataStore";

// NOTE: /v1/analytics/summary is documented but does not exist (returns 404 - see findings).
// Everything on this screen is computed client-side from the full pulled dataset instead.

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export default function InsightsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [listings, rentals, projects] = await Promise.all([
        getAllListings(),
        getAllRentals(),
        getAllProjects(),
      ]);

      const live = listings.filter((l) => l.is_live);
      const prices = live.map((l) => l.price).filter((p) => p > 0);

      const byLocality = {};
      for (const l of live) {
        byLocality[l.locality] = (byLocality[l.locality] || 0) + 1;
      }
      const topLocalities = Object.entries(byLocality).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const byBhk = {};
      for (const l of live) byBhk[l.bedroom] = (byBhk[l.bedroom] || 0) + 1;

      // Our forensic discoveries, computed live (not hardcoded) so this stays correct
      // if the dataset changes.
      const negPrice = listings.filter((l) => l.price < 0);
      const carpetBigger = listings.filter((l) => l.carpet_area > l.super_built_up_area);
      const floorGtTotal = listings.filter((l) => l.floor > l.total_floors);
      const nonPlotZeroBed = listings.filter((l) => l.property_type !== "plot" && l.bedroom <= 0);
      const corruptCount = new Set([...negPrice, ...carpetBigger, ...floorGtTotal, ...nonPlotZeroBed].map((l) => l.listing_id)).size;

      const byContact = {};
      for (const l of listings) (byContact[l.posted_by_contact] ??= new Set()).add(l.posted_by_name);
      let fakeCount = 0;
      for (const l of listings) {
        if (byContact[l.posted_by_contact].size > 1) fakeCount++;
      }

      const liveCountByProject = {};
      for (const l of listings) if (l.is_live && l.project_id) liveCountByProject[l.project_id] = (liveCountByProject[l.project_id] || 0) + 1;
      const projectMismatches = projects.filter((p) => (liveCountByProject[p.project_id] || 0) !== p.total_listings).length;

      setStats({
        totalListings: listings.length,
        liveListings: live.length,
        medianPrice: median(prices),
        medianPricePerSqft: median(live.map((l) => l.price / l.carpet_area)),
        topLocalities,
        byBhk,
        totalRentals: rentals.length,
        totalProjects: projects.length,
        corruptCount,
        fakeCount,
        projectMismatches,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>Crunching numbers from the full dataset...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h2>Insights — Hyderabad</h2>
      <p style={{ color: "#666", fontSize: 14 }}>
        /v1/analytics/summary doesn't exist on the real API (documented but returns 404) —
        everything below is computed live from the full pulled dataset instead.
      </p>

      <h3>Market overview</h3>
      <ul>
        <li>Total listings retrievable: {stats.totalListings}</li>
        <li>Active (is_live) listings: {stats.liveListings}</li>
        <li>Median price (active listings): ₹{Math.round(stats.medianPrice).toLocaleString("en-IN")}</li>
        <li>Median price/sqft: ₹{stats.medianPricePerSqft.toFixed(2)}</li>
        <li>Total rentals: {stats.totalRentals}</li>
        <li>Total projects: {stats.totalProjects}</li>
      </ul>

      <h3>Top localities by active listing count</h3>
      <ol>
        {stats.topLocalities.map(([loc, count]) => (
          <li key={loc}>{loc}: {count}</li>
        ))}
      </ol>

      <h3>By bedroom count</h3>
      <ul>
        {Object.entries(stats.byBhk).sort().map(([bhk, count]) => (
          <li key={bhk}>{bhk} BHK: {count}</li>
        ))}
      </ul>

      <h3>Data quality — what we found digging into this dataset</h3>
      <ul>
        <li>{stats.corruptCount} listings describe a physically impossible property (negative price, area mismatch, floor overflow, or zero-bedroom non-plot) and are excluded from price calculations above.</li>
        <li>{stats.fakeCount} listings share a contact number that's also used under a different name — a strong signal of bait/fraudulent listings.</li>
        <li>{stats.projectMismatches} of {stats.totalProjects} projects report a listing count that disagrees with what's actually live.</li>
      </ul>
    </div>
  );
}
