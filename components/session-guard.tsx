"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function SessionGuard({ userId, sessionId, trialExpiresAt }: { userId: string; sessionId: string; trialExpiresAt?: string | null }) {
  useEffect(() => {
    const client = createClient();
    let stopped = false;
    let exiting = false;
    let checking = false;
    let checkAgain = false;
    async function expireTrial() {
      if (stopped || exiting) return;
      exiting = true;
      try {
        const { data } = await client.auth.getClaims();
        if (data?.claims.session_id === sessionId) await client.auth.signOut({ scope: "local" });
      } finally { window.location.replace("/login?error=trial"); }
    }
    async function verifySession() {
      if (trialExpiresAt && Date.now() >= Date.parse(trialExpiresAt)) { await expireTrial(); return; }
      const { data, error } = await client.from("active_sessions").select("session_id").eq("user_id", userId).maybeSingle();
      if (stopped || exiting || error) return;
      if (data?.session_id === sessionId) return;
      exiting = true;
      window.alert("Tài khoản đã đăng nhập ở thiết bị khác");
      // In another tab cookies may already belong to the NEW session: don't revoke it.
      const { data: claims } = await client.auth.getClaims();
      if (claims?.claims.session_id === sessionId) await client.auth.signOut({ scope: "local" });
      window.location.replace("/login?error=session");
    }
    async function check() {
      if (stopped || exiting) return;
      if (checking) { checkAgain = true; return; }
      checking = true;
      try {
        do {
          checkAgain = false;
          await verifySession();
        } while (checkAgain && !stopped && !exiting);
      } catch {
        // Network interruptions are retried by the next focus/timer/realtime event.
      } finally {
        checking = false;
      }
    }
    const channel = client.channel(`session:${userId}`).on("postgres_changes", {
      event: "*", schema: "public", table: "active_sessions", filter: `user_id=eq.${userId}`,
    }, () => { void check(); }).subscribe();
    const expiryTimer = trialExpiresAt ? window.setTimeout(() => { void expireTrial(); }, Math.max(0, Date.parse(trialExpiresAt) - Date.now())) : undefined;
    const timer = window.setInterval(() => { void check(); }, 15000);
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    void check();
    return () => { stopped = true; window.clearTimeout(expiryTimer); window.clearInterval(timer); window.removeEventListener("focus", onFocus); void client.removeChannel(channel); };
  }, [userId, sessionId, trialExpiresAt]);
  return null;
}
