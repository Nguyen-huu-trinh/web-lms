import "server-only";
import { requireUser } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUsername, studentEmailFromUsername } from "@/lib/auth-validation";
import { provisionStudent } from "./student-provisioning-core";

export class ExistingStudentConfirmation extends Error {
  constructor(public studentId: string, public username: string) { super("Cần xác nhận thêm học sinh hiện có."); }
}
export async function addStudent(usernameInput: unknown, kind: string, targetIds: string[], confirmedStudentId = "") {
  const { client, profile, sessionId } = await requireUser("ADMIN");
  const username = normalizeUsername(usernameInput);
  const ids = [...new Set(targetIds)];
  if (!ids.length || ids.length > 100) throw new Error("Chọn từ 1 đến 100 môn học hoặc giáo viên.");
  if ((kind !== "subject" && kind !== "teacher") || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error("Chọn môn học hoặc giáo viên hợp lệ.");
  const table = kind === "subject" ? "subjects" : "teachers";
  const { data: target, error: targetError } = await client.from(table).select("id").in("id", ids);
  if (targetError || !target || target.length !== ids.length) throw new Error("Môn học/giáo viên không còn tồn tại hoặc không có quyền truy cập.");
  const admin = createAdminClient();
  const { data: existingProfile, error: lookupError } = await admin.from("profiles").select("id,email,role").eq("username", username).maybeSingle();
  if (lookupError) throw new Error("Không thể tra cứu tên đăng nhập.");
  if (existingProfile?.role === "ADMIN") throw new Error("Tên đăng nhập đã được sử dụng bởi quản trị viên.");
  const email = existingProfile?.email ?? studentEmailFromUsername(username);
  const result = await provisionStudent(email, {
    async findAccount(accountEmail) {
      const { data, error } = await admin.rpc("find_student_account", { account_email: accountEmail });
      if (error) throw new Error("Không thể tra cứu tài khoản. Kiểm tra migration và kết nối Supabase.");
      if (data.length) {
        const { data: profiles, error: profileError } = await admin.from("profiles").select("id,username").in("id", data.map((account) => account.id));
        if (profileError || profiles?.some((profile) => profile.username && profile.username !== username)) throw new Error("Tên đăng nhập hoặc email nội bộ đã được sử dụng.");
      }
      return data;
    },
    async confirmExisting(account) {
      if (confirmedStudentId !== account.id) throw new ExistingStudentConfirmation(account.id, username);
    },
    async createAccount(accountEmail, password) {
      const { data, error } = await admin.auth.admin.createUser({ email: accountEmail, password, email_confirm: true });
      if (error || !data.user) throw new Error("Auth account creation failed");
      return data.user.id;
    },
    async grantAccess(student) {
      const { error } = await admin.rpc("grant_student_username_access_batch", {
        student_username: username,
        actor_id: profile.id, actor_session: sessionId, student, target_kind: kind, target_ids: ids,
      });
      if (error) throw error;
    },
  });
  return { ...result, targetCount: ids.length };
}
