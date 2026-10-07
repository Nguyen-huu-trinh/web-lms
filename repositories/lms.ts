import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Course, Profile } from "@/types/database";
import { allRows } from "./pagination";
import { progressSummary } from "@/lib/learning";
type Client = SupabaseClient<Database>;

export async function catalog(client: Client, profile: Profile) {
  const [subjects, teachers, subjectAccess, teacherAccess] = await Promise.all([
    allRows((a,b) => client.from("subjects").select("*").order("name").order("id").range(a,b)),
    allRows((a,b) => client.from("teachers").select("*").order("name").order("id").range(a,b)),
    profile.role === "ADMIN" ? Promise.resolve([]) : allRows((a,b) => client.from("student_subject_access").select("subject_id").eq("student_id", profile.id).order("id").range(a,b)),
    profile.role === "ADMIN" ? Promise.resolve([]) : allRows((a,b) => client.from("student_teacher_access").select("teacher_id").eq("student_id", profile.id).order("id").range(a,b)),
  ]);
  const subjectIds = new Set(subjectAccess.map((a) => a.subject_id));
  const teacherIds = new Set(teacherAccess.map((a) => a.teacher_id));
  const accessibleTeachers = teachers.filter((t) => profile.role === "ADMIN" || subjectIds.has(t.subject_id) || teacherIds.has(t.id));
  const mySubjectIds = new Set([...subjectIds, ...accessibleTeachers.map((t) => t.subject_id)]);
  return { subjects, teachers, accessibleTeacherIds: new Set(accessibleTeachers.map((t) => t.id)), mySubjectIds };
}

export async function teacherContext(client: Client, teacherId: string, profile: Profile) {
  const { data: teacher, error } = await client.from("teachers").select("*").eq("id", teacherId).maybeSingle();
  if (error) throw new Error("Không thể tải giáo viên.");
  if (!teacher) return null;
  const { data: subject, error: subjectError } = await client.from("subjects").select("*").eq("id", teacher.subject_id).maybeSingle();
  if (subjectError) throw new Error("Không thể tải môn học.");
  if (!subject) return null;
  if (profile.role !== "ADMIN") {
    const [a, b] = await Promise.all([
      client.from("student_subject_access").select("id").eq("student_id", profile.id).eq("subject_id", subject.id).maybeSingle(),
      client.from("student_teacher_access").select("id").eq("student_id", profile.id).eq("teacher_id", teacher.id).maybeSingle(),
    ]);
    if (a.error || b.error) throw new Error("Không thể kiểm tra quyền truy cập.");
    if (!a.data && !b.data) return null;
  }
  return { subject, teacher };
}

export async function teacherCourses(client: Client, teacherId: string) {
  return allRows((a,b) => client.from("courses").select("*").eq("teacher_id", teacherId).order("created_at").order("id").range(a,b));
}

// Batch IDs to avoid long request URLs, paginate each batch to avoid row caps.
async function byIds<T>(ids: string[], fetch: (ids: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += 100) results.push(...await allRows((a,b) => fetch(ids.slice(i,i+100), a,b)));
  return results;
}
export async function courseContent(client: Client, courseId: string, studentId: string, knownCourse?: Course) {
  let course = knownCourse;
  if (!course) {
    const result = await client.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (result.error) throw new Error("Không thể tải khóa học.");
    if (!result.data) return null;
    course = result.data;
  }
  const chapters = await allRows((a,b) => client.from("chapters").select("*").eq("course_id", courseId).order("order_index").order("id").range(a,b));
  const lessons = await byIds(chapters.map((c) => c.id), (ids,a,b) => client.from("lessons").select("*").in("chapter_id", ids).order("order_index").order("id").range(a,b));
  lessons.sort((a,b) => a.order_index - b.order_index || a.id.localeCompare(b.id));
  const progress = await byIds(lessons.map((l) => l.id), (ids,a,b) => client.from("user_progress").select("lesson_id").eq("student_id", studentId).eq("is_completed", true).in("lesson_id", ids).order("id").range(a,b));
  const completed = progress.map((p) => p.lesson_id);
  return { course, chapters, lessons, completed, ...progressSummary(lessons.map((l) => l.id), completed) };
}

export async function courseProgressSummaries(client: Client, courseIds: string[], studentId: string) {
  const chapters = await byIds(courseIds, (ids,a,b) => client.from("chapters").select("id,course_id").in("course_id", ids).order("id").range(a,b));
  const lessons = await byIds(chapters.map((chapter) => chapter.id), (ids,a,b) => client.from("lessons").select("id,chapter_id").in("chapter_id", ids).order("id").range(a,b));
  const progress = await byIds(lessons.map((lesson) => lesson.id), (ids,a,b) => client.from("user_progress").select("lesson_id").eq("student_id", studentId).eq("is_completed", true).in("lesson_id", ids).order("id").range(a,b));
  const chapterCourses = new Map(chapters.map((chapter) => [chapter.id, chapter.course_id]));
  const courseLessons = new Map(courseIds.map((id) => [id, [] as string[]]));
  for (const lesson of lessons) {
    const courseId = chapterCourses.get(lesson.chapter_id);
    if (courseId) courseLessons.get(courseId)?.push(lesson.id);
  }
  const completed = progress.map((row) => row.lesson_id);
  return Object.fromEntries(courseIds.map((id) => [id, progressSummary(courseLessons.get(id) ?? [], completed)]));
}

export type CourseContent = NonNullable<Awaited<ReturnType<typeof courseContent>>>;

export async function lessonContent(client: Client, lessonId: string, profile: Profile) {
  const { data: lesson, error } = await client.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (error) throw new Error("Không thể tải bài học.");
  if (!lesson) return null;
  const { data: chapter, error: chapterError } = await client.from("chapters").select("*").eq("id", lesson.chapter_id).maybeSingle();
  if (chapterError) throw new Error("Không thể tải chương.");
  if (!chapter) return null;
  const content = await courseContent(client, chapter.course_id, profile.id);
  if (!content) return null;
  const context = await teacherContext(client, content.course.teacher_id, profile);
  if (!context) return null;
  const materials = await allRows((a,b) => client.from("materials").select("*").eq("lesson_id", lesson.id).order("order_index").order("id").range(a,b));
  return { lesson, chapter, content, ...context, materials };
}
export async function listMenus(client: Client) {
  return allRows((a,b) => client.from("menus").select("*").order("name").order("id").range(a,b));
}

