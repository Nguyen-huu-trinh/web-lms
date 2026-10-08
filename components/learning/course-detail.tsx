import "server-only";
import type { CourseContent } from "@/repositories/lms";
import { CourseProgress } from "./shared";
import { StudentCourseDetail } from "./student-course-detail";
import { CurriculumEditor } from "@/components/admin/curriculum-editor";

export function CourseDetail({ content, admin }: { content: CourseContent; admin: boolean }) {
  if (!admin) return <StudentCourseDetail content={content} />;
  return <><div className="section-heading"><p className="eyebrow">Nội dung khóa học</p><h2>{content.course.title}</h2>{content.course.description && <p>{content.course.description}</p>}</div><CourseProgress variant="featured" count={content.count} total={content.total} percent={content.percent} /><CurriculumEditor content={content} /></>;
}
