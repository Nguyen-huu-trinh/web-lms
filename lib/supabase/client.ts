"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "./env";
import type { Database } from "@/types/database";
export function createClient() {
  const { url, key } = publicConfig();
  return createBrowserClient<Database>(url, key);
}
