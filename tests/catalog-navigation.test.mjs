import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { catalogNavigationPlan, localCatalogHref } from "../lib/catalog-navigation.ts";

const shellUrl = new URL("../components/learning/learning-shell.tsx", import.meta.url).href;
const navigationUrl = new URL("../components/learning/navigation.tsx", import.meta.url).href;
const state = { transitions: 0, routes: [], refs: [], cursor: 0, effects: [] };
globalThis.__catalogNavigationTest = state;
const source = text => ({ url: "data:text/javascript," + encodeURIComponent(text), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === shellUrl) {
      if (specifier === "react") return source('export const useCallback = fn => fn; export const useEffect = fn => globalThis.__catalogNavigationTest.effects.push(fn); export const useRef = value => { const s=globalThis.__catalogNavigationTest; return s.refs[s.cursor++] ??= {current:value}; };');
      if (specifier === "next/navigation") return source('export const useSearchParams = () => new URLSearchParams(globalThis.window.location.search); export const usePathname = () => globalThis.window.location.pathname; export const useRouter = () => ({push: href => globalThis.__catalogNavigationTest.routes.push(href)});');
      if (specifier === "./learning-navigation-context") return source('export const LearningNavigationContext = {Provider:"navigation-provider"};');
      if (specifier === "./navigation") return source('export const Navigation = "navigation";');
      if (specifier === "./catalog-skeleton") return source('export const CatalogSkeleton = "skeleton";');
      if (specifier === "@/lib/catalog-navigation") return { url: new URL("../lib/catalog-navigation.ts", import.meta.url).href, shortCircuit: true };
    }
    if (context.parentURL === navigationUrl) {
      if (specifier === "react") return source('export const useEffect = () => {}; export const useRef = () => ({current:null}); export const useState = () => [false, () => {}];');
      if (specifier === "next/navigation") return source('export const usePathname = () => "/courses"; export const useSearchParams = () => new URLSearchParams("filter=mine&grade=12");');
      if (specifier.endsWith("/navigation-link")) return source('export const NavigationLink = "a";');
      if (specifier.endsWith("/icon")) return source('export const Icon = "icon";');
      if (specifier.endsWith("/submit-button")) return source('export const SubmitButton = "button";');
      if (specifier.endsWith("/actions")) return source('export const logout = () => {};');
      if (specifier.endsWith(".css")) return source('export default {};');
      if (specifier === "@/lib/catalog-search") return { url: new URL("../lib/catalog-search.ts", import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if ([shellUrl, navigationUrl].includes(url)) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { LearningShell } = await import(shellUrl);
const { Navigation } = await import(navigationUrl);
function renderShell() {
  state.cursor = 0;
  state.effects = [];
  const tree = LearningShell({ name: "Student", admin: false, children: "catalog" });
  state.effects.forEach(effect => effect());
  return tree;
}

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
  const tree = renderShell();
  tree.props.value.registerCatalogEntry("/courses?filter=mine&grade=12");
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
  assert.equal(state.transitions, 0);
  assert.deepEqual(state.routes, ["/courses?filter=mine&grade=12"]);
});

test("all catalog return links reuse the real cached entry and restore the requested selection", () => {
  const cached = "/courses?filter=mine&grade=12";
  for (const target of ["/courses", "/courses?filter=all", "/courses?grade=11&subject=physics&filter=all"]) {
    const plan = catalogNavigationPlan("/courses/teachers/teacher?course=one", target, cached);
    assert.equal(plan.route, cached);
    assert.equal(plan.href, localCatalogHref(cached, target));
  }
  assert.deepEqual(catalogNavigationPlan("/menu", "/courses?q=New", cached), { href: "/courses?q=New", route: "/courses?q=New" });
  assert.deepEqual(catalogNavigationPlan("/menu", "/courses", null), { href: "/courses", route: "/courses" });
});

test("returning from a teacher restores the requested view with replaceState and no second router navigation", t => {
  state.refs = [];
  state.routes = [];
  const original = globalThis.window;
  const replaced = [];
  const setLocation = href => { const url = new URL(href, "https://example.test"); globalThis.window.location = { pathname: url.pathname, search: url.search }; };
  globalThis.window = { history: { pushState: (_state, _title, href) => setLocation(href), replaceState: (_state, _title, href) => { replaced.push(href); setLocation(href); } } };
  t.after(() => { globalThis.window = original; });
  setLocation("/courses?filter=mine&grade=12");
  let tree = renderShell();
  tree.props.value.registerCatalogEntry("/courses?filter=mine&grade=12");
  tree.props.value.navigateCatalog("/courses?filter=all&subject=math");
  setLocation("/courses/teachers/teacher?lesson=one");
  tree = renderShell();
  tree.props.value.navigateCatalog("/courses?filter=all&grade=11&subject=physics");
  assert.deepEqual(state.routes, ["/courses?filter=mine&grade=12"]);
  setLocation(state.routes[0]);
  tree = renderShell();
  tree.props.value.registerCatalogEntry(state.routes[0]);
  assert.deepEqual(replaced, ["/courses?filter=all&grade=11&subject=physics"]);
  tree.props.value.navigateCatalog("/courses?filter=mine");
  assert.equal(state.routes.length, 1);
  assert.equal(globalThis.window.location.search, "?filter=mine&grade=11&subject=physics");
  assert.equal(tree.props.children[1].props.children, "catalog");
  // Repeating an earlier search uses its original cached URL too.
  tree.props.value.registerCatalogEntry("/courses?filter=all&q=An");
  tree.props.value.registerCatalogEntry("/courses?filter=mine&q=Binh");
  setLocation("/courses?filter=mine&q=Binh");
  tree.props.value.navigateCatalog("/courses?filter=mine&grade=12&q=An");
  assert.equal(state.routes.at(-1), "/courses?filter=all&q=An");
  setLocation(state.routes.at(-1));
  tree = renderShell();
  tree.props.value.registerCatalogEntry(state.routes.at(-1));
  assert.equal(globalThis.window.location.search, "?filter=mine&q=An&grade=12");
});

test("header search submits through client navigation instead of reloading the document", t => {
  const original = globalThis.FormData;
  globalThis.FormData = class {
    constructor(form) { this.fields = form.fields; }
    forEach(callback) { for (const [key, value] of this.fields) callback(value, key); }
  };
  t.after(() => { globalThis.FormData = original; });
  const calls = [];
  const tree = Navigation({ name: "Student", admin: false, onCatalogNavigate: href => calls.push(href) });
  function find(node) {
    if (!node || typeof node !== "object") return;
    if (node.props?.id === "header-search") return node;
    return [node.props?.children].flat(Infinity).map(find).find(Boolean);
  }
  let prevented = false;
  find(tree).props.onSubmit({ preventDefault: () => { prevented = true; }, currentTarget: { fields: [["filter", "mine"], ["grade", "12"], ["q", "An"]] } });
  assert.equal(prevented, true);
  assert.deepEqual(calls, ["/courses?filter=mine&grade=12&q=An"]);
});
