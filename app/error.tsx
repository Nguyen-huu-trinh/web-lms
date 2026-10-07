"use client";
import { Icon } from "@/components/ui/icon";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="surface empty-state standalone-state"><span className="empty-symbol"><Icon name="alert" /></span><h1>Không thể tải dữ liệu.</h1><p>Vui lòng kiểm tra kết nối và thử lại.</p><button className="button mt-5" onClick={reset}><Icon name="retry" />Thử lại</button></main>;
}
