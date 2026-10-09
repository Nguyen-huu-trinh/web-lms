import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

const actionUrl = new URL("../app/(lms)/courses/access-actions.ts", import.meta.url).href;
const state = { context: {}, error: null, authError: null, checks: 0 };
globalThis.__teacherAccessTest = state;
const source = (text) => ({ url: "data:text/javascript," + encodeURIComponent(text), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === actionUrl) {
      if (specifier === "@/services/auth") return source('export async function requireUser() { if(globalThis.__teacherAccessTest.authError) throw globalThis.__teacherAccessTest.authError; return {client:{},profile:{id:"student"}}; }');
      if (specifier === "@/repositories/lms") return source('export async function teacherContext() { const s=globalThis.__teacherAccessTest; s.checks++; if(s.error) throw s.error; return s.context; }');
      if (specifier === "@/lib/learning") return { url: new URL("../lib/learning.ts", import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === actionUrl) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { checkTeacherAccess } = await import(actionUrl);
test("entry checks current permissions on every click and separates denial from errors", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(await checkTeacherAccess("invalid"), "denied");
  assert.equal(state.checks, 0);
  assert.equal(await checkTeacherAccess(id), "allowed");
  state.context = null;
  assert.equal(await checkTeacherAccess(id), "denied");
  assert.equal(state.checks, 2);
  state.error = new Error("Private database error");
  assert.equal(await checkTeacherAccess(id), "error");
  state.authError = new Error("NEXT_REDIRECT");
  await assert.rejects(checkTeacherAccess(id), /NEXT_REDIRECT/);
});
