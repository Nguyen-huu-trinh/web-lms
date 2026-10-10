"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "./navigation";
import { CatalogSkeleton } from "./catalog-skeleton";

export function LearningShell({ name, admin, children }: { name: string; admin: boolean; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string) => {
    if (window.location.pathname + window.location.search === href) return;
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
