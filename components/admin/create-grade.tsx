"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createGradeAction } from "@/app/(lms)/admin-actions";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "./dialog";
import { useToast } from "@/components/ui/toast-provider";

export function CreateGrade() {
  const [open, setOpen] = useState(false);
  return <><button type="button" title="Thêm khối" aria-label="Thêm khối" onClick={() => setOpen(true)}><Icon name="layers" /></button>{open && <GradeForm close={() => setOpen(false)} />}</>;
}

function GradeForm({ close }: { close: () => void }) {
  const notify = useToast();
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: { error: string; success: string }, form: FormData) => {
    const result = await createGradeAction(previous, form);
    if (result.success) {
      notify(result.success);
      close();
      if (result.redirectTo) router.replace(result.redirectTo, { scroll: false });
    }
    return result;
  }, { error: "", success: "" });
  return <Dialog title="Tạo khối học" onClose={close} busy={pending}><form action={action} className="admin-form">
    <label>Tên khối<input name="name" required maxLength={200} placeholder="Ví dụ: Lớp 12, Ôn thi 2027" disabled={pending} /></label>
    <label>Thứ tự hiển thị<input name="order_index" type="number" min={0} max={2147483647} step={1} defaultValue={0} required disabled={pending} /></label>
    <p>Số nhỏ hơn hiển thị trước.</p>
    <p>Tạo khối trước, sau đó thêm các môn học vào khối này.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <footer><button type="button" className="button secondary" disabled={pending} onClick={close}>Hủy</button><button className="button" disabled={pending}>{pending ? "Đang tạo…" : "Tạo khối"}</button></footer>
  </form></Dialog>;
}
