"use client";
import { useContext, useState, type ComponentProps } from "react";
import Link, { useLinkStatus } from "next/link";
import { LocalLearningContext } from "@/components/learning/local-learning-context";
import { LearningNavigationContext } from "@/components/learning/learning-navigation-context";

type Props = ComponentProps<typeof Link> & { intentOnly?: boolean };
export function NavigationLink({ children, className, prefetch, intentOnly = false, onMouseEnter, onFocus, onClick, onNavigate, ...props }: Props) {
  const [intent, setIntent] = useState(false);
  const local = useContext(LocalLearningContext);
  const navigation = useContext(LearningNavigationContext);
  const catalogHref = typeof props.href === "string" && /^\/courses(?:\?|$)/.test(props.href) ? props.href : null;
  const localHref = typeof props.href === "string" ? local?.hrefFor(props.href) : null;
  if (localHref) return <a {...props} href={localHref} className={className} onMouseEnter={onMouseEnter} onFocus={onFocus} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || props.target === "_blank") return;
    event.preventDefault();
    window.history.pushState(null, "", localHref);
    if (props.scroll !== false) window.scrollTo(0, 0);
  }}>{children}</a>;
  return <Link {...props} className={[className, "navigation-link"].filter(Boolean).join(" ")}
    onClick={onClick}
    onNavigate={event => {
      if (onNavigate) { onNavigate(event); return; }
      if (catalogHref && navigation) { event.preventDefault(); navigation.navigateCatalog(catalogHref); }
    }}
    prefetch={catalogHref && navigation ? false : prefetch ?? (intent ? true : intentOnly ? false : null)}
    onMouseEnter={(event) => { setIntent(true); onMouseEnter?.(event); }}
    onFocus={(event) => { setIntent(true); onFocus?.(event); }}>
    {children}<NavigationFeedback />
  </Link>;
}
function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return <><span className="navigation-pending" data-pending={pending} aria-hidden="true" /><span className="sr-only" role="status">{pending ? "Đang mở trang…" : ""}</span></>;
}
