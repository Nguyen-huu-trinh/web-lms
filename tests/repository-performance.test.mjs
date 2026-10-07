import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createClient } from "@supabase/supabase-js";
const repositoryUrl = new URL("../repositories/lms.ts", import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL === repositoryUrl) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    if (specifier === "./pagination") return { url: new URL("../repositories/pagination.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/learning") return { url: new URL("../lib/learning.ts", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { courseContent, courseProgressSummaries, lessonContent, teacherContext } = await import(repositoryUrl);
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
