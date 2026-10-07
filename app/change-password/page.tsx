import Link from "next/link";
import { requireUser } from "@/services/auth";
import { logout } from "@/app/login/actions";
import { ChangePasswordForm } from "@/components/change-password-form";
import { SessionGuard } from "@/components/session-guard";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/submit-button";
export default async function ChangePasswordPage() {
  const { profile, sessionId } = await requireUser(undefined, true);
  return <main className="auth-page">
    <SessionGuard userId={profile.id} sessionId={sessionId} />
    <section className="auth-card password-card">
      <div className="auth-card-heading"><span className="auth-symbol"><Icon name="lock" /></span><p className="eyebrow">Bảo mật tài khoản</p><h1>Đổi mật khẩu</h1><p>Một mật khẩu riêng để bảo vệ hành trình học tập của bạn.</p></div>
      {profile.must_change_password && <p className="info-note">Bạn cần đổi mật khẩu lần đầu trước khi truy cập nội dung học tập.</p>}
      <ChangePasswordForm />
      <div className="auth-bottom-actions">{!profile.must_change_password && <Link className="text-link" href="/courses">Về môn học</Link>}<form action={logout}><SubmitButton className="button ghost" pendingLabel="Đang đăng xuất…">Đăng xuất</SubmitButton></form></div>
    </section>
  </main>;
}
