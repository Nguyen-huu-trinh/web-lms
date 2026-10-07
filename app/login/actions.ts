"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateFreshSession } from "@/services/auth";
import { normalizeEmail } from "@/lib/auth-validation";

export async function studentLogin(form: FormData) {
  let email: string;
  try { email = normalizeEmail(form.get("email")); }
  catch { redirect("/login?error=credentials"); }
  const password = String(form.get("password") ?? "");
  if (!password || password.length > 1024) redirect("/login?error=credentials");
  const client = await createClient();
  let mustChange = false;
  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await activateFreshSession(client, "STUDENT");
    mustChange = profile.must_change_password;
  } catch {
    await client.auth.signOut({ scope: "local" });
    redirect("/login?error=credentials");
  }
  redirect(mustChange ? "/change-password" : "/courses");
}

export async function adminLogin(form: FormData) {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!/^[a-z0-9_]{3,50}$/.test(username) || !password || password.length > 1024) redirect("/login?error=credentials");
  const client = await createClient();
  let mustChange = false;
  try {
    const admin = createAdminClient();
    const { data: profile, error } = await admin.from("profiles").select("id,email").eq("username", username).eq("role", "ADMIN").maybeSingle();
    if (error || !profile) throw new Error("Invalid credentials");
    const { data, error: loginError } = await client.auth.signInWithPassword({ email: profile.email, password });
    if (loginError || data.user?.id !== profile.id) throw new Error("Invalid credentials");
    const activated = await activateFreshSession(client, "ADMIN");
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
