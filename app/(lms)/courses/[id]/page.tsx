import { createLearningReader } from "@/lib/cache/learning";
import { requireUser } from "@/services/auth";
import { createCourseReader, courseProgressSummaries } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { CourseView } from "@/components/learning/course-view";
export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string | string[] }> }) {
  const { client, profile, sessionId } = await requireUser();
  const read = createLearningReader(profile, sessionId);
  const [{ id: routeId }, query] = await Promise.all([params, searchParams]);
  const id = query.course ?? routeId;
  if (!isUuid(routeId) || typeof id !== "string" || !isUuid(id)) return <AccessDenied />;
  const reader = createCourseReader(client, profile, read);
  const course = await reader.course(id);
  if (!course) return <AccessDenied />;
  const content = reader.content(id);
  // Attach a rejection handler immediately; the streamed panel presents errors.
  void content.catch(() => {});
  const [context, sidebar] = await Promise.all([
    reader.teacher(course.teacher_id),
    reader.courses(course.teacher_id).then((courses) => ({
      courses,
      progressByCourse: courseProgressSummaries(client, courses.filter((item) => item.id !== course.id).map((item) => item.id), profile.id).catch(() => null),
    })),
  ]);
  if (!context) return <AccessDenied />;
  const { courses, progressByCourse } = sidebar;
  return <CourseView navigationBase={`/courses/${routeId}`} {...context} courses={courses} initialId={id} progressByCourse={progressByCourse} content={content} admin={profile.role === "ADMIN"} />;
}
