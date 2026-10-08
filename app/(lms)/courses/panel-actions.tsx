"use server";
import { requireUser } from "@/services/auth";
import { createLearningReader } from "@/lib/cache/learning";
import { isUuid } from "@/lib/learning";
import { createCourseReader } from "@/repositories/lms";
import { CourseDetail } from "@/components/learning/course-detail";

// Read only: return one server-rendered panel, including server-bound Admin controls.
export async function loadCoursePanel(teacherId: string, courseId: string) {
  const { client, profile, sessionId } = await requireUser();
  if (!isUuid(teacherId) || !isUuid(courseId)) return { ok: false as const, error: "Khóa học không hợp lệ." };
  try {
    const reader = createCourseReader(client, profile, createLearningReader(profile, sessionId));
    const [course, context] = await Promise.all([reader.course(courseId), reader.teacher(teacherId)]);
    if (!course || course.teacher_id !== teacherId) return { ok: false as const, error: "Khóa học không còn khả dụng hoặc bạn chưa được cấp quyền." };
    if (!context) return { ok: false as const, error: "Bạn chưa được cấp quyền vào khóa học này." };
    const content = await reader.content(courseId);
    if (!content) return { ok: false as const, error: "Khóa học không còn khả dụng." };
    return { ok: true as const, panel: <CourseDetail content={content} admin={profile.role === "ADMIN"} />, summary: { count: content.count, total: content.total, percent: content.percent } };
  } catch {
    return { ok: false as const, error: "Không thể tải khóa học. Vui lòng thử lại." };
  }
}
