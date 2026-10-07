export const LEARNING_CACHE_TAG = "lms:learning:v1";
export const PRICING_CACHE_TAG = "lms:pricing:v1";
export const LEARNING_CACHE_SECONDS = 60;
export type DataReader = <T>(key: string, load: () => Promise<T>) => Promise<T>;
export const uncached: DataReader = (_key, load) => load();

// Identity and session are part of the key, never bearer tokens or cookies.
export function learningCacheKey(project: string, userId: string, sessionId: string, role: string, key: string) {
  return ["lms-data-v1", project, userId, sessionId, role, key];
}
