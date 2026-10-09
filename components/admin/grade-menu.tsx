"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "@/components/learning/course-home.module.css";

export function GradeMenu({ name, children }: { name: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("dialog")) return;
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <details ref={ref} className={styles.gradeMenu} onKeyDown={(event) => {
    if (event.key === "Escape" && ref.current && !(event.target instanceof Element && event.target.closest("dialog"))) {
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    }
  }}><summary aria-label={`Quản lý khối ${name}`} title={`Quản lý khối ${name}`}>···</summary><div className={styles.gradeMenuContent}>{children}</div></details>;
}
