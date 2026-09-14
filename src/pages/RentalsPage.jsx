import { useEffect, useState, useMemo } from "react";
import { getAllRentals } from "../api/dataStore";

const PAGE_SIZE = 20;

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locality, setLocality] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setRentals(await getAllRentals());
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => rentals.filter((r) => !locality || r.locality?.toLowerCase() === locality.toLowerCase()),
    [rentals, locality]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <p style={{ padding: 20 }}>Loading rentals...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Rentals ({filtered.length})</h2>
      <input
        placeholder="Filter by locality"
        value={locality}
        onChange={(e) => { setLocality(e.target.value); setPage(1); }}
        style={{ marginBottom: 16 }}
      />
      <div style={{ display: "grid", gap: 12 }}>
        {pageItems.map((r) => (
          <div key={r.listing_id} style={{ border: "1px solid #ddd", padding: 12 }}>
            <strong>{r.apartment_name || r.title}</strong>
            <div>{r.locality} · {r.bedroom} BHK · {r.furnishing}</div>
            <div>₹{r.price.toLocaleString("en-IN")}/month · Deposit ₹{r.deposit?.toLocaleString("en-IN")}</div>
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
