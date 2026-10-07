"use client";

import { useState, type ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import styles from "./catalog.module.css";

export function CourseSwitchLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  const [prefetch, setPrefetch] = useState(false);
  return <Link
    href={href}
    className={styles.courseLink}
    aria-current={active ? "page" : undefined}
    scroll={false}
    prefetch={prefetch ? true : false}
    onMouseEnter={() => setPrefetch(true)}
    onFocus={() => setPrefetch(true)}
  ><SwitchFeedback>{children}</SwitchFeedback></Link>;
}

function SwitchFeedback({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={styles.courseSwitchContent} data-pending={pending} aria-busy={pending}>
    {children}
    <span className={styles.courseSwitchSpinner} aria-hidden="true" />
    <span className="sr-only" role="status">{pending ? "Đang tải khóa học…" : ""}</span>
  </span>;
}
