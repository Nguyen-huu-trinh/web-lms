import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

const workspaceUrl = new URL("../components/learning/teacher-workspace.tsx", import.meta.url).href;
const linkUrl = new URL("../components/ui/navigation-link.tsx", import.meta.url).href;
const state = { params: new URLSearchParams(), local: null, navigation: null };
globalThis.__workspaceTest = state;
const moduleSource = source => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if ([workspaceUrl, linkUrl].includes(context.parentURL)) {
      if (specifier === "react") return moduleSource('export const useMemo = fn => fn(); export const useState = () => [false, () => {}]; export const useContext = context => context.catalog ? globalThis.__workspaceTest.navigation : globalThis.__workspaceTest.local;');
      if (specifier === "next/navigation") return moduleSource('export const useSearchParams = () => globalThis.__workspaceTest.params;');
      if (specifier === "next/link") return moduleSource('export default "next-link"; export const useLinkStatus = () => ({pending:false});');
      if (specifier.endsWith("local-learning-context")) return moduleSource('export const LocalLearningContext = {Provider:"provider"};');
      if (specifier.endsWith("learning-navigation-context")) return moduleSource('export const LearningNavigationContext = {catalog:true};');
      if (specifier.endsWith("student-course-detail")) return moduleSource('export const StudentCourseDetail = "course-detail";');
      if (specifier.endsWith("lesson-workspace")) return moduleSource('export const LessonWorkspace = "lesson-workspace";');
      if (specifier.endsWith("/navigation-link")) return { url: linkUrl, shortCircuit: true };
      if (specifier.endsWith("/icon")) return moduleSource('export const Icon = "icon";');
      if (specifier.endsWith("shared")) return moduleSource('export const AccessDenied = "denied";');
      if (specifier.endsWith(".css")) return moduleSource('export default {};');
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if ([workspaceUrl, linkUrl].includes(url)) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { TeacherWorkspace } = await import(workspaceUrl);
const { NavigationLink } = await import(linkUrl);
const content = { course: { id: "course-a", title: "Course A" }, chapters: [{ id: "chapter" }], lessons: [{ id: "lesson-a", title: "Lesson A" }], completed: [] };
const material = { id: "pdf-a", lesson_id: "lesson-a", title: "Document A", type: "pdf" };
const props = { teacher: { id: "teacher" }, subject: { grade: "12" }, grades: [], curriculum: { contents: [content], materials: [material] }, overview: "teacher-overview" };
function find(node, type) {
  if (!node || typeof node !== "object") return;
  if (node.type === type) return node;
  return [node.props?.children].flat(Infinity).map(child => find(child, type)).find(Boolean);
}

test("teacher, course and lesson render from the same preloaded data with no fetch", t => {
  t.mock.method(globalThis, "fetch", () => assert.fail("Unexpected navigation fetch"));
  for (const query of ["", "course=course-a", "lesson=lesson-a", "course=course-a", ""]) {
    state.params = new URLSearchParams(query);
    const tree = TeacherWorkspace(props);
    if (!query) assert.equal(tree.props.children, "teacher-overview");
    if (query.startsWith("course=")) assert.equal(find(tree, "course-detail").props.content, content);
    if (query.startsWith("lesson=")) {
      const lesson = find(tree, "lesson-workspace");
      assert.equal(lesson.props.content, content);
      assert.deepEqual(lesson.props.materials, [material]);
    }
  }
  state.params = new URLSearchParams("lesson=not-authorized");
  assert.ok(find(TeacherWorkspace(props), "denied"));
});

test("internal links use history immediately while outside links and modified clicks retain normal behavior", t => {
  state.local = TeacherWorkspace(props).props.value;
  const calls = [];
  const previous = globalThis.window;
  globalThis.window = { history: { pushState: (...args) => calls.push(args) }, scrollTo: () => {} };
  t.after(() => { globalThis.window = previous; state.local = null; });
  for (const [href, expected] of [["/courses/course-a", "?course=course-a"], ["/lessons/lesson-a", "?lesson=lesson-a"], ["/courses/teachers/teacher", ""]]) {
    const link = NavigationLink({ href, children: "Open" });
    assert.equal(link.type, "a");
    assert.equal(link.props.href, "/courses/teachers/teacher" + expected);
    const event = { button: 0, preventDefault() { this.defaultPrevented = true; } };
    link.props.onClick(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(calls.at(-1)[2], link.props.href);
    const count = calls.length;
    link.props.onClick({ button: 0, ctrlKey: true });
    assert.equal(calls.length, count);
  }
  assert.equal(NavigationLink({ href: "/courses/other", children: "Other" }).type, "next-link");
});

test("admin navigation keeps preloaded editing controls and new progress replaces the loaded snapshot", () => {
  state.params = new URLSearchParams("lesson=lesson-a");
  const updatedContent = { ...content, completed: ["lesson-a"], percent: 100 };
  const tree = TeacherWorkspace({ ...props, curriculum: { ...props.curriculum, contents: [updatedContent] }, admin: true, materialActions: { "pdf-a": "edit-pdf" }, materialTools: { "lesson-a": "add-material" } });
  const lesson = find(tree, "lesson-workspace");
  assert.equal(lesson.props.student, false);
  assert.equal(lesson.props.materialTools, "add-material");
  assert.equal(lesson.props.materialActions["pdf-a"], "edit-pdf");
  assert.deepEqual(lesson.props.content.completed, ["lesson-a"]);
});

test("logo, breadcrumbs and grade links all use the shared catalog return path", t => {
  const calls = [];
  state.navigation = { navigateCatalog: href => calls.push(href) };
  t.after(() => { state.navigation = null; });
  for (const href of ["/courses", "/courses?filter=all", "/courses?grade=12&subject=math&filter=all"]) {
    const link = NavigationLink({ href, prefetch: true });
    let prevented = false;
    link.props.onNavigate({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(link.props.prefetch, false);
    assert.equal(calls.at(-1), href);
  }
});
