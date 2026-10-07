"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth";
import { isUuid } from "@/lib/learning";
export async function completeLesson(_previous: { error: string; completed: boolean }, form: FormData) {
  const { client, profile } = await requireUser("STUDENT");
  const id = String(form.get("lesson_id") ?? "");
  if (!isUuid(id)) return { error:"Bài học không hợp lệ.",completed:false };
  const { error } = await client.from("user_progress").upsert({ student_id: profile.id, lesson_id: id, is_completed: true }, { onConflict: "student_id,lesson_id" });
  if (error) return { error:"Không thể cập nhật tiến độ. Kiểm tra quyền truy cập và thử lại.",completed:false };
  revalidatePath("/courses", "layout");
  revalidatePath("/lessons", "layout");
  return { error:"",completed:true };
}

