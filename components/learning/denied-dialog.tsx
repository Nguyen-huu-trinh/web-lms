"use client";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/admin/dialog";
export function DeniedDialog() {
  const router = useRouter();
  const close = () => router.replace("/courses?filter=all");
  return <Dialog title="Chưa được cấp quyền" onClose={close}><button className="button" onClick={close}>Đóng</button></Dialog>;
}
