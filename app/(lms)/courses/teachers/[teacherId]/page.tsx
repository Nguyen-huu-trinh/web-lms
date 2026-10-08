import { createLearningReader } from "@/lib/cache/learning";
import { requireUser } from "@/services/auth";
import { createCourseReader, courseProgressSummaries } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { CourseView } from "@/components/learning/course-view";
export default async function TeacherPage({ params, searchParams }: { params: Promise<{ teacherId: string }>; searchParams: Promise<{ course?: string | string[] }> }) {
  const { client, profile, sessionId } = await requireUser();
  const read = createLearningReader(profile, sessionId);
  const [{ teacherId }, query] = await Promise.all([params, searchParams]);
  if (query.course !== undefined && (typeof query.course !== "string" || !isUuid(query.course))) return <AccessDenied />;
  if (!isUuid(teacherId)) return <AccessDenied />;
  const reader = createCourseReader(client, profile, read);
  const [context, courses] = await Promise.all([reader.teacher(teacherId), reader.courses(teacherId)]);
  if (!context) return <AccessDenied />;
  const selected = query.course ? courses.find((course) => course.id === query.course) : courses[0];
  if (query.course && !selected) return <AccessDenied />;
  // Start optional sidebar data now, but never hold the main view for it.
  const progressByCourse = courseProgressSummaries(client, courses.filter((course) => course.id !== selected?.id).map((course) => course.id), profile.id).catch(() => null);
  const content = selected ? reader.content(selected.id) : Promise.resolve(null);
  return <CourseView navigationBase={`/courses/teachers/${teacherId}`} {...context} courses={courses} initialId={selected?.id ?? null} progressByCourse={progressByCourse} content={content} admin={profile.role === "ADMIN"} />;
}
