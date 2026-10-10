"use client";
import { NavigationLink as Link } from "@/components/ui/navigation-link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";
import styles from "./navigation.module.css";
import { isMyCoursesFilter } from "@/lib/catalog-search";
export function Navigation({ name, admin, onCatalogNavigate }: { name: string; admin: boolean; onCatalogNavigate?: (href: string) => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const mine = isMyCoursesFilter(admin ? "ADMIN" : "STUDENT", params.get("filter") ?? undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  const account = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (account.current && !account.current.contains(event.target as Node)) account.current.open = false; };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <header className={`site-header ${styles.header}`}><div className="site-nav">
    <Link href="/courses" className="brand" aria-label="KhoBai — Môn học"><span className="brand-icon"><Icon name="library" /></span><span>KhoBai.<span className="brand-caption">LỘ TRÌNH HỌC TẬP</span></span></Link>
    <nav aria-label="Điều hướng chính" className="primary-nav"><Link href="/courses?filter=all" prefetch={pathname === "/courses" ? false : undefined} onNavigate={(event) => { if (onCatalogNavigate) { event.preventDefault(); onCatalogNavigate("/courses?filter=all"); } }} aria-current={pathname.startsWith("/courses") && !mine ? "page" : undefined}><Icon name="grid" /> Tất cả khóa học</Link><Link href="/courses?filter=mine" prefetch={pathname === "/courses" ? false : undefined} onNavigate={(event) => { if (onCatalogNavigate) { event.preventDefault(); onCatalogNavigate("/courses?filter=mine"); } }} aria-current={pathname.startsWith("/courses") && mine ? "page" : undefined}><Icon name="book" /> Khóa học của tôi</Link><Link href="/menu" aria-current={pathname === "/menu" ? "page" : undefined}><Icon name="pricing" /> Bảng giá</Link></nav>
    <button ref={searchToggle} type="button" className="mobile-search-toggle" aria-label={searchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"} aria-expanded={searchOpen} aria-controls="header-search" onClick={() => setSearchOpen((open) => !open)}><Icon name="search" /></button>
    <form id="header-search" action="/courses" method="get" role="search" className="header-search" data-open={searchOpen} onKeyDown={(event) => { if (event.key === "Escape" && window.matchMedia("(max-width: 600px)").matches) { setSearchOpen(false); searchToggle.current?.focus(); } }}>
      <input type="hidden" name="filter" value={mine ? "mine" : "all"} />
      {pathname === "/courses" && params.get("grade") && <input type="hidden" name="grade" value={params.get("grade")!} />}
      <button type="submit" title="Tìm kiếm" aria-label="Tìm kiếm"><Icon name="search" /></button>
      <input ref={searchInput} key={params.get("q") ?? ""} name="q" type="search" defaultValue={params.get("q") ?? ""} placeholder="Tìm môn học, giáo viên…" aria-label="Tìm môn học hoặc giáo viên" />
    </form>
    <details ref={account} key={pathname} className="user-menu" onKeyDown={(event) => { if (event.key === "Escape" && account.current) { account.current.open = false; account.current.querySelector("summary")?.focus(); } }}><summary aria-label={`Tài khoản ${name}`}><span className="avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><span className="user-name">{name}<small>{admin ? "Quản trị viên" : "Học sinh"}</small></span><Icon name="chevron" className="account-chevron" /></summary><div className="user-dropdown"><div className="dropdown-heading"><p>{name}</p><span className="badge">{admin ? "Quản trị viên" : "Học sinh"}</span></div><Link href="/change-password" onClick={() => { if (account.current) account.current.open = false; }}><Icon name="lock" /> Đổi mật khẩu</Link><form action={logout}><SubmitButton className="dropdown-logout" pendingLabel="Đang đăng xuất…"><Icon name="logout" /> Đăng xuất</SubmitButton></form></div></details>
  </div></header>;
}
