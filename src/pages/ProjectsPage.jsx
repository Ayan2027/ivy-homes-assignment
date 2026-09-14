import { useEffect, useState } from "react";
import { getAllProjects } from "../api/dataStore";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setProjects(await getAllProjects());
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>Loading projects...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Projects ({projects.length})</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {projects.map((p) => (
          <div key={p.project_id} style={{ border: "1px solid #ddd", padding: 12 }}>
            <strong>{p.apartment_name}</strong> — {p.developer_name}
            <div>{p.locality} · {p.project_status} · {p.total_units} units, {p.total_towers} towers</div>
            <div>Area range: {p.min_area_sqft}–{p.max_area_sqft} sqft</div>
            {/* Note: price_min/price_max are NOT shown here - we confirmed these fields are
                unusable (74% of projects have price_max < price_min, no correlation to real
                listing prices). See Insights screen / README for details. */}
          </div>
        ))}
      </div>
    </div>
  );
}
