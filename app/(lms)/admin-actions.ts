"use server";
import { LEARNING_CACHE_TAG, PRICING_CACHE_TAG } from "@/lib/cache/policy";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/services/auth";
import { mutateRecord, removeRecord, revokeAccess } from "@/services/admin-mutations";
import { InputError, entityNames, parseGrade, type MutationContext, type MutationResult } from "@/lib/admin-validation";
export async function saveGradeAction(code: string, form: FormData): Promise<MutationResult> {
  const { client } = await requireUser("ADMIN");
  try {
    const { data, error } = await client.from("grades").update(parseGrade(form)).eq("code", code).select("code").maybeSingle();
    if (error) throw error;
    if (!data) throw new InputError("Khối không còn tồn tại.");
    refreshLearning();
    return { error: "", success: "Đã cập nhật khối." };
  } catch (error) { return { error: error instanceof InputError ? error.message : "Không thể cập nhật khối.", success: "" }; }
}
export async function deleteGradeAction(code: string): Promise<MutationResult> {
  const { client } = await requireUser("ADMIN");
  const { data, error } = await client.from("grades").delete().eq("code", code).select("code");
  if (error) return { error: ["23503", "23001"].includes(error.code) ? "Khối đang có môn học, không thể xóa." : "Không thể xóa khối.", success: "" };
  if (!data.length) return { error: "Khối không còn tồn tại.", success: "" };
  refreshLearning();
  return { error: "", success: "Đã xóa khối." };
}
export async function createGradeAction(_state: MutationResult, form: FormData): Promise<MutationResult> {
  const { client } = await requireUser("ADMIN");
  try {
    const values = parseGrade(form);
    const { data, error } = await client.from("grades").insert({ code: crypto.randomUUID(), ...values }).select("code").single();
    if (error) throw error;
    refreshLearning();
    return { error: "", success: "Đã tạo khối. Bạn có thể thêm môn học vào khối này.", redirectTo: "/courses?grade=" + encodeURIComponent(data.code) };
  } catch (error) {
    return { error: error instanceof InputError ? error.message : "Không thể tạo khối. Vui lòng thử lại.", success: "" };
  }
}
function refreshLearning(entity?: MutationContext["entity"]) {
  updateTag(entity === "menus" ? PRICING_CACHE_TAG : LEARNING_CACHE_TAG);
  if (entity === "menus") {
    revalidatePath("/menu");
    return;
  }
  if (entity === "materials") {
    revalidatePath("/lessons/[id]", "page");
    return;
  }
  revalidatePath("/courses", "layout");
  revalidatePath("/lessons", "layout");
}
export async function saveRecordAction(context: MutationContext, _state: MutationResult, form: FormData): Promise<MutationResult> {
  await requireUser("ADMIN");
  try {
    await mutateRecord(context, form);
    refreshLearning(context.entity);
    return { error:"", success:`Đã ${context.id ? "cập nhật" : "tạo"} ${entityNames[context.entity]}.` };
  } catch (error) { return { error: error instanceof InputError ? error.message : "Không thể lưu dữ liệu. Vui lòng thử lại.", success:"" }; }
}
export async function deleteRecordAction(context: MutationContext, _state: MutationResult, form: FormData): Promise<MutationResult> {
  await requireUser("ADMIN");
  try {
    if (form.get("confirm") !== "yes") throw new InputError("Vui lòng xác nhận thao tác xóa.");
    const redirectTo = await removeRecord(context);
    refreshLearning(context.entity);
    return { error:"", success:`Đã xóa ${entityNames[context.entity]}.`, redirectTo };
  } catch (error) { return { error: error instanceof InputError ? error.message : "Không thể xóa dữ liệu. Vui lòng thử lại.", success:"" }; }
}
export async function revokeAccessAction(kind: "subject" | "teacher", targetId: string, accessId: string, _state: MutationResult, form: FormData): Promise<MutationResult> {
  await requireUser("ADMIN");
  try {
    if (form.get("confirm") !== "yes") throw new InputError("Vui lòng xác nhận thu hồi quyền.");
    await revokeAccess(kind, targetId, accessId);
    refreshLearning();
    return { error:"",success:"Đã thu hồi quyền trực tiếp. Tài khoản và tiến độ được giữ nguyên." };
  } catch (error) { return { error: error instanceof InputError ? error.message : "Không thể thu hồi quyền. Vui lòng thử lại.",success:"" }; }
}
