import { nextIncompleteLesson } from "@/lib/learning";
import styles from "./catalog.module.css";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import type { Course, Subject, Teacher } from "@/types/database";
import type { CourseContent } from "@/repositories/lms";
import { CourseProgress, EmptyState } from "./shared";
import { ChapterList } from "./chapter-list";
import { RecordControls } from "@/components/admin/record-controls";
import { CurriculumEditor } from "@/components/admin/curriculum-editor";
export function CourseView({ subject, teacher, courses, content, progressByCourse, admin = false }: { subject: Subject; teacher: Teacher; courses: Course[]; progressByCourse: Record<string, { count: number; total: number; percent: number }>; content: CourseContent | null; admin?: boolean }) {
  const nextLesson = content && !admin ? nextIncompleteLesson(content.chapters, content.lessons, content.completed) : undefined;
  return <main className={`${styles.catalog} space-y-6`}>
    <header className={styles.courseHeader}>
    <PageHeading eyebrow={subject.name} title={teacher.name} description={teacher.bio} icon="graduation"><span className="badge">{courses.length} khóa học</span>{admin && <RecordControls context={{entity:"courses",parentId:teacher.id}} />}</PageHeading>
    </header>
    <div className="split-layout surface"><aside className="list-sidebar"><div className="sidebar-heading"><Icon name="layers" /><h2 className="section-label">Khóa học</h2></div><nav aria-label="Khóa học của giáo viên">{courses.map((course) => { const progress = progressByCourse[course.id]; return <div key={course.id} className={styles.courseCard} data-active={content?.course.id === course.id}><Link className={styles.courseLink} aria-current={content?.course.id === course.id ? "page" : undefined} href={`/courses/${course.id}`}><span className={styles.courseName}><Icon name="book" /><strong>{course.title}</strong><Icon name="chevron" /></span>{progress && <span className={styles.cardProgress}><span><span>{progress.total ? `${progress.count}/${progress.total} bài hoàn thành` : "Chưa có bài học"}</span><strong>{progress.percent}%</strong></span><progress max={100} value={progress.percent} aria-label={`Tiến độ ${course.title}: ${progress.percent}%`} /></span>}</Link>{admin && <footer className={styles.cardFooter}><RecordControls iconOnly context={{entity:"courses",id:course.id,parentId:teacher.id}} values={{title:course.title,description:course.description}} /></footer>}</div>; })}</nav></aside>
    <section className="detail-panel">{content ? <><div className="section-heading"><p className="eyebrow">Nội dung khóa học</p><h2>{content.course.title}</h2>{content.course.description && <p>{content.course.description}</p>}</div><CourseProgress nextLesson={nextLesson} variant="featured" count={content.count} total={content.total} percent={content.percent} />{admin ? <CurriculumEditor content={content} /> : <ChapterList nextLesson={nextLesson?.id} chapters={content.chapters} lessons={content.lessons} completed={content.completed} />}</> : <EmptyState title="Giáo viên này chưa có khóa học." />}</section></div>
  </main>;
}
