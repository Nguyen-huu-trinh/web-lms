"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateFreshSession } from "@/services/auth";
import { normalizeUsername } from "@/lib/auth-validation";

export async function login(form: FormData) {
  let username: string;
  try { username = normalizeUsername(form.get("username")); }
  catch { redirect("/login?error=credentials"); }
  const password = String(form.get("password") ?? "");
  if (!password || password.length > 1024) redirect("/login?error=credentials");
  const client = await createClient();
  let mustChange = false;
  try {
    const admin = createAdminClient();
    const { data: profile, error } = await admin.from("profiles").select("id,email,role").eq("username", username).maybeSingle();
    if (error || !profile) throw new Error("Invalid credentials");
    const { data, error: loginError } = await client.auth.signInWithPassword({ email: profile.email, password });
    if (loginError || data.user?.id !== profile.id) throw new Error("Invalid credentials");
    const activated = await activateFreshSession(client, profile.role);
    mustChange = activated.must_change_password;
  } catch {
    await client.auth.signOut({ scope: "local" });
    redirect("/login?error=credentials");
  }
  redirect(mustChange ? "/change-password" : "/courses");
}

export async function logout() {
  const client = await createClient();
  const { error } = await client.rpc("end_session");
  if (error) throw new Error("Không thể kết thúc phiên. Vui lòng thử lại.");
  await client.auth.signOut({ scope: "local" });
  redirect("/login");
}
