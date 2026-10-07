"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
const StudentListDialog = dynamic(() => import("./student-list-dialog"), { loading: () => <span role="status">Đang mở…</span> });

export function StudentList({ kind, targetId, name, count }: { kind: "subject" | "teacher"; targetId: string; name: string; count: number }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="text-link" onClick={() => setOpen(true)}>Xem học sinh ({count})</button>{open && <StudentListDialog key={kind + targetId} kind={kind} targetId={targetId} name={name} onClose={() => setOpen(false)} />}</>;
}
