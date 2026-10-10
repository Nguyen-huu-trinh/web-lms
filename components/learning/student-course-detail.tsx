import { LearningPrefetch } from "./learning-prefetch";
import { nextLessonRoutes } from "@/lib/learning-prefetch";
import { nextIncompleteLesson } from "@/lib/learning";
import type { CourseContent } from "@/repositories/lms";
import { CourseProgress } from "./shared";
import { ChapterList } from "./chapter-list";

// Shared markup for streamed initial content and subsequent JSON reads.
export function StudentCourseDetail({ content }: { content: CourseContent }) {
  const nextLesson = nextIncompleteLesson(content.chapters, content.lessons, content.completed);
  return <><LearningPrefetch routes={nextLessonRoutes(content.chapters, content.lessons, content.completed)} /><div className="section-heading"><p className="eyebrow">Nội dung khóa học</p><h2>{content.course.title}</h2>{content.course.description && <p>{content.course.description}</p>}</div><CourseProgress nextLesson={nextLesson} variant="featured" count={content.count} total={content.total} percent={content.percent} /><ChapterList nextLesson={nextLesson?.id} chapters={content.chapters} lessons={content.lessons} completed={content.completed} /></>;
}
