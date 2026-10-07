"use client";
import { useActionState } from "react";
import { changePassword } from "@/app/change-password/actions";
export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, { error: "" });
  return <form action={action} className="auth-form">
    <label className="block">Mật khẩu hiện tại<input required type="password" name="current_password" autoComplete="current-password" maxLength={1024} disabled={pending} /></label>
    <label className="block">Mật khẩu mới<input required type="password" name="password" autoComplete="new-password" minLength={6} maxLength={1024} disabled={pending} /></label>
    <label className="block">Nhập lại mật khẩu mới<input required type="password" name="confirm_password" autoComplete="new-password" minLength={6} maxLength={1024} disabled={pending} /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button disabled={pending} className="button" aria-busy={pending}>{pending ? "Đang xử lý…" : "Đổi mật khẩu"}</button>
  </form>;
}
