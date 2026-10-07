import { requireUser } from "@/services/auth";
import { studentAccessList } from "@/repositories/catalog-access";
import { isUuid } from "@/lib/learning";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const { client, profile } = await requireUser();
  if (profile.role !== "ADMIN") return Response.json({ error: "Không có quyền thực hiện." }, { status: 403, headers });
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const targetId = params.get("targetId") ?? "";
  const page = Number(params.get("page") ?? "0");
  const search = params.get("q") ?? "";
  if (!Number.isSafeInteger(page) || page < 0 || page > 100000 || search.length > 200) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400, headers });
  if ((kind !== "subject" && kind !== "teacher") || !isUuid(targetId)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400, headers });
  }
  try {
    return Response.json(await studentAccessList(client, kind, targetId, page, search), { headers });
  } catch {
    return Response.json({ error: "Không thể tải danh sách học sinh. Vui lòng thử lại." }, { status: 500, headers });
  }
}
