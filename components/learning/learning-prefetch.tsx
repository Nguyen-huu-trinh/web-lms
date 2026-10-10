"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { allowBackgroundPrefetch } from "@/lib/learning-prefetch";

// Route payloads only: this never mounts an iframe or downloads a media file.
// No recursive prefetch: effects on prefetched pages run only after navigation.
export function LearningPrefetch({ routes, allCourses = false }: { routes: string[]; allCourses?: boolean }) {
  const router = useRouter();
  const targets = JSON.stringify([...new Set(routes)].filter(href => allCourses ? /^\/courses\/[a-zA-Z0-9-]+$/.test(href) : /^\/lessons\/[a-zA-Z0-9-]+$/.test(href)).slice(0, allCourses ? undefined : 2));
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const timers = (JSON.parse(targets) as string[]).map((href, index) => setTimeout(() => {
      if (document.visibilityState !== "visible" || !allowBackgroundPrefetch(navigator.onLine, connection)) return;
      if (!/^\/(courses|lessons)\/[a-zA-Z0-9-]+$/.test(href)) return;
      // Next 16.3 defaults imperative prefetch to AUTO, which stops at loading
      // boundaries. FULL includes the streamed course/lesson data as well.
      router.prefetch(href, { kind: PrefetchKind.FULL });
    }, index * 300));
    // Stop queued work when the student leaves. Next manages in-flight requests.
    return () => timers.forEach(clearTimeout);
  }, [router, targets]);
  return null;
}
