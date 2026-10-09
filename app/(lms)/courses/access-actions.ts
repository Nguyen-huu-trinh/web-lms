"use server";
import { requireUser } from "@/services/auth";
import { teacherContext } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";

export async function checkTeacherAccess(teacherId: string): Promise<"allowed" | "denied" | "error"> {
  const { client, profile } = await requireUser();
  if (!isUuid(teacherId)) return "denied";
  try {
    return await teacherContext(client, teacherId, profile) ? "allowed" : "denied";
  } catch { return "error"; }
}
