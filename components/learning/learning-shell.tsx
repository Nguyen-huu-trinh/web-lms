"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "./navigation";
import { catalogNavigationPlan, catalogSearchScope } from "@/lib/catalog-navigation";
import { LearningNavigationContext } from "./learning-navigation-context";

export function LearningShell({ name, admin, children }: { name: string; admin: boolean; children: ReactNode }) {
  const router = useRouter();
  const catalogEntry = useRef<string | null>(null);
  const searchEntries = useRef(new Map<string, string>());
  const restore = useRef<{ href: string; route: string } | null>(null);
  const registerCatalogEntry = useCallback((href: string) => {
    catalogEntry.current = href;
    const scope = catalogSearchScope(href) ?? "";
    searchEntries.current.delete(scope);
    searchEntries.current.set(scope, href);
    if (searchEntries.current.size > 20) searchEntries.current.delete(searchEntries.current.keys().next().value!);
    // Restore only after the actual catalog snapshot mounts, never while its
    // route is still showing a loading boundary or a previous search result.
    const requested = restore.current;
    if (requested && window.location.pathname === "/courses" && (catalogSearchScope(requested.route) ?? "") === scope) {
      catalogEntry.current = requested.route;
      restore.current = null;
      if (window.location.pathname + window.location.search !== requested.href) window.history.replaceState(null, "", requested.href);
    }
  }, []);
  const navigate = (href: string) => {
    const current = window.location.pathname + window.location.search;
    const requestedScope = catalogSearchScope(href);
    const entry = requestedScope === null ? catalogEntry.current : searchEntries.current.get(requestedScope) ?? null;
    const plan = catalogNavigationPlan(current, href, entry);
    if (plan.route === null) {
      if (current !== plan.href) window.history.pushState(null, "", plan.href);
      return;
    }
    if (current === plan.route) return;
    restore.current = plan.route !== plan.href ? { href: plan.href, route: plan.route } : null;
    router.push(plan.route);
  };
  return <LearningNavigationContext.Provider value={{ navigateCatalog: navigate, registerCatalogEntry }}>
    <Navigation name={name} admin={admin} onCatalogNavigate={navigate} />
    <div className="app-content">{children}</div>
  </LearningNavigationContext.Provider>;
}
