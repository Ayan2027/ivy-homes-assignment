import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { loggedIn, logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd", alignItems: "center" }}>
      <Link to="/listings">Listings</Link>
      <Link to="/rentals">Rentals</Link>
      <Link to="/projects">Projects</Link>
      <Link to="/favourites">Favourites</Link>
      <Link to="/insights">Insights</Link>
      <div style={{ marginLeft: "auto" }}>
        {loggedIn ? (
          <>
            <span style={{ marginRight: 12 }}>{user?.email}</span>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}
