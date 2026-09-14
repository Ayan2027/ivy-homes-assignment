import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAllListings, getAllProjects, getListingById, getProjectById } from "../api/dataStore";

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [listings, projects] = await Promise.all([getAllListings(), getAllProjects()]);
      const l = getListingById(id, listings);
      setListing(l);
      if (l?.project_id) setProject(getProjectById(l.project_id, projects));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>;
  if (!listing) return <p style={{ padding: 20 }}>Listing not found. <Link to="/listings">Back to listings</Link></p>;

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <Link to="/listings">&larr; Back to listings</Link>
      <h2>{listing.apartment_name || listing.property_type} — {listing.locality}</h2>
      <p><strong>₹{listing.price.toLocaleString("en-IN")}</strong> · {listing.bedroom} BHK · {listing.bathroom} bath · {listing.furnishing}</p>
      <p>Floor {listing.floor} of {listing.total_floors} · Carpet area {listing.carpet_area} sqft · Super built-up {listing.super_built_up_area} sqft</p>
      <p>{listing.description}</p>
      <p>Posted by {listing.posted_by}: {listing.posted_by_name} ({listing.posted_by_contact})</p>
      {!listing.is_live && (
        <p style={{ color: "orange" }}>⚠ This listing is marked inactive (is_live: false) by the source API.</p>
      )}
      {project && (
        <div style={{ marginTop: 16, borderTop: "1px solid #ddd", paddingTop: 12 }}>
          <h4>Project: {project.apartment_name} ({project.developer_name})</h4>
          <p>{project.project_status} · {project.total_units} units · {project.total_towers} towers</p>
        </div>
      )}
    </div>
  );
}
