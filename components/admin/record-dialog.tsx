"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@/components/ui/icon";
import { entityNames } from "@/lib/admin-validation";
import type { Props } from "./record-forms";
const EditForm = dynamic(() => import("./record-forms").then((module) => module.EditForm), { loading: () => <span role="status">Đang mở…</span> });
const DeleteForm = dynamic(() => import("./record-forms").then((module) => module.DeleteForm), { loading: () => <span role="status">Đang mở…</span> });
export function RecordDialog(props: Props) {
  const [mode,setMode] = useState<"edit" | "delete" | null>(null);
  const { context } = props;
  const icons = props.iconOnly && Boolean(context.id);
  const label = String(props.values.title ?? props.values.name ?? entityNames[context.entity]);
  return <div className={icons ? "record-controls record-controls-icons" : "record-controls"}><button aria-label={icons ? "Sửa " + label : undefined} title={icons ? "Sửa " + label : undefined} type="button" onClick={() => setMode("edit")}>{icons ? <Icon name="edit" /> : context.id ? "Sửa" : `+ Thêm ${entityNames[context.entity]}`}</button>{context.id && <button type="button" className="danger-link" aria-label={icons ? "Xóa " + label : undefined} title={icons ? "Xóa " + label : undefined} onClick={() => setMode("delete")}>{icons ? <Icon name="trash" /> : "Xóa"}</button>}{mode === "edit" && <EditForm {...props} close={() => setMode(null)} />}{mode === "delete" && <DeleteForm {...props} close={() => setMode(null)} />}</div>;
}
