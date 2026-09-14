import { authedFetch, getStoredAuth } from "./auth";

// --- Real pagination behavior we confirmed ---
// - Envelope is {limit, offset, count, total, has_more, results} - NOT {total, page, page_size}
// - Server silently clamps `limit` to 50 no matter what you ask for
// - `total` UNDERCOUNTS the real walkable record set - always walk until has_more is false,
//   never trust `total` alone to know when you're done.

async function fetchAllPages(endpoint) {
  let offset = 0;
  let all = [];
  while (true) {
    const data = await authedFetch(`${endpoint}?limit=50&offset=${offset}`);
    all = all.concat(data.results);
    if (!data.has_more || data.results.length === 0) break;
    offset += data.results.length;
  }
  return all;
}

// Simple in-memory cache so we only pull each collection once per session.
const cache = { listings: null, rentals: null, projects: null };

export async function getAllListings() {
  if (!cache.listings) cache.listings = await fetchAllPages("/v1/listings");
  return cache.listings;
}

export async function getAllRentals() {
  if (!cache.rentals) cache.rentals = await fetchAllPages("/v1/rentals");
  return cache.rentals;
}

export async function getAllProjects() {
  if (!cache.projects) cache.projects = await fetchAllPages("/v1/projects");
  return cache.projects;
}

export function getListingById(id, listings) {
  return listings.find((l) => l.listing_id === id) || null;
}

export function getProjectById(id, projects) {
  return projects.find((p) => p.project_id === id) || null;
}

// --- Favourites ---
// IMPORTANT: /v1/favourites is documented (GET/POST/DELETE) but does not exist on the
// real API. Confirmed by testing GET and POST against every plausible path/spelling
// variant (/v1/favourites, /v1/favorites, /favourites, /v1/me/favourites,
// /v1/user/favourites) - all return the generic framework 404, same as other confirmed
// missing endpoints (e.g. /v1/analytics/summary). This is a real `missing_endpoint`
// finding, not a bug in this app.
//
// Fallback: favourites are stored in localStorage, keyed per logged-in user's email.
// This still satisfies "per user, persists across reload and re-login" since the key
// is tied to identity, not to a browser session.

function favKey() {
  const { user } = getStoredAuth();
  const email = user?.email || "anonymous";
  return `ivy_favourites_${email}`;
}

function getFavouriteIds() {
  const raw = localStorage.getItem(favKey());
  return raw ? JSON.parse(raw) : [];
}

function setFavouriteIds(ids) {
  localStorage.setItem(favKey(), JSON.stringify(ids));
}

export async function getFavourites() {
  const ids = new Set(getFavouriteIds());
  const listings = await getAllListings();
  return listings.filter((l) => ids.has(l.listing_id));
}

export async function addFavourite(listingId) {
  const ids = getFavouriteIds();
  if (!ids.includes(listingId)) {
    ids.push(listingId);
    setFavouriteIds(ids);
  }
  return { id: listingId };
}

export async function removeFavourite(listingId) {
  const ids = getFavouriteIds().filter((id) => id !== listingId);
  setFavouriteIds(ids);
  return { id: listingId, deleted: true };
}

// --- Client-side filtering (works regardless of whether server-side filters work) ---
export function filterListings(listings, { locality, bedroom, minPrice, maxPrice, furnishing, onlyLive = true }) {
  return listings.filter((l) => {
    if (onlyLive && !l.is_live) return false;
    if (locality && l.locality?.toLowerCase() !== locality.toLowerCase()) return false;
    if (bedroom && l.bedroom !== Number(bedroom)) return false;
    if (minPrice && l.price < Number(minPrice)) return false;
    if (maxPrice && l.price > Number(maxPrice)) return false;
    if (furnishing && l.furnishing !== furnishing) return false;
    return true;
  });
}