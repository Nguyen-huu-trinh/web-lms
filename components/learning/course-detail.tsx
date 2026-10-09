import "server-only";
import type { CourseContent } from "@/repositories/lms";
import { CourseProgress } from "./shared";
import { StudentCourseDetail } from "./student-course-detail";
import { RecordControls } from "@/components/admin/record-controls";
import { CurriculumEditor } from "@/components/admin/curriculum-editor";

export function CourseDetail({ content, admin }: { content: CourseContent; admin: boolean }) {
  if (!admin) return <StudentCourseDetail content={content} />;
  return <><div className="section-heading course-heading-tools"><div><p className="eyebrow">Nội dung khóa học</p><h2>{content.course.title}</h2>{content.course.description && <p>{content.course.description}</p>}</div><RecordControls iconOnly context={{entity:"courses",id:content.course.id,parentId:content.course.teacher_id}} values={{title:content.course.title,description:content.course.description}} /></div><CourseProgress variant="featured" count={content.count} total={content.total} percent={content.percent} /><CurriculumEditor content={content} /></>;
}
