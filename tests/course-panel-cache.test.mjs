import { test } from "node:test";
import assert from "node:assert/strict";
import { createCoursePanelCache } from "../lib/course-panel-cache.ts";

test("switching A to B to A reuses a loaded panel without another request", async () => {
  const calls = [];
  const load = createCoursePanelCache(async (id) => { calls.push(id); return { id }; });
  const first = await load("a");
  await load("b");
  assert.equal(await load("a"), first);
  assert.deepEqual(calls, ["a", "b"]);
});

test("rapid repeated selection shares one in-flight request", async () => {
  let finish;
  let calls = 0;
  const load = createCoursePanelCache(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  const first = load("a");
  const second = load("a");
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish({ id: "a" });
  assert.deepEqual(await second, { id: "a" });
});

test("failed reads are retryable and another browser instance never shares cached panels", async () => {
  let calls = 0;
  const load = createCoursePanelCache(async () => { if (++calls === 1) throw new Error("denied"); return "allowed"; });
  await assert.rejects(load("a"), /denied/);
  assert.equal(await load("a"), "allowed");
  assert.equal(calls, 2);
  const other = createCoursePanelCache(async () => "other user");
  assert.equal(await other("a"), "other user");
});
