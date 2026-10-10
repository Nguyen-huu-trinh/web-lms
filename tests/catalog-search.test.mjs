import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesCatalogSearch, isMyCoursesFilter } from "../lib/catalog-search.ts";
test("catalog defaults to mine while all remains an explicit choice", () => {
 assert.equal(isMyCoursesFilter("STUDENT"), true);
 assert.equal(isMyCoursesFilter("STUDENT", "mine"), true);
 assert.equal(isMyCoursesFilter("STUDENT", "all"), false);
 assert.equal(isMyCoursesFilter("ADMIN"), true);
 assert.equal(isMyCoursesFilter("ADMIN", "mine"), true);
 assert.equal(isMyCoursesFilter("ADMIN", "all"), false);
 assert.equal(isMyCoursesFilter("STUDENT", "invalid"), false);
});
test("catalog search ignores Vietnamese accents, casing and extra whitespace", () => {
 assert.equal(matchesCatalogSearch("Đỗ Văn Đức", "do van duc"), true);
 assert.equal(matchesCatalogSearch("Toán học", "  TOAN  "), true);
 assert.equal(matchesCatalogSearch("Vật lý", "toan"), false);
 assert.equal(matchesCatalogSearch("Toán học", ""), true);
});
