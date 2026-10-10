import { matchesCatalogSearch } from "./catalog-search";

export function filterFavoriteTeachers<T extends { id: string; name: string }>(teachers: T[], favorites: ReadonlySet<string>, query: string, onlyFavorites: boolean) {
  return teachers
    .filter(teacher => matchesCatalogSearch(teacher.name, query) && (!onlyFavorites || favorites.has(teacher.id)))
    .sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));
}
