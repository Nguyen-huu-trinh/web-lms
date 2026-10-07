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
export function CourseProgress({ count, total, percent }: { count: number; total: number; percent: number }) {
  return <section className="course-progress" aria-label="Tiến độ học tập"><div className="flex flex-wrap items-center justify-between gap-2"><h2>Tiến độ học tập</h2><strong>{percent}%</strong></div><progress max={100} value={percent} aria-label={`Đã hoàn thành ${count} / ${total} bài`} /><p>{total ? `Đã hoàn thành ${count} / ${total} bài` : "Chưa có bài học"}</p></section>;
}
