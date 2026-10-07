import { requireUser } from "@/services/auth";
import { SessionGuard } from "@/components/session-guard";
import { Navigation } from "@/components/learning/navigation";
import { ToastProvider } from "@/components/ui/toast-provider";
export const dynamic = "force-dynamic";
export default async function LmsLayout({ children }: { children: React.ReactNode }) {
  const { profile, sessionId } = await requireUser();
  return <ToastProvider><SessionGuard userId={profile.id} sessionId={sessionId} /><Navigation name={profile.username ?? profile.email} admin={profile.role === "ADMIN"} /><div className="app-content">{children}</div></ToastProvider>;
}
