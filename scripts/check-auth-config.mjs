import { createClient } from "@supabase/supabase-js";
try { process.loadEnvFile(".env.local"); } catch { /* CI may provide environment variables. */ }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !service) throw new Error("Missing Supabase environment variables");
// Read-only diagnostics: never print keys, tokens, passwords, or account emails.
try {
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
  const settings = await response.json();
  console.log(JSON.stringify({ authSettingsStatus: response.status, signupDisabled: settings.disable_signup, emailProvider: settings.external?.email, googleProvider: settings.external?.google }));
  const client = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error, count, status } = await client.from("profiles").select("must_change_password,provisioned_by_admin", { count: "exact" }).limit(0);
  console.log(JSON.stringify({ passwordMigrationReady: !error, databaseStatus: status, profileCount: count, databaseErrorCode: error?.code }));
  const profiles = [];
  for (let from = 0; ; from += 500) {
    const result = await client.from("profiles").select("id,role").order("id").range(from, from + 499);
    if (result.error) throw new Error("Profile audit failed");
    profiles.push(...result.data);
    if (result.data.length < 500) break;
  }
  const users = [];
  for (let page = 1; ; page++) {
    const result = await client.auth.admin.listUsers({ page, perPage: 500 });
    if (result.error) throw new Error("Auth audit failed");
    users.push(...result.data.users);
    if (result.data.users.length < 500) break;
  }
  const userIds = new Set(users.map((u) => u.id));
  const profileIds = new Set(profiles.map((p) => p.id));
  console.log(JSON.stringify({ legacyAudit: {
    profiles: profiles.length, authUsers: users.length,
    orphanProfileIds: profiles.filter((p) => !userIds.has(p.id)).map((p) => p.id),
    authWithoutProfileIds: users.filter((u) => !profileIds.has(u.id)).map((u) => u.id),
    // Identity inspection is only a review hint, not proof of password presence.
    studentsWithoutEmailIdentity: profiles.filter((p) => p.role === "STUDENT" && !users.find((u) => u.id === p.id)?.identities?.some((i) => i.provider === "email")).map((p) => p.id),
  } }));
} catch {
  console.error("Cannot reach Supabase; no credentials or server response were logged.");
  process.exitCode = 1;
}
