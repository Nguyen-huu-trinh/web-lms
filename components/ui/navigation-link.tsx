"use client";
import { useState, type ComponentProps } from "react";
import Link, { useLinkStatus } from "next/link";

type Props = ComponentProps<typeof Link>;
export function NavigationLink({ children, className, prefetch, onMouseEnter, onFocus, ...props }: Props) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} className={[className, "navigation-link"].filter(Boolean).join(" ")}
    prefetch={prefetch ?? (intent ? true : null)}
    onMouseEnter={(event) => { setIntent(true); onMouseEnter?.(event); }}
    onFocus={(event) => { setIntent(true); onFocus?.(event); }}>
    {children}<NavigationFeedback />
  </Link>;
}
function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return <><span className="navigation-pending" data-pending={pending} aria-hidden="true" /><span className="sr-only" role="status">{pending ? "Đang mở trang…" : ""}</span></>;
}
