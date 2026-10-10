import { requireUser } from "@/services/auth";
import { SessionGuard } from "@/components/session-guard";
import { LearningShell } from "@/components/learning/learning-shell";
import { ToastProvider } from "@/components/ui/toast-provider";
export const dynamic = "force-dynamic";
export default async function LmsLayout({ children }: { children: React.ReactNode }) {
  const { profile, sessionId } = await requireUser();
  return <ToastProvider><SessionGuard userId={profile.id} sessionId={sessionId} trialExpiresAt={profile.trial_expires_at} /><LearningShell key={`${profile.id}:${sessionId}`} name={profile.username ?? profile.email} admin={profile.role === "ADMIN"}>{children}</LearningShell></ToastProvider>;
}
