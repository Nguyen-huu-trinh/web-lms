import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import type { Course, Subject, Teacher } from "@/types/database";
import type { CourseContent } from "@/repositories/lms";
import { Breadcrumb, CourseProgress, EmptyState } from "./shared";
import { ChapterList } from "./chapter-list";
import { RecordControls } from "@/components/admin/record-controls";
import { CurriculumEditor } from "@/components/admin/curriculum-editor";
export function CourseView({ subject, teacher, courses, content, admin = false }: { subject: Subject; teacher: Teacher; courses: Course[]; content: CourseContent | null; admin?: boolean }) {
  return <main className="space-y-6">
    <Breadcrumb items={[{label:"Courses",href:"/courses"},{label:subject.name,href:`/courses?subject=${subject.id}`},{label:teacher.name}]} />
    <PageHeading eyebrow={subject.name} title={teacher.name} description={teacher.bio} icon="graduation"><span className="badge">{courses.length} khóa học</span>{admin && <RecordControls context={{entity:"courses",parentId:teacher.id}} />}</PageHeading>
    <div className="split-layout surface"><aside className="list-sidebar"><h2 className="section-label">Khóa học</h2><nav aria-label="Khóa học của giáo viên">{courses.map((course,index) => <div key={course.id}><Link className={content?.course.id === course.id ? "selection-item active" : "selection-item"} aria-current={content?.course.id === course.id ? "page" : undefined} href={`/courses/${course.id}`}><span className="item-index">{String(index+1).padStart(2,"0")}</span><span>{course.title}</span></Link>{admin && <RecordControls context={{entity:"courses",id:course.id,parentId:teacher.id}} values={{title:course.title,description:course.description}} />}</div>)}</nav></aside>
    <section className="detail-panel">{content ? <><div className="section-heading"><p className="eyebrow">Nội dung khóa học</p><h2>{content.course.title}</h2>{content.course.description && <p>{content.course.description}</p>}</div><CourseProgress count={content.count} total={content.total} percent={content.percent} />{admin ? <CurriculumEditor content={content} /> : <ChapterList chapters={content.chapters} lessons={content.lessons} completed={content.completed} />}</> : <EmptyState title="Giáo viên này chưa có khóa học." />}</section></div>
  </main>;
}
