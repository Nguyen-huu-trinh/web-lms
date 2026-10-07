"use client";
import { useRef, useState } from "react";
import { adminLogin, studentLogin } from "@/app/login/actions";
import { SubmitButton } from "./ui/submit-button";
import { Icon } from "./ui/icon";
export function LoginForms({ configured }: { configured: boolean }) {
  const [role, setRole] = useState<"student" | "admin">("student");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return <><div className="auth-tabs" role="tablist" aria-label="Loại tài khoản">{(["student", "admin"] as const).map((value, index) => <button key={value} ref={(el) => { tabs.current[index] = el; }} id={`login-${value}`} type="button" role="tab" aria-selected={role === value} aria-controls={`form-${value}`} tabIndex={role === value ? 0 : -1} onClick={() => setRole(value)} onKeyDown={(event) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index; setRole(next ? "admin" : "student"); tabs.current[next]?.focus(); }
  }}>{value === "student" ? "Học sinh" : "Quản trị viên"}</button>)}</div>
    <div role="tabpanel" id={`form-${role}`} aria-labelledby={`login-${role}`} key={role}>
      <form action={role === "student" ? studentLogin : adminLogin} className="auth-form">
        <label>{role === "student" ? "Địa chỉ email" : "Username quản trị viên"}<input name={role === "student" ? "email" : "username"} type={role === "student" ? "email" : "text"} autoComplete="username" required maxLength={role === "student" ? 254 : 50} placeholder={role === "student" ? "ban@example.com" : "Nhập username của bạn"} aria-describedby={role === "admin" ? "admin-login-help" : undefined} /></label>
        {role === "admin" && <p className="field-hint" id="admin-login-help">Dùng username được cấp cho Admin, không dùng địa chỉ email.</p>}
        <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required maxLength={1024} placeholder="Nhập mật khẩu" /></label>
        <SubmitButton disabled={!configured} pendingLabel="Đang đăng nhập…">Đăng nhập <Icon name="arrow" /></SubmitButton>
      </form>
    </div><p className="auth-footnote"><Icon name="lock" /> Tài khoản được cấp bởi quản trị viên.</p></>;
}
