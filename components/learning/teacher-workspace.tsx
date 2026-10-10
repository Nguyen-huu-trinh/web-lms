"use client";

import { useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Grade, Subject, Teacher } from "@/types/database";
import type { TeacherCurriculum } from "@/repositories/lms";
import { LocalLearningContext } from "./local-learning-context";
import { StudentCourseDetail } from "./student-course-detail";
import { LessonWorkspace } from "./lesson-workspace";
import { NavigationLink as Link } from "@/components/ui/navigation-link";
import { Icon } from "@/components/ui/icon";
import { AccessDenied } from "./shared";
import styles from "./catalog.module.css";
import navigation from "./teacher-profile.module.css";

// The complete authorized curriculum arrives with the teacher page. Native
// history changes only the selected view, without a new RSC/data request.
export function TeacherWorkspace({ curriculum, teacher, subject, grades, overview, admin = false, coursePanels, materialActions, materialTools }: {
  curriculum: TeacherCurriculum; teacher: Teacher; subject: Subject; grades: Grade[]; overview: ReactNode;
  admin?: boolean; coursePanels?: Record<string, ReactNode>; materialActions?: Record<string, ReactNode>; materialTools?: Record<string, ReactNode>;
}) {
  const params = useSearchParams();
  const base = `/courses/teachers/${teacher.id}`;
  const courseId = params.get("course");
  const lessonId = params.get("lesson");
  const index = useMemo(() => {
    const courses = new Map(curriculum.contents.map(content => [content.course.id, content]));
    const lessons = new Map(curriculum.contents.flatMap(content => content.lessons.map(lesson => [lesson.id, { lesson, content }] as const)));
    const materials = new Map<string, TeacherCurriculum["materials"]>();
    for (const material of curriculum.materials) {
      const group = materials.get(material.lesson_id) ?? [];
      group.push(material);
      materials.set(material.lesson_id, group);
    }
    return { courses, lessons, materials };
  }, [curriculum]);
  const local = useMemo(() => ({ hrefFor(href: string) {
    if (href === base) return base;
    const course = /^\/courses\/([a-zA-Z0-9-]+)$/.exec(href)?.[1];
    if (course && index.courses.has(course)) return base + "?course=" + course;
    const lesson = /^\/lessons\/([a-zA-Z0-9-]+)$/.exec(href)?.[1];
    if (lesson && index.lessons.has(lesson)) return base + "?lesson=" + lesson;
    return null;
  } }), [base, index]);
  let view = overview;
  if (lessonId) {
    const entry = index.lessons.get(lessonId);
    view = entry ? <LessonWorkspace key={lessonId} lesson={entry.lesson} content={entry.content} materials={index.materials.get(lessonId) ?? []} student={!admin} materialActions={materialActions} materialTools={materialTools?.[lessonId]} /> : <AccessDenied />;
  } else if (courseId) {
    const content = index.courses.get(courseId);
    view = content ? <main className={`${styles.catalog} ${styles.coursePage} ${styles.singleCourse}`}>
      <nav className={navigation.grades} aria-label="Chọn khối">{grades.map(grade => <Link key={grade.code} href={"/courses?" + new URLSearchParams({ grade: grade.code, filter: "all" })} aria-current={grade.code === subject.grade ? "page" : undefined}>{grade.name}</Link>)}</nav>
      <div className={styles.courseContainer}>
        <nav className={navigation.breadcrumb} aria-label="Đường dẫn"><Link href={base}><Icon name="arrow" />{teacher.name}</Link><Icon name="chevron" /><strong aria-current="page">{content.course.title}</strong></nav>
        <section key={courseId} className={`detail-panel ${styles.fullCourseContent}`} aria-label="Nội dung khóa học">{admin ? coursePanels?.[courseId] : <StudentCourseDetail content={content} />}</section>
      </div>
    </main> : <AccessDenied />;
  }
  return <LocalLearningContext.Provider value={local}>{view}</LocalLearningContext.Provider>;
}
