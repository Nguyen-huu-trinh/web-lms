"use client";
import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/ui/icon";
export function Dialog({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className="admin-dialog" onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}><header><h2 id={titleId}>{title}</h2><button type="button" className="dialog-close" aria-label="Đóng" disabled={busy} onClick={onClose}><Icon name="close" /></button></header><div className="dialog-body">{children}</div></dialog>;
}
