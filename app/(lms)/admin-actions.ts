"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth";
import { mutateRecord, removeRecord, revokeAccess } from "@/services/admin-mutations";
import { InputError, entityNames, type MutationContext, type MutationResult } from "@/lib/admin-validation";
function refreshLearning(entity?: MutationContext["entity"]) {
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
