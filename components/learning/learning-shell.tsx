"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "./navigation";
import { CatalogSkeleton } from "./catalog-skeleton";
import { localCatalogHref } from "@/lib/catalog-navigation";

export function LearningShell({ name, admin, children }: { name: string; admin: boolean; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string) => {
    const current = window.location.pathname + window.location.search;
    const local = localCatalogHref(current, href);
    if (local) {
      if (current !== local) window.history.pushState(null, "", local);
      return;
    }
    if (current === href) return;
    startTransition(() => router.push(href));
  };
  return <>
    <Navigation name={name} admin={admin} onCatalogNavigate={navigate} />
    <div className="app-content" aria-busy={pending}>
      {pending && <CatalogSkeleton />}
      <div hidden={pending}>{children}</div>
    </div>
  </>;
}
