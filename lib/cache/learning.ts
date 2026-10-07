import "server-only";
import { unstable_cache } from "next/cache";
import type { Profile } from "@/types/database";
import { learningCacheKey, LEARNING_CACHE_SECONDS, LEARNING_CACHE_TAG, PRICING_CACHE_TAG, type DataReader } from "./policy";

// The existing dynamic layout is deliberately retained. unstable_cache is the
// compatible Data Cache API without migrating every authenticated route to Cache Components.
// Call only after requireUser. Repository guards run OUTSIDE this persistent cache.
export function createLearningReader(profile: Profile, sessionId: string): DataReader {
  const project = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return <T>(key: string, load: () => Promise<T>) => unstable_cache(
    load,
    learningCacheKey(project, profile.id, sessionId, profile.role, key),
    { revalidate: LEARNING_CACHE_SECONDS, tags: [key === "pricing" ? PRICING_CACHE_TAG : LEARNING_CACHE_TAG] },
  )();
}
