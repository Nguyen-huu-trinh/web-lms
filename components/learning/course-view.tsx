import styles from "./catalog.module.css";
import { PageHeading } from "@/components/ui/page-heading";
import type { Course, Subject, Teacher } from "@/types/database";
import type { CourseContent } from "@/repositories/lms";
import { EmptyState } from "./shared";
import { RecordControls } from "@/components/admin/record-controls";
import { CourseDetail } from "./course-detail";
import { CourseBrowser } from "./course-browser";

export function CourseView({ subject, teacher, courses, content, progressByCourse, navigationBase, admin = false }: { subject: Subject; teacher: Teacher; courses: Course[]; progressByCourse: Record<string, { count: number; total: number; percent: number }>; content: CourseContent | null; navigationBase: string; admin?: boolean }) {
  return <main className={styles.catalog + " space-y-6"}>
    <header className={styles.courseHeader}><PageHeading eyebrow={subject.name} title={teacher.name} description={teacher.bio} icon="graduation"><span className="badge">{courses.length} khóa học</span>{admin && <RecordControls context={{entity:"courses",parentId:teacher.id}} />}</PageHeading></header>
    <CourseBrowser key={crypto.randomUUID()} teacherId={teacher.id} courses={courses} navigationBase={navigationBase} initialId={content?.course.id ?? null} initialPanel={content ? <CourseDetail content={content} admin={admin} /> : <EmptyState title="Giáo viên này chưa có khóa học." />} progressByCourse={progressByCourse} controls={admin ? Object.fromEntries(courses.map((course) => [course.id, <RecordControls key={course.id} iconOnly context={{entity:"courses",id:course.id,parentId:teacher.id}} values={{title:course.title,description:course.description}} />])) : {}} />
  </main>;
}
