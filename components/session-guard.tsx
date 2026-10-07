"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function SessionGuard({ userId, sessionId }: { userId: string; sessionId: string }) {
  useEffect(() => {
    const client = createClient();
    let stopped = false;
    let exiting = false;
    let checking = false;
    let checkAgain = false;
    async function verifySession() {
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
    const timer = window.setInterval(() => { void check(); }, 15000);
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    void check();
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); void client.removeChannel(channel); };
  }, [userId, sessionId]);
  return null;
}
