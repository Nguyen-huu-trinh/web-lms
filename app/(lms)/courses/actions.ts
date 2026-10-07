"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth";
import { addStudent } from "@/services/students";
export async function addStudentAction(_previous: { error: string; success: string }, form: FormData) {
  // Outside catch: unauthorized requests must preserve redirect/authorization behavior.
  await requireUser("ADMIN");
  try {
    const result = await addStudent(form.get("username"), String(form.get("kind") ?? ""), String(form.get("target_id") ?? ""));
    revalidatePath("/courses", "layout");
    if (result.alreadyGranted) return { error:"", success: `Học sinh đã được cấp quyền ${form.get("kind") === "subject" ? "môn học" : "giáo viên"} này.` };
    return { error: "", success: result.created ? "Đã tạo học sinh và cấp quyền. Mật khẩu mặc định: 123456; học sinh phải đổi ở lần đăng nhập đầu tiên." : "Đã cấp quyền cho học sinh hiện có. Mật khẩu được giữ nguyên." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể thêm học sinh. Vui lòng thử lại.", success: "" };
  }
}
