import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/types/database";

// Call only immediately after successful password login.
// No public endpoint accepts a client-supplied session ID for activation.
export async function activateFreshSession(client: Awaited<ReturnType<typeof createClient>>, role: Role) {
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub || typeof data.claims.session_id !== "string") throw new Error("Invalid session");
  const admin = createAdminClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user || userData.user.id !== data.claims.sub) throw new Error("Invalid user");
  const { data: profile, error: readError } = await admin.from("profiles").select("role,must_change_password,provisioned_by_admin").eq("id", userData.user.id).single();
  if (readError || profile?.role !== role) throw new Error("Wrong login role");
  if (role === "STUDENT" && !profile.provisioned_by_admin) throw new Error("Admin provisioning required");
  const { error: sessionError } = await admin.from("active_sessions").upsert({
    user_id: userData.user.id, session_id: data.claims.session_id,
  }, { onConflict: "user_id" });
  if (sessionError) throw sessionError;
  return profile;
}

export async function requireUser(requiredRole?: Role, allowPasswordChange = false) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect("/login");
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  const { data: active, error: activeError } = await client.rpc("session_is_active");
  if (activeError) throw new Error("Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.");
  if (!active) redirect("/login?error=session");
  const { data: profile, error: profileError } = await client.from("profiles").select("*").eq("id", data.claims.sub).single();
  if (profileError || !profile) throw new Error("Không thể đọc hồ sơ.");
  if (profile.role === "STUDENT" && !profile.provisioned_by_admin) redirect("/login?error=credentials");
  if (requiredRole && profile.role !== requiredRole) throw new Error("Không có quyền thực hiện.");
  if (profile.must_change_password && !allowPasswordChange) redirect("/change-password");
  return { client, profile, sessionId: String(data.claims.session_id) };
}
