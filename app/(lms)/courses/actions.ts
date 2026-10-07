"use server";
import { LEARNING_CACHE_TAG } from "@/lib/cache/policy";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/services/auth";
import { addStudent, ExistingStudentConfirmation } from "@/services/students";
export type AddStudentState = { error: string; success: string; confirmation?: { studentId: string; username: string } };
export async function addStudentAction(_previous: AddStudentState, form: FormData): Promise<AddStudentState> {
  await requireUser("ADMIN");
  try {
    const result = await addStudent(form.get("username"), String(form.get("kind") ?? ""), form.getAll("target_id").map(String), String(form.get("confirmed_student_id") ?? ""));
    updateTag(LEARNING_CACHE_TAG);
    revalidatePath("/courses", "layout");
    return { error: "", success: result.created ? "Đã tạo học sinh và cấp quyền cho các mục đã chọn. Mật khẩu mặc định: 123456; học sinh phải đổi ở lần đăng nhập đầu tiên." : "Đã cấp quyền cho học sinh hiện có. Mật khẩu và tiến độ được giữ nguyên; quyền đã có không bị tạo trùng." };
  } catch (error) {
    if (error instanceof ExistingStudentConfirmation) return { error: "", success: "", confirmation: { studentId: error.studentId, username: error.username } };
    return { error: error instanceof Error ? error.message : "Không thể thêm học sinh. Vui lòng thử lại.", success: "" };
  }
}
