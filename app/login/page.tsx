import styles from "./login.module.css";
import { LoginForms } from "@/components/login-forms";
import { Icon } from "@/components/ui/icon";
const errors: Record<string, string> = {
  trial: "Tài khoản học thử đã hết hạn 30 phút. Vui lòng liên hệ Admin để được cấp tài khoản mới.",
  credentials: "Thông tin đăng nhập không hợp lệ hoặc tài khoản chưa được Admin cấp.",
  session: "Tài khoản đã đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại.",
};
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <main className={styles.page}><section className={`auth-card ${styles.card}`} aria-labelledby="login-title"><div className="auth-card-heading"><span className="auth-symbol"><Icon name="book" /></span><h1 id="login-title">Đăng nhập KhoBai</h1></div>
      {!configured && <p className="form-error" role="alert">Chưa cấu hình Supabase. Điền các biến trong .env.example theo README.md.</p>}
      {error && <p className="form-error" role="alert">{errors[error] ?? "Không thể đăng nhập."}</p>}
      <LoginForms configured={configured} />
    </section>
  </main>;
}
