"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

const ToastContext = createContext<((message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const sequence = useRef(0);
  const notify = useCallback((message: string) => {
    setToast({ id: ++sequence.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return <ToastContext.Provider value={notify}>
    {children}
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
      {toast && <div key={toast.id} className="success-toast">
        <span className="toast-icon"><Icon name="check" /></span>
        <p>{toast.message}</p>
        <button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)}><Icon name="close" /></button>
      </div>}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("ToastProvider is required");
  return notify;
}
