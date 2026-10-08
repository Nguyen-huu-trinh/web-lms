import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import ts from "typescript";
import React from "react";
import { renderToPipeableStream } from "react-dom/server";

const browserUrl = new URL("../components/learning/course-browser.tsx", import.meta.url).href;
const moduleSource = (source) => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === browserUrl) {
      if (specifier === "next/navigation") return moduleSource('export const useSearchParams = () => new URLSearchParams();');
      if (specifier.endsWith("panel-actions")) return moduleSource('export const loadCoursePanel = () => { throw new Error("Unexpected panel load during SSR"); };');
      if (specifier.endsWith("/icon")) return moduleSource('export const Icon = () => null;');
      if (specifier.endsWith(".css")) return moduleSource('export default {};');
      if (specifier === "@/lib/course-panel-cache") return { url: new URL("../lib/course-panel-cache.ts", import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === browserUrl) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { CourseBrowser } = await import(browserUrl);

for (const fail of [false, true]) test(fail ? "failed sibling progress does not remove course content" : "course links and content stream before sibling progress", { timeout: 5000 }, async (t) => {
  let finish;
  const progress = new Promise((resolve, reject) => { finish = fail ? reject : resolve; }).catch(() => null);
  const output = new PassThrough();
  let html = "";
  output.on("data", (chunk) => { html += chunk.toString(); });
  const ended = new Promise((resolve) => output.on("end", resolve));
  let shellReady;
  const shell = new Promise((resolve) => { shellReady = resolve; });
  const errors = [];
  const stream = renderToPipeableStream(React.createElement(CourseBrowser, {
    teacherId: "teacher", navigationBase: "/courses/teachers/teacher",
    courses: [{ id: "a", title: "Course A" }, { id: "b", title: "Course B" }],
    initialId: "a", initialPanel: React.createElement("p", null, "Selected course content"),
    initialProgress: { count: 1, total: 2, percent: 50 }, progressByCourse: progress, controls: {},
  }), { onShellReady: shellReady, onError: (error) => errors.push(error) });
  t.after(() => { stream.abort(); output.destroy(); });
  await shell;
  stream.pipe(output);
  assert.match(html, /Selected course content/);
  assert.match(html, /Course B/);
  assert.match(html, /Đang tải tiến độ/);
  assert.match(html, /50%/);
  finish(fail ? new Error("Database unavailable") : { b: { count: 0, total: 0, percent: 0 } });
  await ended;
  assert.match(html, fail ? /Chưa tải được tiến độ/ : /Chưa có bài học/);
  assert.deepEqual(errors, []);
});
