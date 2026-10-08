import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { learningCacheKey } from "../lib/cache/policy.ts";
import { createClient } from "@supabase/supabase-js";
const repositoryUrl = new URL("../repositories/lms.ts", import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL === repositoryUrl) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    if (specifier === "./pagination") return { url: new URL("../repositories/pagination.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/cache/policy") return { url: new URL("../lib/cache/policy.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/learning") return { url: new URL("../lib/learning.ts", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { createCourseReader, courseContent, courseProgressSummaries, lessonContent, teacherContext, teacherCourses, catalog, listMenus } = await import(repositoryUrl);
function fixture(tables, failTable) {
  const calls = [];
  const client = createClient("https://example.test", "test-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(input);
    const table = url.pathname.split("/").at(-1);
    calls.push(table);
    if (table === failTable) return Response.json({ message: "unavailable" }, { status: 500 });
    let rows = tables[table] ?? [];
    for (const [column, value] of url.searchParams) {
      if (value.startsWith("eq.")) rows = rows.filter((row) => String(row[column]) === value.slice(3));
      if (value.startsWith("in.(")) rows = rows.filter((row) => value.slice(4,-1).split(",").includes(row[column]));
    }
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? rows.length);
    rows = rows.slice(offset, offset + limit);
    const accept = new Headers(init.headers).get("accept") ?? "";
    return Response.json(accept.includes("vnd.pgrst.object") ? rows[0] ?? null : rows);
  } } });
  return { client, calls };
}
const course = { id: "course", teacher_id: "teacher", title: "Course" };
const tables = {
  subjects: [{ id: "subject", name: "Math" }], teachers: [{ id: "teacher", subject_id: "subject" }], courses: [course],
  chapters: [{ id: "chapter", course_id: "course", order_index: 0 }],
  lessons: [{ id: "lesson", chapter_id: "chapter", order_index: 0 }],
  user_progress: [{ id: "progress", lesson_id: "lesson", student_id: "student", is_completed: true }],
  materials: [{ id: "material", lesson_id: "lesson", order_index: 0 }],
  student_subject_access: [{ id: "grant", subject_id: "subject", student_id: "student" }],
};

test("known course avoids duplicate metadata reads and retains completion", async () => {
  const { client, calls } = fixture(tables);
  const result = await courseContent(client, "course", "student", course);
  assert.equal(result.percent, 100);
  assert.equal(calls.filter((table) => table === "courses").length, 0);
  assert.deepEqual(result.completed, ["lesson"]);
});

test("batched progress stays isolated by course and handles empty courses", async () => {
  const { client } = fixture(tables);
  const result = await courseProgressSummaries(client, ["course", "empty"], "student");
  assert.deepEqual(result.course, { count: 1, total: 1, percent: 100 });
  assert.deepEqual(result.empty, { count: 0, total: 0, percent: 0 });
});

test("parallel lesson reads retain access denial and do not refetch course metadata", async () => {
  const { client, calls } = fixture(tables);
  const result = await lessonContent(client, "lesson", { id: "student", role: "STUDENT" });
  assert.equal(result.materials.length, 1);
  assert.equal(result.content.percent, 100);
  assert.equal(calls.filter((table) => table === "courses").length, 1);
  const denied = fixture({ ...tables, student_subject_access: [] });
  assert.equal(await lessonContent(denied.client, "lesson", { id: "student", role: "STUDENT" }), null);
  const failed = fixture(tables, "student_subject_access");
  await assert.rejects(teacherContext(failed.client, "teacher", { id: "student", role: "STUDENT" }));
});


// In-memory cache adapter tests repository behavior; production uses Next Data Cache.
function memoryReader() {
  const values = new Map();
  return async (key, load) => {
    if (!values.has(key)) values.set(key, await load());
    return values.get(key);
  };
}

test("cache keys isolate project, user, session, role and resource", () => {
  const original = ["project", "user", "session", "STUDENT", "course:one"];
  const base = learningCacheKey(...original);
  for (let i = 0; i < original.length; i++) {
    const changed = [...original]; changed[i] += "-different";
    assert.notDeepEqual(learningCacheKey(...changed), base);
  }
});

test("cached outline reuses metadata but progress and course authorization stay live", async () => {
  const data = structuredClone(tables);
  const { client, calls } = fixture(data);
  const read = memoryReader();
  assert.equal((await courseContent(client, "course", "student", course, read)).percent, 100);
  data.user_progress = [];
  assert.equal((await courseContent(client, "course", "student", course, read)).percent, 0);
  assert.equal(calls.filter((table) => table === "chapters").length, 1);
  assert.equal(calls.filter((table) => table === "lessons").length, 1);
  assert.equal(calls.filter((table) => table === "user_progress").length, 2);
  // Simulate RLS denying a formerly visible course, even with knownCourse provided.
  data.courses = [];
  assert.equal(await courseContent(client, "course", "student", course, read), null);
});

test("teacher membership revocation denies a previously cached course list", async () => {
  const data = structuredClone(tables);
  const { client, calls } = fixture(data);
  const read = memoryReader();
  const profile = { id: "student", role: "STUDENT" };
  assert.equal((await teacherCourses(client, "teacher", read, profile)).length, 1);
  assert.equal((await teacherCourses(client, "teacher", read, profile)).length, 1);
  assert.equal(calls.filter((table) => table === "courses").length, 1);
  data.student_subject_access = [];
  assert.deepEqual(await teacherCourses(client, "teacher", read, profile), []);
  assert.deepEqual(await teacherCourses(client, "teacher", read), []);
});

test("catalog metadata and pricing reuse cache while grants are refreshed", async () => {
  const data = structuredClone(tables);
  data.menus = [{ id: "price", name: "Fee", price: 100 }];
  const { client, calls } = fixture(data);
  const read = memoryReader();
  const profile = { id: "student", role: "STUDENT" };
  assert.equal((await catalog(client, profile, read)).accessibleTeacherIds.has("teacher"), true);
  data.student_subject_access = [];
  assert.equal((await catalog(client, profile, read)).accessibleTeacherIds.has("teacher"), false);
  assert.equal(calls.filter((table) => table === "subjects").length, 1);
  assert.equal(calls.filter((table) => table === "teachers").length, 1);
  await listMenus(client, read); await listMenus(client, read);
  assert.equal(calls.filter((table) => table === "menus").length, 1);
});

test("a warm lesson cache cannot bypass a fresh RLS denial", async () => {
  const data = structuredClone(tables);
  const { client, calls } = fixture(data);
  const read = memoryReader();
  const profile = { id: "student", role: "STUDENT" };
  assert.equal((await lessonContent(client, "lesson", profile, read)).materials.length, 1);
  await lessonContent(client, "lesson", profile, read);
  assert.equal(calls.filter((table) => table === "materials").length, 1);
  data.lessons = [];
  assert.equal(await lessonContent(client, "lesson", profile, read), null);
});


test("request reader reuses course and teacher checks even outside React rendering", async () => {
  const { client, calls } = fixture(tables);
  const reader = createCourseReader(client, { id: "student", role: "STUDENT" }, memoryReader());
  const [metadata, context] = await Promise.all([reader.course("course"), reader.teacher("teacher")]);
  assert.equal(metadata.id, "course");
  assert.equal(context.teacher.id, "teacher");
  const [content, courses] = await Promise.all([reader.content("course"), reader.courses("teacher")]);
  assert.equal(content.percent, 100);
  assert.equal(courses.length, 1);
  // One course lookup plus one list query; no extra lookup inside content().
  assert.equal(calls.filter((table) => table === "courses").length, 2);
  assert.equal(calls.filter((table) => table === "teachers").length, 1);
  assert.equal(calls.filter((table) => table === "student_subject_access").length, 1);
});

test("new request reader rechecks revoked access even with warm data cache", async () => {
  const data = structuredClone(tables);
  const { client } = fixture(data);
  const read = memoryReader();
  const profile = { id: "student", role: "STUDENT" };
  const first = createCourseReader(client, profile, read);
  assert.equal((await first.content("course")).percent, 100);
  assert.equal((await first.courses("teacher")).length, 1);
  data.courses = [];
  data.student_subject_access = [];
  const next = createCourseReader(client, profile, read);
  assert.equal(await next.content("course"), null);
  assert.equal(await next.teacher("teacher"), null);
  assert.deepEqual(await next.courses("teacher"), []);
});
