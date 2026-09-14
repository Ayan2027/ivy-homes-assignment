import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllListings, filterListings, addFavourite, removeFavourite, getFavourites } from "../api/dataStore";
import { MapPin, BedDouble, Ruler, Bookmark, Building } from "lucide-react";

const PAGE_SIZE = 12;

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
        setFavIds((s) => { const n = new Set(s); n.delete(listingId); return n; });
      } else {
        await addFavourite(listingId);
        setFavIds((s) => new Set(s).add(listingId));
      }
    } catch (err) {
      alert(`Could not update favourite: ${err.message}`);
    }
  }

  if (loading) return <div className="page"><p className="state-msg">Pulling the full dataset — one moment…</p></div>;
  if (error) return <div className="page"><p className="state-msg error">{error}</p></div>;

  return (
    <>
      <div className="hero">
        <h2>Find a place in Hyderabad</h2>
        <p className="sub">Sale listings, cross-checked against the live API.</p>
        <span className="count-badge">{filtered.length.toLocaleString("en-IN")} listings match</span>
      </div>

      <div className="page">
        <div className="toolbar">
          <input placeholder="Locality" value={filters.locality} onChange={(e) => updateFilter("locality", e.target.value)} />
          <select value={filters.bedroom} onChange={(e) => updateFilter("bedroom", e.target.value)}>
            <option value="">Any BHK</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} BHK</option>)}
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

        {pageItems.length === 0 && <p className="state-msg">No listings match these filters.</p>}

        <div className="grid">
          {pageItems.map((l) => (
            <div key={l.listing_id} className="card">
              <div className="card-media">
                <span className="type-badge">{l.property_type}</span>
                {!l.is_live && <span className="inactive-badge">Inactive</span>}
                <button
                  className={`card-save${favIds.has(l.listing_id) ? " saved" : ""}`}
                  onClick={() => toggleFavourite(l.listing_id)}
                  aria-label="Save listing"
                >
                  <Bookmark size={16} />
                </button>
              </div>
              <div className="card-body">
                <Link to={`/listings/${l.listing_id}`} className="name">{l.apartment_name || l.property_type}</Link>
                <span className="locality"><MapPin size={13} />{l.locality}</span>
                <div className="card-price">₹{l.price.toLocaleString("en-IN")}</div>
                <div className="card-specs">
                  <span><BedDouble size={14} />{l.bedroom} BHK</span>
                  <span><Ruler size={14} />{l.carpet_area} sqft</span>
                  <span><Building size={14} />Fl {l.floor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length > 0 && (
          <div className="pager">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </>
  );
}
