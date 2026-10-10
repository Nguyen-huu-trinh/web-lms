// Both catalog filters share the server snapshot. Keep its search scope and
// current selection when switching tabs; a different search needs fresh data.
export function localCatalogHref(currentHref: string, targetHref: string): string | null {
  const origin = "https://catalog.local";
  const current = new URL(currentHref, origin);
  const target = new URL(targetHref, origin);
  if (current.origin !== origin || target.origin !== origin || current.pathname !== "/courses" || target.pathname !== "/courses") return null;
  if ([...target.searchParams.keys()].some(key => !["filter", "grade", "subject", "q"].includes(key))) return null;
  if (target.searchParams.has("q") && target.searchParams.get("q") !== current.searchParams.get("q")) return null;
  const params = new URLSearchParams(current.search);
  for (const [key, value] of target.searchParams) params.set(key, value);
  const query = params.toString();
  return "/courses" + (query ? "?" + query : "");
}

// Native filter/subject changes can produce URLs that have never had an RSC
// request. Return via the actual cached entry, then restore the desired view.
export function catalogNavigationPlan(currentHref: string, targetHref: string, cachedEntry: string | null) {
  const local = localCatalogHref(currentHref, targetHref);
  if (local) return { href: local, route: null };
  const restored = cachedEntry ? localCatalogHref(cachedEntry, targetHref) : null;
  return restored ? { href: restored, route: cachedEntry } : { href: targetHref, route: targetHref };
}

export function catalogSearchScope(href: string) {
  const url = new URL(href, "https://catalog.local");
  return url.pathname === "/courses" && url.searchParams.has("q") ? url.searchParams.get("q")! : null;
}
