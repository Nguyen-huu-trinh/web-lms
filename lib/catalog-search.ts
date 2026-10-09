export function normalizeCatalogSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim().replace(/\s+/g, " ");
}

export function matchesCatalogSearch(name: string, query: string) {
  return normalizeCatalogSearch(name).includes(normalizeCatalogSearch(query));
}

export function isMyCoursesFilter(role: string, filter?: string) {
  return filter === "mine" && (role === "STUDENT" || role === "ADMIN");
}
