import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesCatalogSearch, isMyCoursesFilter } from "../lib/catalog-search.ts";
test("students default to all while mine remains an explicit choice", () => {
 assert.equal(isMyCoursesFilter("STUDENT"), false);
 assert.equal(isMyCoursesFilter("STUDENT", "mine"), true);
 assert.equal(isMyCoursesFilter("STUDENT", "all"), false);
 assert.equal(isMyCoursesFilter("ADMIN"), false);
 assert.equal(isMyCoursesFilter("ADMIN", "mine"), true);
});
test("catalog search ignores Vietnamese accents, casing and extra whitespace", () => {
 assert.equal(matchesCatalogSearch("Đỗ Văn Đức", "do van duc"), true);
 assert.equal(matchesCatalogSearch("Toán học", "  TOAN  "), true);
 assert.equal(matchesCatalogSearch("Vật lý", "toan"), false);
 assert.equal(matchesCatalogSearch("Toán học", ""), true);
});
