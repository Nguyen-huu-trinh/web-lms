import { createLearningReader } from "@/lib/cache/learning";
import { requireUser } from "@/services/auth";
import { findCourse, courseContent, courseProgressSummaries, teacherContext, teacherCourses } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { CourseView } from "@/components/learning/course-view";
export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string | string[] }> }) {
  const { client, profile, sessionId } = await requireUser();
  const read = createLearningReader(profile, sessionId);
  const [{ id: routeId }, query] = await Promise.all([params, searchParams]);
  const id = query.course ?? routeId;
  if (!isUuid(routeId) || typeof id !== "string" || !isUuid(id)) return <AccessDenied />;
  const course = await findCourse(client, id);
  if (!course) return <AccessDenied />;
  const context = await teacherContext(client, course.teacher_id, profile);
  if (!context) return <AccessDenied />;
  const [content, sidebar] = await Promise.all([
    courseContent(client, id, profile.id, course, read),
    teacherCourses(client, course.teacher_id, read, profile).then(async (courses) => ({
      courses,
      progressByCourse: await courseProgressSummaries(client, courses.filter((item) => item.id !== course.id).map((course) => course.id), profile.id),
    })),
  ]);
  if (!content || !context) return <AccessDenied />;
  const { courses, progressByCourse } = sidebar;
  if (content) progressByCourse[content.course.id] = { count: content.count, total: content.total, percent: content.percent };
  return <CourseView navigationBase={`/courses/${routeId}`} {...context} courses={courses} progressByCourse={progressByCourse} content={content} admin={profile.role === "ADMIN"} />;
}
