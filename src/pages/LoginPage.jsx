import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Building2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo1@ivy.homes");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/listings");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <span className="mark">Ivy Homes</span>
        <div>
          <h1>Hyderabad's property records, verified.</h1>
          <p className="tagline">Browse listings, rentals and builder projects — cross-checked against the live source, not just the documentation.</p>
        </div>
        <Building2 size={22} color="rgba(255,255,255,0.5)" />
      </div>

      <div className="login-form-side">
        <div className="login-shell">
          <h2>Welcome back</h2>
          <p className="sub">Sign in to browse the records.</p>
          <form onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="demo-hint">Demo accounts: demo1–3@ivy.homes</p>
        </div>
      </div>
    </div>
  );
}
