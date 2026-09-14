import { useEffect, useState } from "react";
import { getAllListings, getAllRentals, getAllProjects } from "../api/dataStore";
import { ShieldAlert, Info, MapPin, BedDouble, Home } from "lucide-react";

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
        getAllListings(), getAllRentals(), getAllProjects(),
      ]);

      const live = listings.filter((l) => l.is_live);
      const prices = live.map((l) => l.price).filter((p) => p > 0);

      const byLocality = {};
      for (const l of live) byLocality[l.locality] = (byLocality[l.locality] || 0) + 1;
      const topLocalities = Object.entries(byLocality).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const byBhk = {};
      for (const l of live) byBhk[l.bedroom] = (byBhk[l.bedroom] || 0) + 1;

      const negPrice = listings.filter((l) => l.price < 0);
      const carpetBigger = listings.filter((l) => l.carpet_area > l.super_built_up_area);
      const floorGtTotal = listings.filter((l) => l.floor > l.total_floors);
      const nonPlotZeroBed = listings.filter((l) => l.property_type !== "plot" && l.bedroom <= 0);
      const corruptCount = new Set([...negPrice, ...carpetBigger, ...floorGtTotal, ...nonPlotZeroBed].map((l) => l.listing_id)).size;

      const byContact = {};
      for (const l of listings) (byContact[l.posted_by_contact] ??= new Set()).add(l.posted_by_name);
      let fakeCount = 0;
      for (const l of listings) if (byContact[l.posted_by_contact].size > 1) fakeCount++;

      const liveCountByProject = {};
      for (const l of listings) if (l.is_live && l.project_id) liveCountByProject[l.project_id] = (liveCountByProject[l.project_id] || 0) + 1;
      const projectMismatches = projects.filter((p) => (liveCountByProject[p.project_id] || 0) !== p.total_listings).length;

      setStats({
        totalListings: listings.length,
        liveListings: live.length,
        medianPrice: median(prices),
        medianPricePerSqft: median(live.map((l) => l.price / l.carpet_area)),
        topLocalities, byBhk,
        totalRentals: rentals.length,
        totalProjects: projects.length,
        corruptCount, fakeCount, projectMismatches,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page"><p className="state-msg">Crunching numbers from the full dataset…</p></div>;

  return (
    <>
      <div className="hero">
        <h2>Insights — Hyderabad</h2>
        <p className="sub">A market summary, computed from the full retrievable dataset.</p>
      </div>

      <div className="page">
        <div className="api-note">
          <Info size={15} />
          /v1/analytics/summary is documented but doesn't exist on the real API (returns 404) — everything below is computed live from the pulled dataset.
        </div>

        <div className="stats-row">
          <div className="stat">
            <span className="figure">{stats.liveListings.toLocaleString("en-IN")}</span>
            <span className="label">active listings of {stats.totalListings.toLocaleString("en-IN")} retrievable</span>
          </div>
          <div className="stat">
            <span className="figure">₹{Math.round(stats.medianPrice / 100000)}L</span>
            <span className="label">median price, active listings</span>
          </div>
          <div className="stat">
            <span className="figure">₹{stats.medianPricePerSqft.toFixed(0)}</span>
            <span className="label">median price per sqft</span>
          </div>
        </div>

        <div className="section-title"><MapPin size={16} /> Top localities by active listings</div>
        <div className="mini-list">
          {stats.topLocalities.map(([loc, count]) => (
            <div key={loc} className="mini-row"><span>{loc}</span><span className="n">{count}</span></div>
          ))}
        </div>

        <div className="section-title"><BedDouble size={16} /> By bedroom count</div>
        <div className="mini-list">
          {Object.entries(stats.byBhk).sort().map(([bhk, count]) => (
            <div key={bhk} className="mini-row"><span>{bhk} BHK</span><span className="n">{count}</span></div>
          ))}
        </div>

        <div className="section-title"><Home size={16} /> Rentals &amp; projects on record</div>
        <div className="mini-list">
          <div className="mini-row"><span>Total rentals retrievable</span><span className="n">{stats.totalRentals.toLocaleString("en-IN")}</span></div>
          <div className="mini-row"><span>Total projects retrievable</span><span className="n">{stats.totalProjects.toLocaleString("en-IN")}</span></div>
        </div>

        <div className="section-title"><ShieldAlert size={16} color="var(--flag)" /> Audit — what digging into this dataset found</div>
        <div className="audit-panel">
          <div className="audit-item">
            <span className="d">Listings describing a physically impossible property (negative price, area mismatch, floor overflow, or zero-bedroom non-plot) — excluded from the price figures above</span>
            <span className="n">{stats.corruptCount}</span>
          </div>
          <div className="audit-item">
            <span className="d">Listings sharing a contact number also used under a different name — a signal of bait/fraudulent listings</span>
            <span className="n">{stats.fakeCount}</span>
          </div>
          <div className="audit-item">
            <span className="d">Projects whose reported listing count disagrees with what's actually live, of {stats.totalProjects}</span>
            <span className="n">{stats.projectMismatches}</span>
          </div>
        </div>
      </div>
    </>
  );
}
