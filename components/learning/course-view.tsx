import styles from "./catalog.module.css";
import { PageHeading } from "@/components/ui/page-heading";
import type { Course, Subject, Teacher } from "@/types/database";
import type { CourseContent } from "@/repositories/lms";
import { AccessDenied, EmptyState } from "./shared";
import { RecordControls } from "@/components/admin/record-controls";
import { CourseDetail } from "./course-detail";
import { CourseBrowser } from "./course-browser";

export function CourseView({ subject, teacher, courses, content, initialId, progressByCourse, navigationBase, admin = false }: { subject: Subject; teacher: Teacher; courses: Course[]; progressByCourse: Promise<Record<string, { count: number; total: number; percent: number }> | null>; content: Promise<CourseContent | null>; initialId: string | null; navigationBase: string; admin?: boolean }) {
  const initialProgressPromise = content.then((value) => value ? { count: value.count, total: value.total, percent: value.percent } : null).catch(() => null);
  return <main className={styles.catalog + " space-y-6"}>
    <header className={styles.courseHeader}><PageHeading eyebrow={subject.name} title={teacher.name} description={teacher.bio} icon="graduation"><span className="badge">{courses.length} khóa học</span>{admin && <RecordControls context={{entity:"courses",parentId:teacher.id}} />}</PageHeading></header>
    <CourseBrowser admin={admin} key={crypto.randomUUID()} teacherId={teacher.id} courses={courses} navigationBase={navigationBase} initialId={initialId} initialPanel={initialId ? <InitialCourseDetail content={content} admin={admin} /> : <EmptyState title="Giáo viên này chưa có khóa học." />} progressByCourse={progressByCourse} initialProgressPromise={initialProgressPromise} controls={admin ? Object.fromEntries(courses.map((course) => [course.id, <RecordControls key={course.id} iconOnly context={{entity:"courses",id:course.id,parentId:teacher.id}} values={{title:course.title,description:course.description}} />])) : {}} />
  </main>;
}

async function InitialCourseDetail({ content, admin }: { content: Promise<CourseContent | null>; admin: boolean }) {
  let value: CourseContent | null;
  try { value = await content; }
  catch { return <p role="alert">Không thể tải nội dung khóa học. Vui lòng tải lại trang.</p>; }
  return value ? <CourseDetail content={value} admin={admin} /> : <AccessDenied />;
}
