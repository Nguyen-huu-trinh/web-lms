import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Course, Profile } from "@/types/database";
import { allRows } from "./pagination";
import { uncached, type DataReader } from "@/lib/cache/policy";
import { progressSummary } from "@/lib/learning";
type Client = SupabaseClient<Database>;

export async function catalog(client: Client, profile: Profile, read: DataReader = uncached) {
  const [subjects, teachers, subjectAccess, teacherAccess] = await Promise.all([
    read("catalog:subjects", () => allRows((a,b) => client.from("subjects").select("*").order("order_index").order("name").order("id").range(a,b))),
    read("catalog:teachers", () => allRows((a,b) => client.from("teachers").select("*").order("order_index").order("name").order("id").range(a,b))),
    profile.role === "ADMIN" ? Promise.resolve([]) : allRows((a,b) => client.from("student_subject_access").select("subject_id").eq("student_id", profile.id).order("id").range(a,b)),
    profile.role === "ADMIN" ? Promise.resolve([]) : allRows((a,b) => client.from("student_teacher_access").select("teacher_id").eq("student_id", profile.id).order("id").range(a,b)),
  ]);
  const subjectIds = new Set(subjectAccess.map((a) => a.subject_id));
  const teacherIds = new Set(teacherAccess.map((a) => a.teacher_id));
  const accessibleTeachers = teachers.filter((t) => profile.role === "ADMIN" || subjectIds.has(t.subject_id) || teacherIds.has(t.id));
  const mySubjectIds = new Set([...subjectIds, ...accessibleTeachers.map((t) => t.subject_id)]);
  return { subjects, teachers, accessibleTeacherIds: new Set(accessibleTeachers.map((t) => t.id)), mySubjectIds };
}

export const teacherContext = cache(async (client: Client, teacherId: string, profile: Profile) => {
  const { data: teacher, error } = await client.from("teachers").select("*").eq("id", teacherId).maybeSingle();
  if (error) throw new Error("Không thể tải giáo viên.");
  if (!teacher) return null;
  const [subjectResult, access] = await Promise.all([
    client.from("subjects").select("*").eq("id", teacher.subject_id).maybeSingle(),
    profile.role === "ADMIN" ? Promise.resolve(null) : Promise.all([
      client.from("student_subject_access").select("id").eq("student_id", profile.id).eq("subject_id", teacher.subject_id).maybeSingle(),
      client.from("student_teacher_access").select("id").eq("student_id", profile.id).eq("teacher_id", teacher.id).maybeSingle(),
    ]),
  ]);
  if (subjectResult.error) throw new Error("Không thể tải môn học.");
  const subject = subjectResult.data;
  if (!subject) return null;
  if (access) {
    if (access.some((result) => result.error)) throw new Error("Không thể kiểm tra quyền truy cập.");
    if (!access.some((result) => result.data)) return null;
  }
  return { subject, teacher };
});

export async function teacherCourses(client: Client, teacherId: string, read: DataReader = uncached, profile?: Profile) {
  // Never let a cache hit bypass current membership checks.
  if (read !== uncached && (!profile || !await teacherContext(client, teacherId, profile))) return [];
  return readTeacherCourses(client, teacherId, read);
}

function readTeacherCourses(client: Client, teacherId: string, read: DataReader) {
  return read("teacher:courses:" + teacherId, () => allRows((a,b) => client.from("courses").select("*").eq("teacher_id", teacherId).order("order_index").order("created_at").order("id").range(a,b)));
}

// Batch IDs to avoid long request URLs, paginate each batch to avoid row caps.
async function byIds<T>(ids: string[], fetch: (ids: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += 100) results.push(...await allRows((a,b) => fetch(ids.slice(i,i+100), a,b)));
  return results;
}
export const findCourse = cache(async (client: Client, courseId: string) => {
  const { data, error } = await client.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw new Error("Không thể tải khóa học.");
  return data;
});

export async function courseContent(client: Client, courseId: string, studentId: string, knownCourse?: Course, read: DataReader = uncached) {
  // A cached teacher list is not proof of access: recheck the course through RLS.
  const course = read === uncached ? knownCourse ?? await findCourse(client, courseId) : await findCourse(client, courseId);
  return course ? readCourseContent(client, course, studentId, read) : null;
}

async function readCourseContent(client: Client, course: Course, studentId: string, read: DataReader) {
  const courseId = course.id;
  const { chapters, lessons } = await read("course:outline:" + courseId, async () => {
    const chapters = await allRows((a,b) => client.from("chapters").select("*").eq("course_id", courseId).order("order_index").order("id").range(a,b));
    const lessons = await byIds(chapters.map((c) => c.id), (ids,a,b) => client.from("lessons").select("*").in("chapter_id", ids).order("order_index").order("id").range(a,b));
    lessons.sort((a,b) => a.order_index - b.order_index || a.id.localeCompare(b.id));
    return { chapters, lessons };
  });
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
  const completed = new Set(progress.map((row) => row.lesson_id));
  return Object.fromEntries(courseIds.map((id) => {
    const ids = courseLessons.get(id) ?? [];
    return [id, progressSummary(ids, ids.filter((lessonId) => completed.has(lessonId)))];
  }));
}

// Create once after requireUser, inside a page or action. These promises never
// survive the request; even Server Actions reuse fresh authorization results.
export function createCourseReader(client: Client, profile: Profile, read: DataReader = uncached) {
  const courses = new Map<string, ReturnType<typeof findCourse>>();
  const teachers = new Map<string, ReturnType<typeof teacherContext>>();
  const getCourse = (id: string) => {
    if (!courses.has(id)) courses.set(id, findCourse(client, id));
    return courses.get(id)!;
  };
  const getTeacher = (id: string) => {
    if (!teachers.has(id)) teachers.set(id, teacherContext(client, id, profile));
    return teachers.get(id)!;
  };
  return {
    course: getCourse,
    teacher: getTeacher,
    async courses(teacherId: string) {
      if (!await getTeacher(teacherId)) return [];
      return readTeacherCourses(client, teacherId, read);
    },
    async content(courseId: string) {
      // Only a fresh RLS lookup from THIS reader can authorize cached content.
      const course = await getCourse(courseId);
      return course ? readCourseContent(client, course, profile.id, read) : null;
    },
  };
}

export type CourseContent = NonNullable<Awaited<ReturnType<typeof courseContent>>>;

export async function lessonContent(client: Client, lessonId: string, profile: Profile, read: DataReader = uncached) {
  const { data: lesson, error } = await client.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (error) throw new Error("Không thể tải bài học.");
  if (!lesson) return null;
  const { data: chapter, error: chapterError } = await client.from("chapters").select("*").eq("id", lesson.chapter_id).maybeSingle();
  if (chapterError) throw new Error("Không thể tải chương.");
  if (!chapter) return null;
  const course = await findCourse(client, chapter.course_id);
  if (!course) return null;
  const [content, context, materials] = await Promise.all([
    courseContent(client, course.id, profile.id, course, read),
    teacherContext(client, course.teacher_id, profile),
    read("lesson:materials:" + lesson.id, () => allRows((a,b) => client.from("materials").select("*").eq("lesson_id", lesson.id).order("order_index").order("id").range(a,b))),
  ]);
  if (!content || !context) return null;
  return { lesson, chapter, content, ...context, materials };
}
export async function listMenus(client: Client, read: DataReader = uncached) {
  return read("pricing", () => allRows((a,b) => client.from("menus").select("*").order("order_index").order("name").order("id").range(a,b)));
}

