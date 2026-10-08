import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadCourseContent } from "../lib/load-course-content.ts";

const routeUrl = new URL("../app/(lms)/courses/panel/route.ts", import.meta.url).href;
const moduleSource = (source) => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
const state = { authCalls: 0, authError: null, panelError: null, content: { course: { id: "course" } }, arguments: null };
globalThis.__panelRouteTest = state;
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === routeUrl) {
      if (specifier === "@/services/auth") return moduleSource('export async function requireUser() { const s=globalThis.__panelRouteTest; s.authCalls++; if(s.authError) throw s.authError; return {client:{},profile:{id:"student"},sessionId:"session"}; }');
      if (specifier === "@/lib/cache/learning") return moduleSource('export const createLearningReader = () => null;');
      if (specifier === "@/repositories/lms") return moduleSource('export const createCourseReader = () => ({ panel: async (...args) => { const s=globalThis.__panelRouteTest; s.arguments=args; if(s.panelError) throw s.panelError; return s.content; } });');
      if (specifier === "@/lib/learning") return { url: new URL("../lib/learning.ts", import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === routeUrl) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { GET } = await import(routeUrl);
const teacher = "00000000-0000-4000-8000-000000000001";
const course = "00000000-0000-4000-8000-000000000002";
const request = () => new Request("https://example.test/courses/panel?teacher=" + teacher + "&course=" + course);

test("panel endpoint validates IDs, requires auth and returns private data with timing", async () => {
  assert.equal((await GET(new Request("https://example.test/courses/panel?course=invalid"))).status, 400);
  assert.equal(state.authCalls, 0);
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(state.authCalls, 1);
  assert.deepEqual(state.arguments, [teacher, course]);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("server-timing"), /auth;dur=.*course;dur=/);
  assert.deepEqual(await response.json(), { content: state.content });
});

test("panel endpoint rejects unavailable content, hides database errors and preserves login redirects", async () => {
  state.content = null;
  const denied = await GET(request());
  assert.equal(denied.status, 404);
  assert.equal(denied.headers.get("cache-control"), "private, no-store");
  state.panelError = new Error("private database detail");
  const failed = await GET(request());
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /private database detail/);
  state.panelError = null;
  state.authError = new Error("NEXT_REDIRECT");
  await assert.rejects(GET(request()), /NEXT_REDIRECT/);
  state.authError = null;
});

test("course loader sends a private GET and handles expiry or denied reads", async (t) => {
  let received;
  t.mock.method(globalThis, "fetch", async (...args) => { received=args; return Response.json({ content: { course: { id: course } } }); });
  assert.equal((await loadCourseContent(teacher, course)).course.id, course);
  assert.equal(received[1].cache, "no-store");
  assert.equal(received[1].credentials, "same-origin");
  assert.equal(new URL(received[0], "https://example.test").searchParams.get("teacher"), teacher);
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ error: "Không có quyền" }, { status: 404 }));
  await assert.rejects(loadCourseContent(teacher, course), /Không có quyền/);
  globalThis.fetch.mock.mockImplementation(async () => new Response("Login", { headers: { "Content-Type": "text/html" } }));
  await assert.rejects(loadCourseContent(teacher, course), /Phiên đăng nhập/);
});
