import { requireUser } from "@/services/auth";
import { findCourse, courseContent, courseProgressSummaries, teacherContext, teacherCourses } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { CourseView } from "@/components/learning/course-view";
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { client, profile } = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return <AccessDenied />;
  const course = await findCourse(client, id);
  if (!course) return <AccessDenied />;
  const [content, context, sidebar] = await Promise.all([
    courseContent(client, id, profile.id, course),
    teacherContext(client, course.teacher_id, profile),
    teacherCourses(client, course.teacher_id).then(async (courses) => ({
      courses,
      progressByCourse: await courseProgressSummaries(client, courses.filter((item) => item.id !== course.id).map((course) => course.id), profile.id),
    })),
  ]);
  if (!content || !context) return <AccessDenied />;
  const { courses, progressByCourse } = sidebar;
  if (content) progressByCourse[content.course.id] = { count: content.count, total: content.total, percent: content.percent };
  return <CourseView {...context} courses={courses} progressByCourse={progressByCourse} content={content} admin={profile.role === "ADMIN"} />;
}
