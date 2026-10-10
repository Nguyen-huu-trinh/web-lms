type Chapter = { id: string; order_index: number };
type Lesson = { id: string; chapter_id: string; order_index: number };

// Bound speculative work regardless of the total curriculum size.
export function nextLessonRoutes(chapters: Chapter[], lessons: Lesson[], completed: string[], currentId?: string) {
  const groups = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const group = groups.get(lesson.chapter_id) ?? [];
    group.push(lesson);
    groups.set(lesson.chapter_id, group);
  }
  const ordered = [...chapters].sort(compare).flatMap(chapter => (groups.get(chapter.id) ?? []).sort(compare));
  const done = new Set(completed);
  const current = currentId ? ordered.findIndex(lesson => lesson.id === currentId) : -1;
  const remaining = currentId ? (current < 0 ? [] : ordered.slice(current + 1)) : ordered.filter(lesson => !done.has(lesson.id));
  const candidates = !currentId && remaining.length === 0 ? ordered : remaining;
  return candidates.slice(0, 2).map(lesson => `/lessons/${lesson.id}`);
}

function compare(a: { id: string; order_index: number }, b: { id: string; order_index: number }) {
  return a.order_index - b.order_index || a.id.localeCompare(b.id);
}

export function allowBackgroundPrefetch(online: boolean, connection?: { saveData?: boolean; effectiveType?: string }) {
  return online && !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
}
