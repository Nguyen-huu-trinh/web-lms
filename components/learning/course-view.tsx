import { CourseContentSkeleton } from "./loading-skeleton";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/ui/navigation-link";
import { Icon } from "@/components/ui/icon";
import styles from "./catalog.module.css";
import navigation from "./teacher-profile.module.css";
import type { Course, Grade, Subject, Teacher } from "@/types/database";
import type { CourseContent } from "@/repositories/lms";
import { DeniedDialog } from "./denied-dialog";
import { CourseDetail } from "./course-detail";

export function CourseView({ subject, teacher, course, grades, content, admin = false }: { subject: Subject; teacher: Teacher; course: Course; grades: Grade[]; content: Promise<CourseContent | null>; admin?: boolean }) {
  const back = "/courses?" + new URLSearchParams({grade: subject.grade, subject: subject.id, filter:"all"});
  return <main className={`${styles.catalog} ${styles.coursePage} ${styles.singleCourse}`}>
    <nav className={navigation.grades} aria-label="Chọn khối">{grades.map((grade) => <Link key={grade.code} href={"/courses?" + new URLSearchParams({grade:grade.code,filter:"all"})} aria-current={grade.code === subject.grade ? "page" : undefined}>{grade.name}</Link>)}</nav>
    <div className={styles.courseContainer}>
    <nav className={navigation.breadcrumb} aria-label="Đường dẫn">
      <Link prefetch={true} href={back}><Icon name="arrow" />Quay lại DS môn</Link><Icon name="chevron" />
      <Link href={`/courses/teachers/${teacher.id}`}>{teacher.name}</Link><Icon name="chevron" />
      <strong aria-current="page">{course.title}</strong>
    </nav>
    <section className={`detail-panel ${styles.fullCourseContent}`} aria-label="Nội dung khóa học">
      <Suspense key={course.id} fallback={<div role="status" aria-label="Đang tải nội dung khóa học" aria-busy="true"><span className="sr-only">Đang tải nội dung khóa học…</span><CourseContentSkeleton compact /></div>}><InitialCourseDetail content={content} admin={admin} /></Suspense>
    </section>
    </div>
  </main>;
}

async function InitialCourseDetail({ content, admin }: { content: Promise<CourseContent | null>; admin: boolean }) {
  let value: CourseContent | null;
  try { value = await content; }
  catch { return <p role="alert">Không thể tải nội dung khóa học. Vui lòng tải lại trang.</p>; }
  return value ? <CourseDetail content={value} admin={admin} /> : <DeniedDialog />;
}
