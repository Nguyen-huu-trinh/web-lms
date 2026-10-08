import { requireUser } from "@/services/auth";
import { createLearningReader } from "@/lib/cache/learning";
import { isUuid } from "@/lib/learning";
import { createCourseReader } from "@/repositories/lms";

export async function GET(request: Request) {
  const started = performance.now();
  const query = new URL(request.url).searchParams;
  const teacherId = query.get("teacher");
  const courseId = query.get("course");
  const headers = { "Cache-Control": "private, no-store" };
  if (!teacherId || !courseId || !isUuid(teacherId) || !isUuid(courseId)) {
    return Response.json({ error: "Khóa học không hợp lệ." }, { status: 400, headers });
  }
  // Keep redirects outside the catch: expired sessions must still go to login.
  const { client, profile, sessionId } = await requireUser();
  const authorized = performance.now();
  try {
    const reader = createCourseReader(client, profile, createLearningReader(profile, sessionId));
    const content = await reader.panel(teacherId, courseId);
    if (!content) return Response.json({ error: "Khóa học không còn khả dụng hoặc bạn chưa được cấp quyền." }, { status: 404, headers });
    return Response.json({ content }, { headers: { ...headers, "Server-Timing": "auth;dur=" + (authorized - started).toFixed(1) + ", course;dur=" + (performance.now() - authorized).toFixed(1) } });
  } catch {
    return Response.json({ error: "Không thể tải khóa học. Vui lòng thử lại." }, { status: 500, headers });
  }
}
