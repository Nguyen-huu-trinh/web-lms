"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { logout } from "@/app/login/actions";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";
export function Navigation({ name, admin }: { name: string; admin: boolean }) {
  const pathname = usePathname();
  const account = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (account.current && !account.current.contains(event.target as Node)) account.current.open = false; };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <header className="site-header"><div className="site-nav">
    <Link href="/courses" className="brand" aria-label="LMS — Môn học"><span className="brand-icon"><Icon name="book" /></span><span>LMS<span className="brand-caption">Không gian học tập</span></span></Link>
    <nav aria-label="Điều hướng chính" className="primary-nav"><Link href="/courses" aria-current={pathname.startsWith("/courses") || pathname.startsWith("/lessons") ? "page" : undefined}><Icon name="grid" /> Khóa học</Link><Link href="/menu" aria-current={pathname === "/menu" ? "page" : undefined}><Icon name="pricing" /> Bảng giá</Link></nav>
    <details ref={account} key={pathname} className="user-menu" onKeyDown={(event) => { if (event.key === "Escape" && account.current) { account.current.open = false; account.current.querySelector("summary")?.focus(); } }}><summary aria-label={`Tài khoản ${name}`}><span className="avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><span className="user-name">{name}<small>{admin ? "Quản trị viên" : "Học sinh"}</small></span><Icon name="chevron" className="account-chevron" /></summary><div className="user-dropdown"><div className="dropdown-heading"><p>{name}</p><span className="badge">{admin ? "Quản trị viên" : "Học sinh"}</span></div><Link href="/change-password" onClick={() => { if (account.current) account.current.open = false; }}><Icon name="lock" /> Đổi mật khẩu</Link><form action={logout}><SubmitButton className="dropdown-logout" pendingLabel="Đang đăng xuất…"><Icon name="logout" /> Đăng xuất</SubmitButton></form></div></details>
  </div></header>;
}
