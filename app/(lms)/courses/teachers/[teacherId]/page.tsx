import { redirect } from "next/navigation";
import { createLearningReader } from "@/lib/cache/learning";
import { requireUser } from "@/services/auth";
import { createCourseReader, courseProgressSummaries } from "@/repositories/lms";
import { allRows } from "@/repositories/pagination";
import { isUuid } from "@/lib/learning";
import { DeniedDialog } from "@/components/learning/denied-dialog";
import { EmptyState } from "@/components/learning/shared";
import { NavigationLink as Link } from "@/components/ui/navigation-link";
import { Icon } from "@/components/ui/icon";
import { RecordControls } from "@/components/admin/record-controls";
import styles from "@/components/learning/teacher-profile.module.css";

export default async function TeacherPage({ params, searchParams }: { params: Promise<{ teacherId: string }>; searchParams: Promise<{ course?: string | string[] }> }) {
  const { client, profile, sessionId } = await requireUser();
  const read = createLearningReader(profile, sessionId);
  const [{ teacherId }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(teacherId) || (query.course !== undefined && (typeof query.course !== "string" || !isUuid(query.course)))) return <DeniedDialog />;
  const reader = createCourseReader(client, profile, read);
  const context = await reader.teacher(teacherId);
  if (!context) return <DeniedDialog />;
  const courses = await reader.courses(teacherId);
  // Keep old deep links working while course content now has its own page.
  if (query.course) {
    const selected = courses.find((course) => course.id === query.course);
    if (!selected) return <DeniedDialog />;
    redirect(`/courses/${selected.id}`);
  }
  const { subject, teacher } = context;
  const admin = profile.role === "ADMIN";
  const [grades, progress] = await Promise.all([
    allRows((a,b) => client.from("grades").select("*").order("order_index").order("name").order("code").range(a,b)),
    admin ? Promise.resolve(null) : courseProgressSummaries(client, courses.map((course) => course.id), profile.id).catch(() => null),
  ]);
  const back = "/courses?" + new URLSearchParams({grade: subject.grade, subject: subject.id, filter: "all"});
  return <main className={styles.page}>
    <nav className={styles.grades} aria-label="Chọn khối">{grades.map((grade) => <Link key={grade.code} href={"/courses?" + new URLSearchParams({grade:grade.code,filter:"all"})} aria-current={grade.code === subject.grade ? "page" : undefined}>{grade.name}</Link>)}</nav>
    <nav className={styles.breadcrumb} aria-label="Đường dẫn"><Link href={back}><Icon name="arrow" />Quay lại DS môn</Link><Icon name="chevron" /><strong>{teacher.name}</strong></nav>
    <div className={styles.layout}>
      <aside className={styles.profile}>
        <div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{teacher.name.trim().slice(0,1).toUpperCase()}</span><div className={styles.profileCopy}><div className={styles.titleRow}><h1>{teacher.name}</h1>{admin && <RecordControls iconOnly context={{entity:"teachers",id:teacher.id,parentId:subject.id}} values={{name:teacher.name,bio:teacher.bio,status:teacher.status}} />}</div>{teacher.bio && <p className={styles.bio}>{teacher.bio}</p>}</div></div>
        <div className={styles.status}><strong><Icon name="check" />Trạng thái lộ trình</strong><p>{teacher.status?.trim() || "Chưa có thông tin cập nhật."}</p></div>
        <Link className={styles.switch} href={back}>Đổi sang thầy cô khác</Link>
      </aside>
      <section className={styles.list} aria-label="Danh sách khóa học">
        <div className={styles.listHeader}><h2>Lộ trình {teacher.name}</h2>{admin && <RecordControls iconOnly context={{entity:"courses",parentId:teacher.id}} />}</div>
        {!courses.length && <EmptyState title="Giáo viên chưa có khóa học." />}
        <ul className={styles.courses}>{courses.map((course,index) => {
          const summary = progress?.[course.id];
          const started = Boolean(summary && summary.count > 0 && summary.percent < 100);
          return <li key={course.id} className={styles.course} data-started={started}>
            <Link className={styles.courseLink} href={`/courses/${course.id}`}><span className={styles.number}>{String(index + 1).padStart(2,"0")}</span><div className={styles.copy}><h3>{course.title}</h3>{course.description && <p>{course.description}</p>}{summary && summary.total > 0 && <p>{summary.count}/{summary.total} bài hoàn thành · {summary.percent}%</p>}</div></Link><div className={styles.courseActions}><Link href={`/courses/${course.id}`} className={styles.cta}>{summary?.percent === 100 ? "Ôn lại khóa học" : started ? "Tiếp tục học" : "Vào học"}<Icon name="arrow" /></Link>
            {admin && <RecordControls iconOnly context={{entity:"courses",id:course.id,parentId:teacher.id}} values={{title:course.title,description:course.description}} />}
            </div>
          </li>;
        })}</ul>
      </section>
    </div>
  </main>;
}
