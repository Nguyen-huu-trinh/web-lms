import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

const url = new URL("../components/learning/learning-prefetch.tsx", import.meta.url).href;
const state = { calls: [], cleanups: [] };
globalThis.__prefetchTest = state;
const source = text => ({ url: "data:text/javascript," + encodeURIComponent(text), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === url) {
      if (specifier === "react") return source('export const useContext = () => globalThis.__prefetchTest.local; export const useEffect = fn => globalThis.__prefetchTest.cleanups.push(fn());');
      if (specifier === "./local-learning-context") return source('export const LocalLearningContext = {};');
      if (specifier === "next/navigation") return source('export const useRouter = () => ({ prefetch: (...args) => globalThis.__prefetchTest.calls.push(args) });');
      if (specifier === "@/lib/learning-prefetch") return { url: new URL("../lib/learning-prefetch.ts", import.meta.url).href, shortCircuit: true };
      if (specifier.startsWith("next/dist/")) return next(specifier + ".js", context);
    }
    return next(specifier, context);
  },
  load(id, context, next) {
    if (id === url) return { format: "module", source: ts.transpileModule(readFileSync(new URL(id), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    return next(id, context);
  },
});
const { LearningPrefetch } = await import(url);

function environment(t) {
  state.local = null;
  state.calls.length = 0;
  state.cleanups.length = 0;
  const timers = [];
  const originals = new Map(["setTimeout", "clearTimeout", "navigator", "document"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const values = {
    setTimeout: (fn, delay) => { const timer = { fn, delay }; timers.push(timer); return timer; },
    clearTimeout: timer => { timer.cancelled = true; },
    navigator: { onLine: true }, document: { visibilityState: "visible" },
  };
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, value });
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return { timers, values };
}

test("teacher warms every course using FULL payloads, starting immediately and deduplicating", t => {
  const { timers } = environment(t);
  LearningPrefetch({ allCourses: true, routes: ["/courses/a", "/courses/b", "/courses/c", "/courses/a", "/lessons/no", "https://other.test"] });
  assert.deepEqual(timers.map(timer => timer.delay), [0, 300, 600]);
  timers.forEach(timer => timer.fn());
  assert.deepEqual(state.calls, ["a", "b", "c"].map(id => [`/courses/${id}`, { kind: "full" }]));
  state.cleanups.forEach(cleanup => cleanup());
  assert.ok(timers.every(timer => timer.cancelled));
});

test("loaded teacher workspace never schedules additional route fetches", t => {
  const { timers } = environment(t);
  state.local = {};
  LearningPrefetch({ routes: ["/lessons/a", "/lessons/b"] });
  assert.equal(timers.length, 0);
  assert.deepEqual(state.calls, []);
});

test("lesson warming remains bounded and respects visibility and network at execution time", t => {
  const { timers, values } = environment(t);
  LearningPrefetch({ routes: ["/lessons/a", "/lessons/b", "/lessons/c"] });
  assert.equal(timers.length, 2);
  values.document.visibilityState = "hidden";
  timers[0].fn();
  values.document.visibilityState = "visible";
  values.navigator.onLine = false;
  timers[1].fn();
  assert.deepEqual(state.calls, []);
});
