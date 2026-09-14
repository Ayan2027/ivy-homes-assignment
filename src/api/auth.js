import { BASE_URL, API_KEY } from "./config";

// --- Real API behavior we confirmed by hand ---
// - Key goes in X-API-Key header, NOT ?api_key= query param
// - Login returns access_token / refresh_token (NOT `token`), expires_in is really 900s (15 min)
// - Refresh tokens are rotating / single-use: always save the NEW refresh_token after calling /auth/refresh
// - There IS a working /auth/refresh flow despite docs claiming there isn't one

const STORAGE_KEYS = {
  access: "ivy_access_token",
  refresh: "ivy_refresh_token",
  expiresAt: "ivy_access_expires_at",
  user: "ivy_user",
};

export function getStoredAuth() {
  const access = localStorage.getItem(STORAGE_KEYS.access);
  const refresh = localStorage.getItem(STORAGE_KEYS.refresh);
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.expiresAt) || 0);
  const userRaw = localStorage.getItem(STORAGE_KEYS.user);
  return {
    access,
    refresh,
    expiresAt,
    user: userRaw ? JSON.parse(userRaw) : null,
  };
}

function saveAuth({ access_token, refresh_token, expires_in, user }) {
  const expiresAt = Date.now() + expires_in * 1000;
  localStorage.setItem(STORAGE_KEYS.access, access_token);
  localStorage.setItem(STORAGE_KEYS.refresh, refresh_token);
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
  if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export function clearAuth() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

export function isLoggedIn() {
  const { access, refresh } = getStoredAuth();
  return Boolean(access && refresh);
}

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Login failed (${res.status})`);
  }
  const data = await res.json();
  saveAuth(data);
  return data.user;
}

export async function logout() {
  const { access } = getStoredAuth();
  clearAuth();
  if (!access) return;
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "X-API-Key": API_KEY, Authorization: `Bearer ${access}` },
    });
  } catch {
    // best-effort; local session is already cleared either way
  }
}

async function refresh() {
  const { refresh: refreshToken } = getStoredAuth();
  if (!refreshToken) throw new Error("No refresh token available");
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    clearAuth();
    throw new Error("Session expired, please log in again");
  }
  const data = await res.json();
  saveAuth(data); // saves the ROTATED refresh_token too - must not reuse the old one
  return data.access_token;
}

// Ensures a valid access token, refreshing proactively if it's about to expire.
// This is what makes the app "still working 30 minutes after login" despite
// the real 15-minute token lifetime.
export async function ensureFreshToken() {
  const { access, expiresAt } = getStoredAuth();
  if (!access) throw new Error("Not logged in");
  if (Date.now() > expiresAt - 60_000) {
    return refresh();
  }
  return access;
}

// Wrapper for all authenticated API calls.
export async function authedFetch(path, options = {}) {
  const token = await ensureFreshToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  // DELETE etc. may return no body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
