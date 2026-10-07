import { login } from "@/app/login/actions";
import { SubmitButton } from "./ui/submit-button";
import { Icon } from "./ui/icon";

export function LoginForms({ configured }: { configured: boolean }) {
  return <form action={login} className="auth-form">
    <label>Tên đăng nhập<input name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_]{3,50}" placeholder="Nhập tên đăng nhập" /></label>
    <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required maxLength={1024} placeholder="Nhập mật khẩu" /></label>
    <SubmitButton disabled={!configured} pendingLabel="Đang đăng nhập…">Đăng nhập <Icon name="arrow" /></SubmitButton>
  </form>;
}
