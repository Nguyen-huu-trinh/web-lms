import { test } from "node:test";
import assert from "node:assert/strict";
import { nextLessonRoutes, allowBackgroundPrefetch } from "../lib/learning-prefetch.ts";

const chapters = [{ id: "b", order_index: 2 }, { id: "a", order_index: 1 }];
const lessons = [
  { id: "third", chapter_id: "b", order_index: 0 },
  { id: "second", chapter_id: "a", order_index: 2 },
  { id: "first", chapter_id: "a", order_index: 1 },
];
test("course prefetch follows curriculum order and skips completed lessons", () => {
  assert.deepEqual(nextLessonRoutes(chapters, lessons, ["first"]), ["/lessons/second", "/lessons/third"]);
  assert.deepEqual(lessons.map(x => x.id), ["third", "second", "first"]);
});
test("lesson prefetch crosses chapter boundaries, stops at end and supports review", () => {
  assert.deepEqual(nextLessonRoutes(chapters, lessons, ["second"], "first"), ["/lessons/second", "/lessons/third"]);
  assert.deepEqual(nextLessonRoutes(chapters, lessons, [], "third"), []);
  assert.deepEqual(nextLessonRoutes(chapters, lessons, [], "missing"), []);
  assert.deepEqual(nextLessonRoutes(chapters, lessons, ["first", "second", "third"]), ["/lessons/first", "/lessons/second"]);
  assert.deepEqual(nextLessonRoutes([], [], []), []);
});
test("large courses never schedule more than two speculative lesson routes", () => {
  const many = Array.from({ length: 10000 }, (_, i) => ({ id: String(i), chapter_id: "a", order_index: i }));
  assert.deepEqual(nextLessonRoutes(chapters, many, []), ["/lessons/0", "/lessons/1"]);
});
test("background downloads respect offline, data saver and slow connections", () => {
  assert.equal(allowBackgroundPrefetch(false), false);
  assert.equal(allowBackgroundPrefetch(true, { saveData: true }), false);
  for (const effectiveType of ["slow-2g", "2g", "3g"]) assert.equal(allowBackgroundPrefetch(true, { effectiveType }), false);
  assert.equal(allowBackgroundPrefetch(true, { effectiveType: "4g" }), true);
  assert.equal(allowBackgroundPrefetch(true), true);
});
