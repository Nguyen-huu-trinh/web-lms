"use client";
import { useActionState, useState } from "react";
import { addStudentAction } from "@/app/(lms)/courses/actions";
import { Dialog } from "@/components/admin/dialog";
type Option = { id: string; name: string };
type Props = { subjects?: Option[]; teachers?: Option[]; target?: { kind: "subject" | "teacher"; id: string; name: string } };
export function AddStudentForm(props: Props) {
  const [open, setOpen] = useState(false);
  return <div className="student-trigger">
    <button type="button" className="button secondary" onClick={() => setOpen(!open)} aria-expanded={open}>+ Thêm học sinh</button>
    {open && <StudentForm {...props} onCancel={() => setOpen(false)} />}
  </div>;
}
function StudentForm({ subjects = [], teachers = [], target, onCancel }: Props & { onCancel: () => void }) {
  const [kind, setKind] = useState<"subject" | "teacher">(target?.kind ?? "subject");
  const [email,setEmail] = useState("");
  const [targetId,setTargetId] = useState("");
  const [state, action, pending] = useActionState(addStudentAction, { error: "", success: "" });
  const options = kind === "subject" ? subjects : teachers;
  return <Dialog title={`Thêm học sinh${target ? ` · ${target.name}` : ""}`} onClose={onCancel} busy={pending}><form action={action} className="admin-form">
    <label className="block">Email học sinh<input required type="email" name="email" maxLength={254} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} /></label>
    {target ? <><input type="hidden" name="kind" value={target.kind} /><input type="hidden" name="target_id" value={target.id} /></> : <>
      <fieldset className="access-options"><legend>Cấp quyền theo</legend>
        <label><input type="radio" name="kind" value="subject" checked={kind === "subject"} disabled={pending} onChange={() => { setKind("subject"); setTargetId(""); }} /> Môn học</label>
        <label><input type="radio" name="kind" value="teacher" checked={kind === "teacher"} disabled={pending} onChange={() => { setKind("teacher"); setTargetId(""); }} /> Giáo viên</label>
      </fieldset>
      <label className="block">{kind === "subject" ? "Môn học" : "Giáo viên"}<select key={kind} name="target_id" required value={targetId} disabled={pending} onChange={(e) => setTargetId(e.target.value)}><option value="" disabled>Chọn {kind === "subject" ? "môn học" : "giáo viên"}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      {!options.length && <p>Chưa có {kind === "subject" ? "môn học" : "giáo viên"} để cấp quyền.</p>}
    </>}
    <p className="info-note">Mật khẩu mặc định: 123456 (chỉ áp dụng cho tài khoản mới).</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="notice" role="status">{state.success}</p>}
    <footer><button type="button" className="button secondary" onClick={onCancel} disabled={pending}>Hủy</button><button disabled={pending || (!target && !options.length)} className="button" aria-busy={pending}>{pending ? "Đang thêm…" : "Thêm học sinh"}</button></footer>
  </form></Dialog>;
}
