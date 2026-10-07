import "server-only";
import { nextIncompleteLesson } from "@/lib/learning";
import type { CourseContent } from "@/repositories/lms";
import { CourseProgress } from "./shared";
import { ChapterList } from "./chapter-list";
import { CurriculumEditor } from "@/components/admin/curriculum-editor";

export function CourseDetail({ content, admin }: { content: CourseContent; admin: boolean }) {
  const nextLesson = !admin ? nextIncompleteLesson(content.chapters, content.lessons, content.completed) : undefined;
  return <><div className="section-heading"><p className="eyebrow">Nội dung khóa học</p><h2>{content.course.title}</h2>{content.course.description && <p>{content.course.description}</p>}</div><CourseProgress nextLesson={nextLesson} variant="featured" count={content.count} total={content.total} percent={content.percent} />{admin ? <CurriculumEditor content={content} /> : <ChapterList nextLesson={nextLesson?.id} chapters={content.chapters} lessons={content.lessons} completed={content.completed} />}</>;
}
