"use client";
import { useActionState, useEffect, useState } from "react";
import { Dialog } from "./dialog";
import { useToast } from "@/components/ui/toast-provider";
import { revokeAccessAction } from "@/app/(lms)/admin-actions";
import type { AccessRow } from "@/types/admin";
const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });
export default function StudentListDialog({ kind, targetId, name, onClose }: { kind: "subject" | "teacher"; targetId: string; name: string; onClose: () => void }) {
  const [query,setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ rows: AccessRow[]; total: number; pageSize: number; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ kind, targetId, page: String(page), q: query });
    const timer = window.setTimeout(() => { void fetch("/courses/access?" + params, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("load failed");
        const data = await response.json() as { rows: AccessRow[]; total: number; pageSize: number };
        if (!controller.signal.aborted) setResult({ ...data, error: "" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ rows: [], total: 0, pageSize: 50, error: "Không thể tải danh sách học sinh. Vui lòng thử lại." });
      });
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [kind, targetId, attempt, page, query]);
  const rows = result?.rows ?? [];
  const [revoking,setRevoking] = useState<AccessRow | null>(null);
  const notify = useToast();

  return <Dialog title={`Học sinh · ${name}`} onClose={onClose} busy={Boolean(revoking)}><p className="mb-4 text-sm text-slate-500">{kind === "teacher" ? "Danh sách quyền trực tiếp cho giáo viên. Học sinh có quyền từ môn học được quản lý tại môn học đó." : "Danh sách học sinh được cấp quyền trực tiếp cho toàn môn."}</p><label className="admin-search">Tìm tên đăng nhập<input type="search" placeholder="Nhập tên đăng nhập…" value={query} maxLength={200} onChange={(e) => { setResult(null); setPage(0); setQuery(e.target.value); }} /></label>{!result ? <p role="status" className="py-5">Đang tải danh sách học sinh…</p> : result.error ? <div role="alert"><p>{result.error}</p><button type="button" className="button secondary" onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Thử lại</button></div> : rows.length ? <ul className="student-access-list">{rows.map((row) => <li key={row.id}><div><strong>{row.email}</strong><small>Ngày thêm: {dateFormat.format(new Date(row.created_at))}</small><small>Quyền trực tiếp · {kind === "subject" ? "Toàn môn" : "Giáo viên"}</small></div><button type="button" className="danger-link" onClick={() => setRevoking(row)}>Thu hồi quyền</button></li>)}</ul> : <p className="py-5 text-sm">Chưa có học sinh phù hợp.</p>}{result && !result.error && result.total > result.pageSize && <nav aria-label="Trang học sinh" className="flex items-center justify-between gap-3 py-4"><button type="button" className="button secondary" disabled={page === 0} onClick={() => { setResult(null); setPage((value) => value - 1); }}>Trước</button><span>Trang {page + 1}/{Math.ceil(result.total / result.pageSize)} · {result.total} học sinh</span><button type="button" className="button secondary" disabled={(page + 1) * result.pageSize >= result.total} onClick={() => { setResult(null); setPage((value) => value + 1); }}>Sau</button></nav>}{revoking && <RevokeDialog kind={kind} targetId={targetId} row={revoking} close={() => setRevoking(null)} success={(text) => { notify(text); setRevoking(null); onClose(); }} />}</Dialog>;
}
function RevokeDialog({ kind,targetId,row,close,success }: { kind:"subject" | "teacher"; targetId:string; row:AccessRow; close:()=>void; success:(message:string)=>void }) {
  const [state,action,pending] = useActionState(async (previous:{error:string;success:string},form:FormData) => {
    const result = await revokeAccessAction(kind,targetId,row.id,previous,form);
    if(result.success) success(result.success);
    return result;
  },{error:"",success:""});
  return <Dialog title="Thu hồi quyền" onClose={close} busy={pending}><form action={action} className="admin-form"><p>Thu hồi quyền trực tiếp của {row.email}?</p><p>Tài khoản và tiến độ không bị xóa. Quyền được cấp qua {kind === "teacher" ? "môn học" : "giáo viên"} vẫn được giữ.</p><input type="hidden" name="confirm" value="yes" />{state.error && <p role="alert" className="form-error">{state.error}</p>}<footer><button type="button" disabled={pending} onClick={close} className="button secondary">Hủy</button><button disabled={pending} className="button danger">{pending ? "Đang thu hồi…" : "Xác nhận thu hồi"}</button></footer></form></Dialog>;
}
