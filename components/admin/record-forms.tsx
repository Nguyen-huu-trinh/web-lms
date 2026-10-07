"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./dialog";
import { useToast } from "@/components/ui/toast-provider";
import { entityNames, type MutationContext, type MutationResult } from "@/lib/admin-validation";
type Action = (state: MutationResult, form: FormData) => Promise<MutationResult>;
export type Props = { iconOnly?: boolean; context: MutationContext; values: Record<string,string | number | null>; save: Action; remove: Action };
const initial: MutationResult = { error:"",success:"" };
export function EditForm({ context, values, save, close }: Props & { close: () => void }) {
  const [fields,setFields] = useState<Record<string,string>>(() => ({ order_index:"0",type:"pdf",provider:"drive",...Object.fromEntries(Object.entries(values).map(([k,v]) => [k,String(v ?? "")])) }));
  const notify = useToast();
  const [state,action,pending] = useActionState(async (previous: MutationResult, form: FormData) => {
    const result = await save(previous, form);
    if (result.success && !result.error) {
      notify(result.success);
      close();
    }
    return result;
  },initial);
  const kind = context.entity;
  const set = (name: string,value: string) => setFields((f) => ({...f,[name]:value,...(name === "type" && value === "pdf" ? {provider:"drive"} : {})}));
  const input = (name: string,label: string,type = "text",required = true) => <label>{label}<input placeholder={name === "url" ? "https://…" : type === "number" ? "0" : `Nhập ${label.toLowerCase()}`} name={name} type={type} required={required} value={fields[name] ?? ""} onChange={(e) => set(name,e.target.value)} maxLength={name === "url" ? 2048 : 200} min={type === "number" ? 0 : undefined} max={name === "order_index" ? 2147483647 : name === "price" ? 9999999999.99 : undefined} step={name === "price" ? "0.01" : type === "number" ? "1" : undefined} /></label>;
  return <Dialog title={`${context.id ? "Sửa" : "Thêm"} ${entityNames[kind]}`} onClose={close} busy={pending}><form action={action} className="admin-form"><fieldset disabled={pending}>
    {input(["subjects","teachers","menus"].includes(kind) ? "name" : "title",kind === "menus" ? "Tên hạng mục" : kind === "teachers" ? "Tên giáo viên" : kind === "subjects" ? "Tên môn học" : "Tiêu đề")}
    {["subjects","teachers","courses"].includes(kind) && <label>{kind === "teachers" ? "Giới thiệu" : "Mô tả"}<textarea name={kind === "teachers" ? "bio" : "description"} rows={4} maxLength={5000} placeholder="Thông tin giới thiệu ngắn (không bắt buộc)" value={fields[kind === "teachers" ? "bio" : "description"] ?? ""} onChange={(e) => set(kind === "teachers" ? "bio" : "description",e.target.value)} /></label>}
    {kind === "materials" && <><label>Loại<select name="type" value={fields.type} onChange={(e) => set("type",e.target.value)}><option value="pdf">PDF</option><option value="video">Video</option></select></label><label>Nguồn<select name="provider" value={fields.provider} onChange={(e) => set("provider",e.target.value)}><option value="drive">Google Drive</option>{fields.type === "video" && <option value="youtube">YouTube</option>}</select></label>{input("url","URL","url")}</>}
    {["chapters","lessons","materials"].includes(kind) && input("order_index","Thứ tự (bắt đầu từ 0)","number")}
    {kind === "menus" && input("price","Giá (VND)","number")}
    </fieldset>{state.error && <p role="alert" className="form-error">{state.error}</p>}
    <footer><button type="button" className="button secondary" disabled={pending} onClick={close}>Hủy</button><button className="button" disabled={pending}>{pending ? "Đang lưu…" : context.id ? "Lưu thay đổi" : `Tạo ${entityNames[kind]}`}</button></footer>
  </form></Dialog>;
}
export function DeleteForm({ context, values, remove, close }: Props & { close: () => void }) {
  const router = useRouter();
  const notify = useToast();
  const [state,action,pending] = useActionState(async (previous: MutationResult,form: FormData) => {
    const result = await remove(previous,form);
    if (result.success && !result.error) {
      notify(result.success);
      close();
      if (result.redirectTo) router.replace(result.redirectTo, { scroll: false });
    }
    return result;
  },initial);
  return <Dialog title={`Xóa ${entityNames[context.entity]}`} onClose={close} busy={pending}><form action={action} className="admin-form"><p>Bạn có chắc muốn xóa {entityNames[context.entity]} “{values.name ?? values.title ?? "đã chọn"}”?</p>{!["menus","materials"].includes(context.entity) && <p className="delete-warning">Nội dung con, tài liệu, quyền truy cập và tiến độ liên quan có thể bị xóa theo. Thao tác không thể hoàn tác.</p>}<input type="hidden" name="confirm" value="yes" />{state.error && <p role="alert" className="form-error">{state.error}</p>}<footer><button type="button" className="button secondary" disabled={pending} onClick={close}>Hủy</button><button className="button danger" disabled={pending}>{pending ? "Đang xóa…" : "Xác nhận xóa"}</button></footer></form></Dialog>;
}
