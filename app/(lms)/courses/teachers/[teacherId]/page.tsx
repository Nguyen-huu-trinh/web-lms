import { requireUser } from "@/services/auth";
import { courseContent, courseProgressSummaries, teacherContext, teacherCourses } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { CourseView } from "@/components/learning/course-view";
export default async function TeacherPage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { client, profile } = await requireUser();
  const { teacherId } = await params;
  if (!isUuid(teacherId)) return <AccessDenied />;
  const context = await teacherContext(client, teacherId, profile);
  if (!context) return <AccessDenied />;
  const courses = await teacherCourses(client, teacherId);
  const content = courses.length ? await courseContent(client, courses[0].id, profile.id, courses[0]) : null;
  const progressByCourse = await courseProgressSummaries(client, courses.filter((course) => course.id !== content?.course.id).map((course) => course.id), profile.id);
  if (content) progressByCourse[content.course.id] = { count: content.count, total: content.total, percent: content.percent };
  return <CourseView {...context} courses={courses} progressByCourse={progressByCourse} content={content} admin={profile.role === "ADMIN"} />;
}
