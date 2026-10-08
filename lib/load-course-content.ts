import type { CourseContent } from "@/repositories/lms";

export async function loadCourseContent(teacherId: string, courseId: string): Promise<CourseContent> {
  const response = await fetch("/courses/panel?" + new URLSearchParams({ teacher: teacherId, course: courseId }), {
    cache: "no-store", credentials: "same-origin",
  });
  if (response.redirected || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Phiên đăng nhập đã thay đổi. Vui lòng tải lại trang.");
  }
  const result = await response.json();
  if (!response.ok || !result.content) throw new Error(result.error ?? "Không thể tải khóa học.");
  return result.content;
}
