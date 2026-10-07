import { NextLessonButton } from "./next-lesson-button";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="empty-state"><span className="empty-symbol"><Icon name="book" /></span><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}
export function AccessDenied() {
  return <div className="surface"><EmptyState title="Bạn chưa được cấp quyền truy cập nội dung này." description="Nội dung có thể không còn tồn tại. Vui lòng liên hệ quản trị viên để được hỗ trợ." /><div className="px-6 pb-6"><Link href="/courses" className="button secondary">Về môn học</Link></div></div>;
}
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Đường dẫn" className="breadcrumb"><ol>{items.map((item, i) => <li key={i}>{i > 0 && <span aria-hidden="true">/</span>}{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}
export function CourseProgress({ count, total, percent, nextLesson, variant = "default" }: { count: number; total: number; percent: number; nextLesson?: { id: string; title: string }; variant?: "default" | "featured" }) {
  if (variant === "featured") return <section className="course-progress course-progress-featured" aria-label="Tiến độ học tập"><div className="progress-heading"><span className="progress-symbol"><Icon name={total > 0 && count === total ? "check" : "graduation"} /></span><div><h2>Hành trình học tập</h2><p>{!total ? "Khóa học chưa có bài học" : count === total ? "Bạn đã hoàn thành khóa học!" : count ? "Tiếp tục chinh phục bài học tiếp theo" : "Bắt đầu với bài học đầu tiên"}</p></div><strong className="progress-percent">{percent}<span>%</span></strong></div><progress max={100} value={percent} aria-label={`Đã hoàn thành ${count} / ${total} bài`} /><div className="progress-stats"><span><b>{count}</b> / {total} bài hoàn thành</span><span>{total > 0 && count === total ? "Hoàn tất" : `${Math.max(0, total - count)} bài còn lại`}</span></div>{nextLesson && <NextLessonButton lessonId={nextLesson.id} />}</section>;
  return <section className="course-progress" aria-label="Tiến độ học tập"><div className="flex flex-wrap items-center justify-between gap-2"><h2>Tiến độ học tập</h2><strong>{percent}%</strong></div><progress max={100} value={percent} aria-label={`Đã hoàn thành ${count} / ${total} bài`} /><p>{total ? `Đã hoàn thành ${count} / ${total} bài` : "Chưa có bài học"}</p></section>;
}
