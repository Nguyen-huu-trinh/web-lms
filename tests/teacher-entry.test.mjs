import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

const entryUrl = new URL("../components/learning/teacher-entry.tsx", import.meta.url).href;
const mock = source => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === entryUrl) {
      if (specifier === "@/components/ui/navigation-link") return mock('export const NavigationLink = "a";');
      if (specifier === "@/components/ui/icon") return mock('export const Icon = "svg";');
      if (specifier.endsWith(".module.css")) return mock('export default {enter:"entry"};');
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === entryUrl) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { TeacherEntry } = await import(entryUrl);
test("teacher entry links directly to learning or pricing in all three states", () => {
  for (const [accessible, started, state, href, label] of [
    [true, false, "start", "/courses/teachers/teacher", "B\u1eaft \u0111\u1ea7u h\u1ecdc"],
    [true, true, "continue", "/courses/teachers/teacher", "V\u00e0o h\u1ecdc"],
    [false, false, "purchase", "/menu", "Mua ngay"],
    [false, true, "purchase", "/menu", "Mua ngay"],
  ]) {
    const result = TeacherEntry({id:"teacher", accessible, started});
    assert.equal(result.type, "a");
    assert.equal(result.props.href, href);
    assert.equal(result.props["data-state"], state);
    assert.equal(result.props.children[0], label);
    assert.equal(result.props.onClick, undefined);
  }
});
