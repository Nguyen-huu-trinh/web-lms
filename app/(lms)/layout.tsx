import { requireUser } from "@/services/auth";
import { SessionGuard } from "@/components/session-guard";
import { Navigation } from "@/components/learning/navigation";
import { Suspense } from "react";
import { MutationNotice } from "@/components/admin/mutation-notice";
export const dynamic = "force-dynamic";
export default async function LmsLayout({ children }: { children: React.ReactNode }) {
  const { profile, sessionId } = await requireUser();
  return <><SessionGuard userId={profile.id} sessionId={sessionId} /><Navigation name={profile.username ?? profile.email} admin={profile.role === "ADMIN"} /><div className="app-content"><Suspense><MutationNotice /></Suspense>{children}</div><footer className="site-footer">LMS <span>Học từng bài. Tiến bộ mỗi ngày.</span></footer></>;
}
