import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { loggedIn, logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="nav">
      <span className="nav-mark">Ivy Homes</span>
      <NavLink to="/listings" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Listings</NavLink>
      <NavLink to="/rentals" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Rentals</NavLink>
      <NavLink to="/projects" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Projects</NavLink>
      <NavLink to="/favourites" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Favourites</NavLink>
      <NavLink to="/insights" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Insights</NavLink>
      <div className="nav-spacer">
        {loggedIn ? (
          <>
            <span className="nav-user">{user?.email}</span>
            <button className="btn-logout" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <Link to="/login" className="nav-link">Login</Link>
        )}
      </div>
    </nav>
  );
}
