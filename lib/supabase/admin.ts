import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "./env";
import type { Database } from "@/types/database";

// Only for Auth provisioning/username resolution/session activation. LMS queries use RLS.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.");
  return createClient<Database>(publicConfig().url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
