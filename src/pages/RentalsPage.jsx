import { useEffect, useState, useMemo } from "react";
import { MapPin, BedDouble, Sofa } from "lucide-react";
import { getAllRentals } from "../api/dataStore";

const PAGE_SIZE = 12;

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locality, setLocality] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { (async () => { setRentals(await getAllRentals()); setLoading(false); })(); }, []);

  const filtered = useMemo(
    () => rentals.filter((r) => !locality || r.locality?.toLowerCase() === locality.toLowerCase()),
    [rentals, locality]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="page"><p className="state-msg">Loading rentals…</p></div>;

  return (
    <>
      <div className="hero">
        <h2>Rentals</h2>
        <p className="sub">Monthly rent listings across Hyderabad.</p>
        <span className="count-badge">{filtered.length.toLocaleString("en-IN")} matching</span>
      </div>

      <div className="page">
        <div className="toolbar">
          <input placeholder="Filter by locality" value={locality} onChange={(e) => { setLocality(e.target.value); setPage(1); }} />
        </div>

        <div className="grid">
          {pageItems.map((r) => (
            <div key={r.listing_id} className="card">
              <div className="card-media">
                <span className="type-badge">{r.property_type}</span>
              </div>
              <div className="card-body">
                <span className="name">{r.apartment_name || r.title}</span>
                <span className="locality"><MapPin size={13} />{r.locality}</span>
                <div className="card-price">₹{r.price.toLocaleString("en-IN")} <span className="unit">/month</span></div>
                <div className="card-specs">
                  <span><BedDouble size={14} />{r.bedroom} BHK</span>
                  <span><Sofa size={14} />{r.furnishing}</span>
                </div>
                <p style={{ fontSize: "0.78rem", marginTop: 8, marginBottom: 0 }}>Deposit ₹{r.deposit?.toLocaleString("en-IN")}</p>
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
