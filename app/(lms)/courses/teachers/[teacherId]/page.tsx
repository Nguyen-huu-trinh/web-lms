import { createLearningReader } from "@/lib/cache/learning";
import { requireUser } from "@/services/auth";
import { courseContent, courseProgressSummaries, teacherContext, teacherCourses } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { CourseView } from "@/components/learning/course-view";
export default async function TeacherPage({ params, searchParams }: { params: Promise<{ teacherId: string }>; searchParams: Promise<{ course?: string | string[] }> }) {
  const { client, profile, sessionId } = await requireUser();
  const read = createLearningReader(profile, sessionId);
  const [{ teacherId }, query] = await Promise.all([params, searchParams]);
  if (query.course !== undefined && (typeof query.course !== "string" || !isUuid(query.course))) return <AccessDenied />;
  if (!isUuid(teacherId)) return <AccessDenied />;
  const context = await teacherContext(client, teacherId, profile);
  if (!context) return <AccessDenied />;
  const courses = await teacherCourses(client, teacherId, read, profile);
  const selected = query.course ? courses.find((course) => course.id === query.course) : courses[0];
  if (query.course && !selected) return <AccessDenied />;
  const [content, progressByCourse] = await Promise.all([
    selected ? courseContent(client, selected.id, profile.id, selected, read) : Promise.resolve(null),
    courseProgressSummaries(client, courses.filter((course) => course.id !== selected?.id).map((course) => course.id), profile.id),
  ]);
  if (content) progressByCourse[content.course.id] = { count: content.count, total: content.total, percent: content.percent };
  return <CourseView navigationBase={`/courses/teachers/${teacherId}`} {...context} courses={courses} progressByCourse={progressByCourse} content={content} admin={profile.role === "ADMIN"} />;
}
