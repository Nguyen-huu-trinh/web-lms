"use client";
import { useActionState, useState } from "react";
import { Dialog } from "./dialog";
import { revokeAccessAction } from "@/app/(lms)/admin-actions";
import type { AccessRow } from "@/types/admin";
export function StudentList({ kind, targetId, name, rows }: { kind: "subject" | "teacher"; targetId: string; name: string; rows: AccessRow[] }) {
  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState("");
  const [revoking,setRevoking] = useState<AccessRow | null>(null);
  const [message,setMessage] = useState("");
  const filtered = rows.filter((row) => row.email.toLowerCase().includes(query.trim().toLowerCase()));
  return <><button type="button" className="text-link" onClick={() => setOpen(true)}>Xem học sinh ({rows.length})</button>{open && <Dialog title={`Học sinh · ${name}`} onClose={() => setOpen(false)} busy={Boolean(revoking)}><p className="mb-4 text-sm text-slate-500">{kind === "teacher" ? "Danh sách quyền trực tiếp cho giáo viên. Học sinh có quyền từ môn học được quản lý tại môn học đó." : "Danh sách học sinh được cấp quyền trực tiếp cho toàn môn."}</p><label className="admin-search">Tìm kiếm email<input type="search" placeholder="Nhập email học sinh…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>{message && <p role="status" className="notice">{message}</p>}{filtered.length ? <ul className="student-access-list">{filtered.map((row) => <li key={row.id}><div><strong>{row.email}</strong><small>Ngày thêm: {new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(row.created_at))}</small><small>Quyền trực tiếp · {kind === "subject" ? "Toàn môn" : "Giáo viên"}</small></div><button type="button" className="danger-link" onClick={() => setRevoking(row)}>Thu hồi quyền</button></li>)}</ul> : <p className="py-5 text-sm">Chưa có học sinh phù hợp.</p>}{revoking && <RevokeDialog kind={kind} targetId={targetId} row={revoking} close={() => setRevoking(null)} success={(text) => { setMessage(text); setRevoking(null); }} />}</Dialog>}</>;
}
function RevokeDialog({ kind,targetId,row,close,success }: { kind:"subject" | "teacher"; targetId:string; row:AccessRow; close:()=>void; success:(message:string)=>void }) {
  const [state,action,pending] = useActionState(async (previous:{error:string;success:string},form:FormData) => {
    const result = await revokeAccessAction(kind,targetId,row.id,previous,form);
    if(result.success) success(result.success);
    return result;
  },{error:"",success:""});
  return <Dialog title="Thu hồi quyền" onClose={close} busy={pending}><form action={action} className="admin-form"><p>Thu hồi quyền trực tiếp của {row.email}?</p><p>Tài khoản và tiến độ không bị xóa. Quyền được cấp qua {kind === "teacher" ? "môn học" : "giáo viên"} vẫn được giữ.</p><input type="hidden" name="confirm" value="yes" />{state.error && <p role="alert" className="form-error">{state.error}</p>}<footer><button type="button" disabled={pending} onClick={close} className="button secondary">Hủy</button><button disabled={pending} className="button danger">{pending ? "Đang thu hồi…" : "Xác nhận thu hồi"}</button></footer></form></Dialog>;
}
