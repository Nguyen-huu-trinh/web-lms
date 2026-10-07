import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicConfig } from "./env";
import type { Database } from "@/types/database";

export async function createClient() {
  const store = await cookies();
  const { url, key } = publicConfig();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Component: proxy persists refreshed cookies. */ }
      },
    },
  });
}
