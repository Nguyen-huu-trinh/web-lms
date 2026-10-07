import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Chapter, Lesson } from "@/types/database";
import { EmptyState } from "./shared";
export function ChapterList({ chapters, lessons, completed, currentLesson, nextLesson }: { chapters: Chapter[]; lessons: Lesson[]; completed: string[]; currentLesson?: string; nextLesson?: string }) {
  if (!chapters.length) return <EmptyState title="Khóa học chưa có chương." />;
  const done = new Set(completed);
  return <div className="chapter-list student-curriculum">{chapters.map((chapter, index) => {
    const children = lessons.filter((l) => l.chapter_id === chapter.id);
    const completedCount = children.filter((lesson) => done.has(lesson.id)).length;
    return <details key={chapter.id} id={`chapter-${chapter.id}`} open={currentLesson ? children.some((l) => l.id === currentLesson) : nextLesson ? children.some((l) => l.id === nextLesson) : index === 0} className="chapter">
      <summary><span className="chapter-number">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><strong>{chapter.title}</strong><small>{children.length} bài học<span className="chapter-meta-dot" aria-hidden="true">·</span>{completedCount}/{children.length} hoàn thành</small></span><Icon name="chevron" className="chevron" /></summary>
      <ul>{children.map((lesson) => <li key={lesson.id} id={`lesson-card-${lesson.id}`}><Link href={`/lessons/${lesson.id}`} aria-current={lesson.id === currentLesson ? "page" : undefined} className={`lesson-link ${lesson.id === currentLesson ? "active" : ""} ${lesson.id === nextLesson ? "next-lesson" : ""}`}><span role="img" className={done.has(lesson.id) ? "lesson-check completed" : "lesson-check"} aria-label={done.has(lesson.id) ? "Đã hoàn thành" : "Chưa hoàn thành"}><Icon name={done.has(lesson.id) ? "check" : "play"} /></span><span className="lesson-title">{lesson.title}</span>{lesson.id === nextLesson && <span className="next-lesson-label">Tiếp theo</span>}{lesson.id !== nextLesson && <Icon name="chevron" className="lesson-arrow" />}</Link></li>)}</ul>
      {!children.length && <p className="px-5 pb-5 text-sm text-slate-500">Chưa có bài học.</p>}
    </details>;
  })}</div>;
}
