import { requireUser } from "@/services/auth";
import { courseContent, teacherContext, teacherCourses } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { CourseView } from "@/components/learning/course-view";
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { client, profile } = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return <AccessDenied />;
  const content = await courseContent(client, id, profile.id);
  if (!content) return <AccessDenied />;
  const context = await teacherContext(client, content.course.teacher_id, profile);
  if (!context) return <AccessDenied />;
  const courses = await teacherCourses(client, context.teacher.id);
  return <CourseView {...context} courses={courses} content={content} admin={profile.role === "ADMIN"} />;
}
