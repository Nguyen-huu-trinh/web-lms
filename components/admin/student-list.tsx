"use client";
import { useSubjectCounts } from "./subject-counts";
import { Icon } from "@/components/ui/icon";
import { useState } from "react";
import dynamic from "next/dynamic";
const StudentListDialog = dynamic(() => import("./student-list-dialog"), { loading: () => <span role="status">Đang mở…</span> });

export function StudentList({ kind, targetId, name, count, iconOnly = false }: { iconOnly?: boolean; kind: "subject" | "teacher"; targetId: string; name: string; count?: number }) {
  const counts = useSubjectCounts();
  const total = count ?? (kind === "subject" ? counts?.subject : counts ? counts.teachers[targetId] ?? 0 : undefined);
  const [open, setOpen] = useState(false);
  return <><button type="button" className="text-link" onClick={() => setOpen(true)} title={`Xem học sinh (${total ?? "…"})`} aria-label="Xem học sinh">{iconOnly ? <Icon name="users" /> : <>Xem học sinh{total === undefined ? " (…)" : ` (${total})`}</>}</button>{open && <StudentListDialog key={kind + targetId} kind={kind} targetId={targetId} name={name} onClose={() => setOpen(false)} />}</>;
}
