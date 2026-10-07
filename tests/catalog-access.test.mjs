import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { registerHooks } from "node:module";

// Isolate the server-only marker for repository tests without a Next runtime.
const repositoryUrl = new URL("../repositories/catalog-access.ts", import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL === repositoryUrl && specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  if (context.parentURL === repositoryUrl && specifier === "./pagination") return { url: new URL("../repositories/pagination.ts", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { catalogAccess, catalogAccessCounts, studentAccessList } = await import(repositoryUrl);

function clientFor(tables, failTable) {
  const requests = [];
  return { requests, from(table) {
    const filters = [];
    const query = {
      select() { return query; }, order() { return query; },
      eq(column, value) { filters.push((row) => row[column] === value); return query; },
      in(column, values) {
        assert.ok(values.length > 0 && values.length <= 100, "ID batches must be bounded and non-empty");
        filters.push((row) => values.includes(row[column])); return query;
      },
      async range(from, to) {
        const rows = (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row))).slice(from, to + 1);
        requests.push({ table, from, count: rows.length });
        return { data: rows, error: table === failTable ? new Error("database failure") : null };
      },
    };
    return query;
  } };
}

test("catalog access only returns visible subject/teachers and loads matching profiles", async () => {
  const client = clientFor({
    student_subject_access: [{ id: "a", student_id: "s1", subject_id: "visible", created_at: "today" }, { id: "b", student_id: "s2", subject_id: "other" }],
    student_teacher_access: [{ id: "c", student_id: "s1", teacher_id: "t1", created_at: "today" }, { id: "d", student_id: "s2", teacher_id: "t2" }],
    profiles: [{ id: "s1", email: "one@example.test", role: "STUDENT" }, { id: "s2", email: "two@example.test", role: "STUDENT" }],
  });
  const result = await catalogAccess(client, "visible", ["t1"]);
  assert.deepEqual(result.subject, [{ id: "a", email: "one@example.test", created_at: "today" }]);
  assert.deepEqual([...result.teachers.keys()], ["t1"]);
  assert.equal(result.teachers.get("t1")[0].email, "one@example.test");
  assert.equal(client.requests.find((request) => request.table === "profiles").count, 1);
});

test("large subject lists preserve all rows across pagination and bounded profile batches", async () => {
  const students = Array.from({ length: 1203 }, (_, i) => ({ id: `s${i}`, email: `${i}@example.test`, role: "STUDENT" }));
  const client = clientFor({ profiles: students, student_subject_access: students.map((student) => ({ id: student.id, student_id: student.id, subject_id: "visible", created_at: "today" })) });
  const result = await catalogAccess(client, "visible", []);
  assert.equal(result.subject.length, 1203);
  assert.equal(result.subject.at(-1).email, "1202@example.test");
  assert.equal(client.requests.filter((request) => request.table === "profiles").length, 13);
  assert.equal(client.requests.filter((request) => request.table === "student_teacher_access").length, 0);
});

test("empty lists skip profile queries and database errors remain errors", async () => {
  const client = clientFor({});
  const result = await catalogAccess(client, "empty", []);
  assert.equal(result.subject.length, 0);
  assert.equal(client.requests.length, 1);
  await assert.rejects(catalogAccess(clientFor({}, "student_subject_access"), "visible", []));
});

// Exercise the real SDK query encoder; fixtures never enter application code or production DB.
function httpClient(handler) {
  return createClient("https://example.test", "test-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: handler } });
}

test("catalog counts do not request student profiles or student identities", async () => {
  const requests = [];
  const client = httpClient(async (input, init) => {
    const url = new URL(input);
    requests.push({ url, method: init.method });
    if (url.pathname.endsWith("student_subject_access")) return new Response(null, { headers: { "content-range": "0-0/1203" } });
    return Response.json([{ teacher_id: "t1" }, { teacher_id: "t1" }, { teacher_id: "t2" }]);
  });
  const result = await catalogAccessCounts(client, "subject", ["t1", "t2"]);
  assert.equal(result.subject, 1203);
  assert.equal(result.teachers.get("t1"), 2);
  assert.equal(requests.length, 2);
  assert.equal(requests.find(({ url }) => url.pathname.endsWith("student_subject_access")).method, "HEAD");
  assert.equal(requests.find(({ url }) => url.pathname.endsWith("student_teacher_access")).url.searchParams.get("select"), "teacher_id");
  assert.ok(requests.every(({ url }) => !url.pathname.endsWith("profiles")));
});

test("student pages search the joined profile and bound the response to 50 rows", async () => {
  for (const kind of ["subject", "teacher"]) {
    let requested;
    const client = httpClient(async (input) => {
      requested = new URL(input);
      return Response.json([{ id: "grant", created_at: "2026-10-07", student: { username: "an_01", email: "internal@example.test" } }], { headers: { "content-range": "50-50/51" } });
    });
    const result = await studentAccessList(client, kind, "target", 1, "an_01");
    assert.equal(requested.searchParams.get("offset"), "50");
    assert.equal(requested.searchParams.get("limit"), "50");
    assert.equal(requested.searchParams.get(kind + "_id"), "eq.target");
    assert.equal(requested.searchParams.get("student.role"), "eq.STUDENT");
    assert.ok(requested.searchParams.get("select").includes("!inner"));
    assert.ok(requested.searchParams.get("student.or").includes("username.ilike."));
    assert.equal(result.total, 51);
    assert.equal(result.rows[0].email, "an_01");
    assert.equal(result.pageSize, 50);
  }
});

test("student list failures stay errors; empty and legacy-name results remain usable", async () => {
  const bad = httpClient(async () => Response.json({ message: "denied" }, { status: 403 }));
  await assert.rejects(studentAccessList(bad, "subject", "target"));
  await assert.rejects(catalogAccessCounts(bad, "subject", []));
  const empty = httpClient(async () => Response.json([], { headers: { "content-range": "*/0" } }));
  assert.equal((await studentAccessList(empty, "teacher", "target")).rows.length, 0);
  const legacy = httpClient(async () => Response.json([{ id: "grant", created_at: "today", student: { username: null, email: "legacy@example.test" } }], { headers: { "content-range": "0-0/1" } }));
  assert.equal((await studentAccessList(legacy, "subject", "target")).rows[0].email, "legacy@example.test");
});
