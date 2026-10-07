"use client";

export function NextLessonButton({ lessonId }: { lessonId: string }) {
  function scrollToLesson() {
    const lesson = document.getElementById(`lesson-card-${lessonId}`);
    if (!lesson) return;
    const chapter = lesson.closest("details");
    if (chapter) chapter.open = true;
    lesson.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
    lesson.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "center",
    });
  }

  return <button type="button" className="next-lesson-button" onClick={scrollToLesson} aria-controls={`lesson-card-${lessonId}`}>Bài học tiếp theo</button>;
}
