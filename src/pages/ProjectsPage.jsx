import { useEffect, useState } from "react";
import { MapPin, Building, Layers, Info } from "lucide-react";
import { getAllProjects } from "../api/dataStore";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { setProjects(await getAllProjects()); setLoading(false); })(); }, []);

  if (loading) return <div className="page"><p className="state-msg">Loading projects…</p></div>;

  return (
    <>
      <div className="hero">
        <h2>Builder projects</h2>
        <p className="sub">Developments across Hyderabad.</p>
        <span className="count-badge">{projects.length.toLocaleString("en-IN")} projects</span>
      </div>

      <div className="page">
        <div className="api-note">
          <Info size={15} />
          price_min / price_max are omitted below — verified unusable (74% of projects have price_max &lt; price_min, no correlation to real linked-listing prices). See Insights.
        </div>

        <div className="grid">
          {projects.map((p) => (
            <div key={p.project_id} className="card">
              <div className="card-media">
                <span className="type-badge">{p.project_status}</span>
              </div>
              <div className="card-body">
                <span className="name">{p.apartment_name}</span>
                <span className="locality"><MapPin size={13} />{p.locality} · {p.developer_name}</span>
                <div className="card-specs">
                  <span><Building size={14} />{p.total_units} units</span>
                  <span><Layers size={14} />{p.total_towers} towers</span>
                </div>
                <p style={{ fontSize: "0.82rem", marginTop: 10, marginBottom: 0 }}>{p.min_area_sqft}–{p.max_area_sqft} sqft</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
