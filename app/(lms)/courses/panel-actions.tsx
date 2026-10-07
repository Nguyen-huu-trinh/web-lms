"use server";
import { requireUser } from "@/services/auth";
import { createLearningReader } from "@/lib/cache/learning";
import { isUuid } from "@/lib/learning";
import { findCourse, courseContent, teacherContext } from "@/repositories/lms";
import { CourseDetail } from "@/components/learning/course-detail";

// Read only: return one server-rendered panel, including server-bound Admin controls.
export async function loadCoursePanel(teacherId: string, courseId: string) {
  const { client, profile, sessionId } = await requireUser();
  if (!isUuid(teacherId) || !isUuid(courseId)) return { ok: false as const, error: "Khóa học không hợp lệ." };
  try {
    const course = await findCourse(client, courseId);
    if (!course || course.teacher_id !== teacherId) return { ok: false as const, error: "Khóa học không còn khả dụng hoặc bạn chưa được cấp quyền." };
    const context = await teacherContext(client, teacherId, profile);
    if (!context) return { ok: false as const, error: "Bạn chưa được cấp quyền vào khóa học này." };
    const content = await courseContent(client, courseId, profile.id, course, createLearningReader(profile, sessionId));
    if (!content) return { ok: false as const, error: "Khóa học không còn khả dụng." };
    return { ok: true as const, panel: <CourseDetail content={content} admin={profile.role === "ADMIN"} />, summary: { count: content.count, total: content.total, percent: content.percent } };
  } catch {
    return { ok: false as const, error: "Không thể tải khóa học. Vui lòng thử lại." };
  }
}
