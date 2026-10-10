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

export const teacherContext = cache(async (client: Client, teacherId: string, profile: Profile, read: DataReader = uncached) => {
  const { data: teacher, error } = await client.from("teachers").select("*").eq("id", teacherId).maybeSingle();
  if (error) throw new Error("Không thể tải giáo viên.");
  if (!teacher) return null;
  const [subjectResult, access] = await Promise.all([
    read("subject:" + teacher.subject_id, async () => {
      const result = await client.from("subjects").select("*").eq("id", teacher.subject_id).maybeSingle();
      if (result.error) throw new Error("Unable to load subject");
      return result;
    }),
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
  const lists = new Map<string, Promise<Course[]>>();
  const getCourse = (id: string) => {
    if (!courses.has(id)) courses.set(id, findCourse(client, id));
    return courses.get(id)!;
  };
  const getTeacher = (id: string) => {
    if (!teachers.has(id)) teachers.set(id, teacherContext(client, id, profile, read));
    return teachers.get(id)!;
  };
  return {
    course: getCourse,
    teacher: getTeacher,
    courses(teacherId: string) {
      if (!lists.has(teacherId)) lists.set(teacherId, (async () => {
        // A fresh RLS-filtered list overlaps the teacher check and also supplies
        // current course metadata, avoiding another round-trip for the selection.
        const [context, rows] = await Promise.all([
          getTeacher(teacherId), readTeacherCourses(client, teacherId, uncached),
        ]);
        if (!context) return [];
        for (const course of rows) {
          if (!courses.has(course.id)) courses.set(course.id, Promise.resolve(course));
        }
        return rows;
      })());
      return lists.get(teacherId)!;
    },
    async panel(teacherId: string, courseId: string) {
      // courses RLS checks the current session and teacher/subject grant.
      // Verify the parent against a live row, never against a cached list.
      const course = await getCourse(courseId);
      if (!course || course.teacher_id !== teacherId) return null;
      return readCourseContent(client, course, profile.id, read);
    },
    async content(courseId: string) {
      // Only a fresh RLS lookup from THIS reader can authorize cached content.
      const course = await getCourse(courseId);
      return course ? readCourseContent(client, course, profile.id, read) : null;
    },
    async curriculum(teacherId: string) {
      if (!await getTeacher(teacherId)) return null;
      const rows = await this.courses(teacherId);
      const chapters = await byIds(rows.map(course => course.id), (ids, a, b) => client.from("chapters").select("*").in("course_id", ids).order("order_index").order("id").range(a, b));
      const lessons = await byIds(chapters.map(chapter => chapter.id), (ids, a, b) => client.from("lessons").select("*").in("chapter_id", ids).order("order_index").order("id").range(a, b));
      const lessonIds = lessons.map(lesson => lesson.id);
      const [materials, progress] = await Promise.all([
        byIds(lessonIds, (ids, a, b) => client.from("materials").select("*").in("lesson_id", ids).order("order_index").order("id").range(a, b)),
        byIds(lessonIds, (ids, a, b) => client.from("user_progress").select("lesson_id").eq("student_id", profile.id).eq("is_completed", true).in("lesson_id", ids).order("id").range(a, b)),
      ]);
      const completed = new Set(progress.map(row => row.lesson_id));
      const contents = rows.map(course => {
        const courseChapters = chapters.filter(chapter => chapter.course_id === course.id);
        const chapterIds = new Set(courseChapters.map(chapter => chapter.id));
        const courseLessons = lessons.filter(lesson => chapterIds.has(lesson.chapter_id));
        const done = courseLessons.filter(lesson => completed.has(lesson.id)).map(lesson => lesson.id);
        return { course, chapters: courseChapters, lessons: courseLessons, completed: done, ...progressSummary(courseLessons.map(lesson => lesson.id), done) };
      });
      return { contents, materials };
    },
  };
}

export type CourseContent = NonNullable<Awaited<ReturnType<typeof courseContent>>>;
export type TeacherCurriculum = NonNullable<Awaited<ReturnType<ReturnType<typeof createCourseReader>["curriculum"]>>>;

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
    // The course above was just authorized through RLS in this request.
    readCourseContent(client, course, profile.id, read),
    teacherContext(client, course.teacher_id, profile, read),
    read("lesson:materials:" + lesson.id, () => allRows((a,b) => client.from("materials").select("*").eq("lesson_id", lesson.id).order("order_index").order("id").range(a,b))),
  ]);
  if (!content || !context) return null;
  return { lesson, chapter, content, ...context, materials };
}
export async function listMenus(client: Client, read: DataReader = uncached) {
  return read("pricing", () => allRows((a,b) => client.from("menus").select("*").order("order_index").order("name").order("id").range(a,b)));
}


export function listGrades(client: Client, read: DataReader = uncached) {
  return read("catalog:grades", () => allRows((a, b) => client.from("grades").select("*").order("order_index").order("name").order("code").range(a, b)));
}
