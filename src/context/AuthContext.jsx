import { createContext, useContext, useState, useCallback } from "react";
import { login as apiLogin, logout as apiLogout, getStoredAuth, isLoggedIn } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth().user);
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  const login = useCallback(async (email, password) => {
    const u = await apiLogin(email, password);
    setUser(u);
    setLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
