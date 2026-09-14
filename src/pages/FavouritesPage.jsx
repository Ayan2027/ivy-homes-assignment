import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFavourites, removeFavourite } from "../api/dataStore";

export default function FavouritesPage() {
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getFavourites();
    setFavs(data);
    setLoading(false);
  }

  async function handleRemove(id) {
    await removeFavourite(id);
    setFavs((f) => f.filter((l) => l.listing_id !== id));
  }

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Saved listings ({favs.length})</h2>
      {favs.length === 0 && <p>No saved listings yet.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {favs.map((l) => (
          <div key={l.listing_id} style={{ border: "1px solid #ddd", padding: 12, display: "flex", justifyContent: "space-between" }}>
            <div>
              <Link to={`/listings/${l.listing_id}`}><strong>{l.apartment_name || l.property_type}</strong></Link>
              <div>{l.locality} · {l.bedroom} BHK · ₹{l.price.toLocaleString("en-IN")}</div>
            </div>
            <button onClick={() => handleRemove(l.listing_id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
