"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkTeacherAccess } from "@/app/(lms)/courses/access-actions";
import { Dialog } from "@/components/admin/dialog";
import { Icon } from "@/components/ui/icon";
import styles from "./course-home.module.css";

export function TeacherEntry({ id, featured, started }: { id: string; featured: boolean; started: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function enter() {
    if (pending) return;
    setPending(true);
    try {
      const result = await checkTeacherAccess(id);
      if (result === "allowed") router.push(`/courses/teachers/${id}`);
      else setMessage(result === "denied" ? "Chưa được cấp quyền" : "Không thể kiểm tra quyền. Vui lòng thử lại.");
    } catch { setMessage("Không thể kiểm tra quyền. Vui lòng thử lại."); }
    finally { setPending(false); }
  }
  return <><button className={styles.enter} data-featured={featured} onClick={enter} disabled={pending}>{pending ? "Đang kiểm tra…" : started ? "Vào học" : "Bắt đầu học"}{started && <Icon name="arrow" />}</button>{message && <Dialog title={message} onClose={() => setMessage("")}><button className="button" onClick={() => setMessage("")}>Đóng</button></Dialog>}</>;
}
