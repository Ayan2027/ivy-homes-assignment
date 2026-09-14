import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllListings, filterListings, addFavourite, removeFavourite, getFavourites } from "../api/dataStore";

const PAGE_SIZE = 20;

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favIds, setFavIds] = useState(new Set());
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    locality: "",
    bedroom: "",
    minPrice: "",
    maxPrice: "",
    furnishing: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const [all, favs] = await Promise.all([getAllListings(), getFavourites()]);
        setListings(all);
        setFavIds(new Set(favs.map((f) => f.listing_id)));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => filterListings(listings, filters), [listings, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  async function toggleFavourite(listingId) {
    const isFav = favIds.has(listingId);
    try {
      if (isFav) {
        await removeFavourite(listingId);
        setFavIds((s) => {
          const next = new Set(s);
          next.delete(listingId);
          return next;
        });
      } else {
        await addFavourite(listingId);
        setFavIds((s) => new Set(s).add(listingId));
      }
    } catch (err) {
      alert(`Could not update favourite: ${err.message}`);
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Loading listings (pulling full dataset, one moment)...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Listings ({filtered.length} matching)</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input placeholder="Locality" value={filters.locality} onChange={(e) => updateFilter("locality", e.target.value)} />
        <select value={filters.bedroom} onChange={(e) => updateFilter("bedroom", e.target.value)}>
          <option value="">Any BHK</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} BHK</option>
          ))}
        </select>
        <input placeholder="Min price" type="number" value={filters.minPrice} onChange={(e) => updateFilter("minPrice", e.target.value)} />
        <input placeholder="Max price" type="number" value={filters.maxPrice} onChange={(e) => updateFilter("maxPrice", e.target.value)} />
        <select value={filters.furnishing} onChange={(e) => updateFilter("furnishing", e.target.value)}>
          <option value="">Any furnishing</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi-furnished">Semi-furnished</option>
          <option value="fully-furnished">Fully-furnished</option>
        </select>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {pageItems.map((l) => (
          <div key={l.listing_id} style={{ border: "1px solid #ddd", padding: 12, display: "flex", justifyContent: "space-between" }}>
            <div>
              <Link to={`/listings/${l.listing_id}`}>
                <strong>{l.apartment_name || l.property_type}</strong>
              </Link>
              <div>{l.locality} · {l.bedroom} BHK · {l.property_type}</div>
              <div>₹{l.price.toLocaleString("en-IN")} · {l.carpet_area} sqft carpet</div>
            </div>
            <button onClick={() => toggleFavourite(l.listing_id)}>
              {favIds.has(l.listing_id) ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
