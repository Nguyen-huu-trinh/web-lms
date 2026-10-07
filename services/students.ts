import "server-only";
import { requireUser } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth-validation";
import { provisionStudent } from "./student-provisioning-core";

export async function addStudent(emailInput: unknown, kind: string, targetId: string) {
  const { client, profile, sessionId } = await requireUser("ADMIN");
  const email = normalizeEmail(emailInput);
  if ((kind !== "subject" && kind !== "teacher") || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) throw new Error("Chọn môn học hoặc giáo viên hợp lệ.");
  const table = kind === "subject" ? "subjects" : "teachers";
  const { data: target, error: targetError } = await client.from(table).select("id").eq("id", targetId).maybeSingle();
  if (targetError || !target) throw new Error("Môn học/giáo viên không còn tồn tại hoặc không có quyền truy cập.");
  const admin = createAdminClient();
  let alreadyGranted = false;
  const result = await provisionStudent(email, {
    async findAccount(accountEmail) {
      const { data, error } = await admin.rpc("find_student_account", { account_email: accountEmail });
      if (error) throw new Error("Không thể tra cứu tài khoản. Kiểm tra migration và kết nối Supabase.");
      return data;
    },
    async createAccount(accountEmail, password) {
      const { data, error } = await admin.auth.admin.createUser({ email: accountEmail, password, email_confirm: true });
      if (error || !data.user) throw new Error("Auth account creation failed");
      return data.user.id;
    },
    async grantAccess(student) {
      const existing = kind === "subject"
        ? await client.from("student_subject_access").select("id").eq("student_id",student).eq("subject_id",targetId).maybeSingle()
        : await client.from("student_teacher_access").select("id").eq("student_id",student).eq("teacher_id",targetId).maybeSingle();
      if(existing.error) throw existing.error;
      alreadyGranted = Boolean(existing.data);
      const { error } = await admin.rpc("grant_student_access", {
        actor_id: profile.id, actor_session: sessionId, student, target_kind: kind, target_id: targetId,
      });
      if (error) throw error;
    },
  });
  return { ...result, alreadyGranted };
}
