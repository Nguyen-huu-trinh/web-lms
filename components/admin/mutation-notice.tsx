"use client";
import { useSearchParams } from "next/navigation";
export function MutationNotice() {
  const query = useSearchParams();
  return query.get("notice") === "deleted" ? <p className="notice mb-5" role="status">Đã xóa dữ liệu.</p> : null;
}
