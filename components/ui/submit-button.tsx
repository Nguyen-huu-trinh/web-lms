"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({ children, pendingLabel = "Đang xử lý…", className = "button", disabled = false }: { children: React.ReactNode; pendingLabel?: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={disabled || pending} aria-busy={pending}>{pending && <span className="spinner" aria-hidden="true" />}{pending ? pendingLabel : children}</button>;
}
