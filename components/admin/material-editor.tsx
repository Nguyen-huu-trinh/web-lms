import type { Database } from "@/types/database";
import { RecordControls } from "./record-controls";
export function MaterialEditor({ lessonId, materials }: { lessonId:string; materials:Database["public"]["Tables"]["materials"]["Row"][] }) {
  return <section className="material-editor"><RecordControls context={{entity:"materials",parentId:lessonId}} />{!materials.length && <p>Chưa có tài liệu.</p>}<ul>{materials.map((m) => <li key={m.id} className="editor-row"><div><strong>{m.title}</strong><small>{m.type.toUpperCase()} · {m.provider === "drive" ? "Google Drive" : "YouTube"} · Thứ tự: {m.order_index}</small></div><RecordControls context={{entity:"materials",id:m.id,parentId:lessonId}} values={{title:m.title,type:m.type,provider:m.provider,url:m.url,order_index:m.order_index}} /></li>)}</ul></section>;
}
