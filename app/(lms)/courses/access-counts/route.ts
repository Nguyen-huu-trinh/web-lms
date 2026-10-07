import { requireUser } from "@/services/auth";
import { catalogAccessCounts } from "@/repositories/catalog-access";
import { allRows } from "@/repositories/pagination";
import { isUuid } from "@/lib/learning";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const { client, profile } = await requireUser();
  if (profile.role !== "ADMIN") return Response.json({ error: "Không có quyền thực hiện." }, { status: 403, headers });
  const subjectId = new URL(request.url).searchParams.get("subject") ?? "";
  if (!isUuid(subjectId)) return Response.json({ error: "Môn học không hợp lệ." }, { status: 400, headers });
  try {
    const teachers = await allRows((a, b) => client.from("teachers").select("id").eq("subject_id", subjectId).order("id").range(a, b));
    const counts = await catalogAccessCounts(client, subjectId, teachers.map((teacher) => teacher.id));
    return Response.json({ subject: counts.subject, teachers: Object.fromEntries(counts.teachers) }, { headers });
  } catch {
    return Response.json({ error: "Không thể tải số lượng học sinh." }, { status: 500, headers });
  }
}
