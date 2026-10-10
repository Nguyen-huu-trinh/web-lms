"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth";
import { isUuid } from "@/lib/learning";

export async function setTeacherFavorite(teacherId: string, favorite: boolean): Promise<{ ok: boolean }> {
  const { client, profile } = await requireUser("STUDENT");
  if (!isUuid(teacherId) || typeof favorite !== "boolean") return { ok: false };
  try {
    const result = favorite
      ? await client.from("student_teacher_favorites").upsert({ student_id: profile.id, teacher_id: teacherId }, { onConflict: "student_id,teacher_id", ignoreDuplicates: true })
      : await client.from("student_teacher_favorites").delete().eq("student_id", profile.id).eq("teacher_id", teacherId);
    if (result.error) return { ok: false };
    revalidatePath("/courses");
    return { ok: true };
  } catch { return { ok: false }; }
}
