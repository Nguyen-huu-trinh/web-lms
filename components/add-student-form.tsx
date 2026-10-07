"use client";
import { startTransition, useActionState, useState } from "react";
import { addStudentAction, type AddStudentState } from "@/app/(lms)/courses/actions";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/admin/dialog";
import { useToast } from "@/components/ui/toast-provider";
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
  const [username,setUsername] = useState("");
  const [query, setQuery] = useState("");
  const [targetIds,setTargetIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<AddStudentState["confirmation"]>();
  const notify = useToast();
  const [state, action, pending] = useActionState(async (previous: AddStudentState, form: FormData) => {
    const result = await addStudentAction(previous, form);
    setConfirmation(result.confirmation);
    if (result.success && !result.error) {
      notify(result.success);
      onCancel();
    }
    return result;
  }, { error: "", success: "" });
  const selectedNames = target ? [target.name] : (kind === "subject" ? subjects : teachers).filter((option) => targetIds.includes(option.id)).map((option) => option.name);
  const options = kind === "subject" ? subjects : teachers;
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
  const visibleOptions = options.filter((option) => normalize(option.name).includes(normalize(query)));
  const allVisibleSelected = visibleOptions.length > 0 && visibleOptions.every((option) => targetIds.includes(option.id));
  const toggleAllLabel = allVisibleSelected ? "Bỏ chọn tất cả kết quả" : "Chọn tất cả kết quả";
  return <Dialog title={`Thêm học sinh${target ? ` · ${target.name}` : ""}`} onClose={onCancel} busy={pending}><form onSubmit={(event) => {
    event.preventDefault();
    if (pending) return;
    // Keep the controlled selection through the confirmation step instead of
    // allowing a resolved form action to reset native checkbox/radio values.
    const form = new FormData();
    form.set("username", username);
    form.set("kind", target?.kind ?? kind);
    for (const id of target ? [target.id] : targetIds) form.append("target_id", id);
    form.set("confirmed_student_id", confirmation?.studentId ?? "");
    startTransition(() => action(form));
  }} className="admin-form">
    <label className="block">Tên đăng nhập học sinh<input required type="text" name="username" minLength={3} maxLength={50} pattern="[a-zA-Z0-9_]{3,50}" autoCapitalize="none" spellCheck={false} autoComplete="off" placeholder="Ví dụ: nguyen_van_an" value={username} onChange={(e) => { setUsername(e.target.value); setConfirmation(undefined); }} disabled={pending} /></label>
    {target ? <><input type="hidden" name="kind" value={target.kind} /><input type="hidden" name="target_id" value={target.id} /></> : <>
      <fieldset className="access-options"><legend>Cấp quyền theo</legend>
        <label><input type="radio" name="kind" value="subject" checked={kind === "subject"} disabled={pending} onChange={() => { setKind("subject"); setTargetIds([]); setQuery(""); setConfirmation(undefined); }} /> Môn học</label>
        <label><input type="radio" name="kind" value="teacher" checked={kind === "teacher"} disabled={pending} onChange={() => { setKind("teacher"); setTargetIds([]); setQuery(""); setConfirmation(undefined); }} /> Giáo viên</label>
      </fieldset>
      <fieldset className="student-target-options" disabled={pending}><legend>{kind === "subject" ? "Chọn môn học" : "Chọn giáo viên"} · {targetIds.length} đã chọn</legend><div className="student-target-toolbar">
        <button type="button" className="student-target-all" title={toggleAllLabel} aria-label={toggleAllLabel} aria-pressed={allVisibleSelected} disabled={!visibleOptions.length} onClick={() => { const visibleIds = new Set(visibleOptions.map((option) => option.id)); setTargetIds((ids) => allVisibleSelected ? ids.filter((id) => !visibleIds.has(id)) : [...new Set([...ids, ...visibleIds])]); setConfirmation(undefined); }}><Icon name="check" /><span>{allVisibleSelected ? "Bỏ chọn" : "Tất cả"}</span></button>
        <label className="student-target-search"><Icon name="search" /><input type="search" aria-label={kind === "subject" ? "Tìm môn học" : "Tìm giáo viên"} placeholder="Tìm kiếm…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div><div className="student-target-list">{visibleOptions.map((option) => <label key={option.id}><input type="checkbox" name="target_id" value={option.id} checked={targetIds.includes(option.id)} onChange={(e) => { const checked = e.currentTarget.checked; setTargetIds((ids) => checked ? [...ids, option.id] : ids.filter((id) => id !== option.id)); setConfirmation(undefined); }} /><span>{option.name}</span></label>)}{!visibleOptions.length && <p className="student-target-empty">Không tìm thấy kết quả.</p>}</div>{targetIds.length > 100 && <p className="form-error" role="alert">Mỗi lần cấp quyền tối đa 100 mục. Vui lòng bỏ bớt lựa chọn.</p>}</fieldset>
      {!options.length && <p>Chưa có {kind === "subject" ? "môn học" : "giáo viên"} để cấp quyền.</p>}
    </>}
    <p className="field-hint">Dùng 3–50 ký tự: chữ không dấu, số hoặc dấu _. Nhập tên đã có để cấp thêm quyền.</p>
    <p className="info-note">Mật khẩu mặc định: 123456 (chỉ áp dụng cho tài khoản mới).</p>
    {confirmation && <section className="student-confirmation" role="alert"><strong>Tên đăng nhập “{confirmation.username}” đã tồn tại.</strong><p>Bạn có muốn cấp thêm quyền {kind === "subject" ? "môn học" : "giáo viên"} cho học sinh này không?</p><p>{selectedNames.join(", ")}</p><p>Tài khoản, mật khẩu và tiến độ hiện tại được giữ nguyên.</p></section>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="notice" role="status">{state.success}</p>}
    <footer><button type="button" className="button secondary" onClick={onCancel} disabled={pending}>Hủy</button><button name="confirmed_student_id" value={confirmation?.studentId ?? ""} disabled={pending || (!target && (!targetIds.length || targetIds.length > 100))} className="button" aria-busy={pending}>{pending ? "Đang xử lý…" : confirmation ? "Xác nhận cấp quyền" : "Thêm học sinh"}</button></footer>
  </form></Dialog>;
}
