import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { localCatalogHref } from "../lib/catalog-navigation.ts";

const shellUrl = new URL("../components/learning/learning-shell.tsx", import.meta.url).href;
const state = { transitions: 0, routes: [] };
globalThis.__catalogNavigationTest = state;
const source = text => ({ url: "data:text/javascript," + encodeURIComponent(text), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === shellUrl) {
      if (specifier === "react") return source('export const useTransition = () => [false, fn => { globalThis.__catalogNavigationTest.transitions++; fn(); }];');
      if (specifier === "next/navigation") return source('export const useRouter = () => ({push: href => globalThis.__catalogNavigationTest.routes.push(href)});');
      if (specifier === "./navigation") return source('export const Navigation = "navigation";');
      if (specifier === "./catalog-skeleton") return source('export const CatalogSkeleton = "skeleton";');
      if (specifier === "@/lib/catalog-navigation") return { url: new URL("../lib/catalog-navigation.ts", import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === shellUrl) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { LearningShell } = await import(shellUrl);

test("filter switches preserve loaded search, grade and subject across round trips", () => {
  const start = "/courses?filter=mine&grade=12&subject=math&q=An";
  const all = localCatalogHref(start, "/courses?filter=all");
  assert.equal(all, "/courses?filter=all&grade=12&subject=math&q=An");
  assert.equal(localCatalogHref(all, "/courses?filter=mine"), start);
  assert.equal(localCatalogHref("/courses", "/courses?filter=all"), "/courses?filter=all");
});

test("different search scopes, page routes and external URLs require normal navigation", () => {
  for (const [current, target] of [
    ["/courses?q=An", "/courses?q=Binh"],
    ["/courses/teachers/teacher", "/courses?filter=all"],
    ["/courses", "/menu"],
    ["/courses", "https://other.test/courses?filter=all"],
    ["/courses", "/courses?password=changed"],
  ]) assert.equal(localCatalogHref(current, target), null);
});

test("header switching reuses the catalog without router requests or loading transitions", t => {
  const previous = globalThis.window;
  const history = [];
  globalThis.window = {
    location: { pathname: "/courses", search: "?filter=mine&grade=12" },
    history: { pushState: (_state, _title, href) => {
      history.push(href);
      const url = new URL(href, "https://example.test");
      globalThis.window.location = { pathname: url.pathname, search: url.search };
    } },
  };
  t.after(() => { globalThis.window = previous; });
  const tree = LearningShell({ name: "Student", admin: false, children: "catalog" });
  const navigate = tree.props.children[0].props.onCatalogNavigate;
  for (const filter of ["all", "mine", "all", "all"]) navigate("/courses?filter=" + filter);
  assert.equal(history.length, 3);
  assert.equal(state.transitions, 0);
  assert.deepEqual(state.routes, []);
  // Going back restores the query against the same mounted catalog snapshot.
  globalThis.window.location.search = "?filter=mine&grade=12";
  navigate("/courses?filter=mine");
  assert.equal(history.length, 3);
  globalThis.window.location.pathname = "/courses/teachers/teacher";
  navigate("/courses?filter=all");
  assert.equal(state.transitions, 1);
  assert.deepEqual(state.routes, ["/courses?filter=all"]);
});
