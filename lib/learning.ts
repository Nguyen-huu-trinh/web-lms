export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function progressSummary(lessonIds: string[], completedIds: string[]) {
  const lessons = new Set(lessonIds);
  const completed = new Set(completedIds.filter((id) => lessons.has(id)));
  return { total: lessons.size, count: completed.size, percent: lessons.size ? Math.round(completed.size / lessons.size * 100) : 0 };
}

// Only allow known provider hosts. Never place an arbitrary URL into an iframe.
export function materialLink(provider: string, raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const hosts = provider === "drive" ? ["drive.google.com"] : provider === "youtube" ? ["youtube.com", "www.youtube.com", "youtu.be"] : [];
    return hosts.includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

export function videoEmbed(provider: string, raw: string): string | null {
  const safe = materialLink(provider, raw);
  if (!safe) return null;
  const url = new URL(safe);
  if (provider === "youtube") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = url.hostname === "youtu.be" ? parts[0] : url.pathname === "/watch" ? url.searchParams.get("v") : ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null;
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ?? url.searchParams.get("id");
  return id && /^[\w-]+$/.test(id) ? `https://drive.google.com/file/d/${id}/preview` : null;
}
