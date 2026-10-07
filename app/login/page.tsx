import { LoginForms } from "@/components/login-forms";
import { Icon } from "@/components/ui/icon";
const errors: Record<string, string> = {
  credentials: "Thông tin đăng nhập không hợp lệ hoặc tài khoản chưa được Admin cấp.",
  session: "Tài khoản đã đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại.",
};
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <main className="auth-page"><div className="auth-layout">
    <section className="auth-story"><div className="brand"><span className="brand-icon"><Icon name="book" /></span><span>LMS<span className="brand-caption">Không gian học tập</span></span></div>
      <div className="auth-story-copy"><p className="eyebrow">Học tập có định hướng</p><h2>Mỗi bài học,<br />một bước tiến.</h2><p>Tập trung vào điều bạn muốn học. Kết nối với nội dung, giáo viên và hành trình của riêng bạn.</p></div>
      <div className="learning-path" aria-hidden="true"><div><span><Icon name="book" /></span><p>Khám phá<strong>Môn học & khóa học</strong></p><Icon name="check" /></div><div><span><Icon name="play" /></span><p>Tập trung<strong>Bài giảng & tài liệu</strong></p><Icon name="chevron" /></div><div><span><Icon name="layers" /></span><p>Tiến bộ<strong>Từng bài học, mỗi ngày</strong></p><Icon name="chevron" /></div></div>
      <p className="auth-story-footer">Một không gian. Trọn vẹn hành trình học tập.</p>
    </section>
    <section className="auth-card"><div className="auth-card-heading"><span className="auth-symbol"><Icon name="book" /></span><p className="eyebrow">Chào mừng trở lại</p><h1>Đăng nhập LMS</h1><p>Chọn loại tài khoản để tiếp tục học tập.</p></div>
      {!configured && <p className="form-error" role="alert">Chưa cấu hình Supabase. Điền các biến trong .env.example theo README.md.</p>}
      {error && <p className="form-error" role="alert">{errors[error] ?? "Không thể đăng nhập."}</p>}
      <LoginForms configured={configured} />
    </section>
  </div></main>;
}
