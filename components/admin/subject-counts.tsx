"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export type SubjectCounts = { subject: number; teachers: Record<string, number> };
const CountsContext = createContext<SubjectCounts | undefined>(undefined);
export function useSubjectCounts() { return useContext(CountsContext); }

export function SubjectCountsProvider({ subjectId, initial, children }: { subjectId: string; initial?: SubjectCounts; children: ReactNode }) {
  const [counts, setCounts] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (counts) return;
    const controller = new AbortController();
    void fetch("/courses/access-counts?subject=" + encodeURIComponent(subjectId), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Unavailable");
        const result = await response.json() as SubjectCounts;
        if (!controller.signal.aborted) setCounts(result);
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [subjectId, counts, attempt]);
  return <CountsContext.Provider value={counts}>{failed && <p role="status">Chưa tải được số lượng học sinh. <button type="button" className="text-link" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Thử lại</button></p>}{children}</CountsContext.Provider>;
}
