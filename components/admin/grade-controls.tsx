"use client";
import { useActionState, useState } from "react";
import { saveGradeAction, deleteGradeAction } from "@/app/(lms)/admin-actions";
import { Dialog } from "./dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast-provider";
export function GradeControls({ code, name, orderIndex }: { code: string; name: string; orderIndex: number }) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  return <><button title={`Sửa khối ${name}`} aria-label={`Sửa khối ${name}`} onClick={() => setMode("edit")}><Icon name="edit" /></button><button title={`Xóa khối ${name}`} aria-label={`Xóa khối ${name}`} onClick={() => setMode("delete")}><Icon name="trash" /></button>{mode && <GradeDialog orderIndex={orderIndex} code={code} name={name} mode={mode} close={() => setMode(null)} />}</>;
}
function GradeDialog({ code, name, mode, close, orderIndex }: { orderIndex: number; code: string; name: string; mode: "edit" | "delete"; close: () => void }) {
  const toast = useToast();
  const [state, action, pending] = useActionState(async (_state: { error: string; success: string }, form: FormData) => {
    const result = await (mode === "edit" ? saveGradeAction(code, form) : deleteGradeAction(code));
    if (result.success) { toast(result.success); close(); }
    return result;
  }, { error: "", success: "" });
  return <Dialog title={mode === "edit" ? "Sửa khối" : "Xóa khối"} onClose={close} busy={pending}><form action={action} className="admin-form">
    {mode === "edit" ? <><label>Tên khối<input name="name" defaultValue={name} required maxLength={200} disabled={pending} /></label><label>Thứ tự hiển thị<input name="order_index" type="number" min={0} max={2147483647} step={1} defaultValue={orderIndex} required disabled={pending} /></label><p>Số nhỏ hơn hiển thị trước.</p></> : <p>Xóa khối “{name}”? Chỉ có thể xóa khối chưa có môn học.</p>}
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <footer><button type="button" disabled={pending} onClick={close}>Hủy</button><button className="button" disabled={pending}>{pending ? "Đang lưu…" : mode === "edit" ? "Lưu" : "Xác nhận xóa"}</button></footer>
  </form></Dialog>;
}
