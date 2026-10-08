"use client";
import { startTransition, Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Course } from "@/types/database";
import { loadCoursePanel } from "@/app/(lms)/courses/panel-actions";
import { StudentCourseDetail } from "./student-course-detail";
import { loadCourseContent } from "@/lib/load-course-content";
import { createCoursePanelCache } from "@/lib/course-panel-cache";
import { Icon } from "@/components/ui/icon";
import styles from "./catalog.module.css";

type Progress = { count: number; total: number; percent: number };
type Panel = { panel: ReactNode; summary?: Progress };
type Props = { admin?: boolean; teacherId: string; courses: Course[]; navigationBase: string; initialId: string | null; initialPanel: ReactNode; progressByCourse: Promise<Record<string, Progress> | null>; initialProgress?: Progress; initialProgressPromise?: Promise<Progress | null>; controls: Record<string, ReactNode> };

export function CourseBrowser({ teacherId, courses, navigationBase, initialId, initialPanel, progressByCourse, initialProgress, initialProgressPromise, controls, admin = false }: Props) {
  const params = useSearchParams();
  const defaultId = navigationBase === "/courses/teachers/" + teacherId ? courses[0]?.id : navigationBase.split("/").at(-1);
  const requestedId = params.get("course") ?? defaultId ?? initialId;
  const selected = courses.find((course) => course.id === requestedId);
  const selectedId = selected?.id;
  const initialKey = initialId ?? "empty";
  const [panels, setPanels] = useState<Record<string, Panel>>(() => ({ [initialKey]: { panel: initialPanel, summary: initialProgress } }));
  const [lastShown, setLastShown] = useState(initialKey);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [load] = useState(() => createCoursePanelCache<Panel>(async (id) => {
    if (!admin) {
      const content = await loadCourseContent(teacherId, id);
      return { panel: <StudentCourseDetail content={content} />, summary: { count: content.count, total: content.total, percent: content.percent } };
    }
    const result = await loadCoursePanel(teacherId, id);
    if (!result.ok) throw new Error(result.error);
    return { panel: result.panel, summary: result.summary };
  }));
  useEffect(() => {
    if (!selectedId || panels[selectedId]) return;
    let cancelled = false;
    void load(selectedId).then((entry) => {
      if (cancelled) return;
      startTransition(() => {
        setPanels((previous) => ({ ...previous, [selectedId]: entry }));
        setLastShown(selectedId);
      });
    }).catch((error: unknown) => {
      if (!cancelled) setFailure({ id: selectedId, message: error instanceof Error ? error.message : "Không thể tải khóa học." });
    });
    return () => { cancelled = true; };
  }, [selectedId, panels, load, attempt]);

  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPrefetch = () => {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
  };
  useEffect(() => () => { if (prefetchTimer.current) clearTimeout(prefetchTimer.current); }, []);
  const prefetch = (id: string) => {
    cancelPrefetch();
    // GET prefetch does not occupy the Server Action queue used for mutations.
    if (admin || panels[id]) return;
    prefetchTimer.current = setTimeout(() => { void load(id).catch(() => {}); }, 120);
  };

  const displayedId = selectedId && panels[selectedId] ? selectedId : lastShown;
  const error = failure && failure.id === selectedId ? failure.message : null;
  const pending = Boolean(selectedId && !panels[selectedId] && !error);
  const hrefFor = (id: string) => id === defaultId ? navigationBase : navigationBase + "?course=" + encodeURIComponent(id);
  return <div className="split-layout surface">
    <aside className="list-sidebar"><div className="sidebar-heading"><Icon name="layers" /><h2 className="section-label">Khóa học</h2></div><nav aria-label="Khóa học của giáo viên">{courses.map((course) => {
      const progress = panels[course.id]?.summary;
      const loading = pending && selectedId === course.id;
      return <div key={course.id} className={styles.courseCard} data-active={displayedId === course.id}>
        <a onMouseEnter={() => prefetch(course.id)} onMouseLeave={cancelPrefetch} onFocus={() => prefetch(course.id)} onBlur={cancelPrefetch} onTouchStart={() => prefetch(course.id)} className={styles.courseLink} href={hrefFor(course.id)} aria-current={displayedId === course.id ? "page" : undefined} aria-busy={loading} onClick={(event) => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          if (panels[course.id]) setLastShown(course.id);
          else if (selectedId && panels[selectedId]) setLastShown(selectedId);
          if (requestedId !== course.id) window.history.pushState(null, "", hrefFor(course.id));
        }}><span className={styles.courseSwitchContent} data-pending={loading}><span className={styles.courseName}><Icon name="book" /><strong>{course.title}</strong><Icon name="chevron" /></span>{progress ? <CardProgress title={course.title} progress={progress} /> : <Suspense fallback={<span className={styles.cardProgress} aria-busy="true">Đang tải tiến độ…</span>}>{course.id === initialId && initialProgressPromise ? <InitialProgress title={course.title} result={initialProgressPromise} /> : <DeferredProgress course={course} result={progressByCourse} />}</Suspense>}<span className={styles.courseSwitchSpinner} aria-hidden="true" /></span></a>
        {controls[course.id] && <footer className={styles.cardFooter}>{controls[course.id]}</footer>}
      </div>;
    })}</nav></aside>
    <div className={styles.courseDetailRegion}>
      {pending && <p className={styles.courseLoadStatus} role="status">Đang tải {selected?.title}…</p>}
      {error && <div className={styles.courseLoadError} role="alert"><span>{error}</span><button type="button" className="text-link" onClick={() => { setFailure(null); setAttempt((value) => value + 1); }}>Thử lại</button></div>}
      {requestedId && !selected && <p className={styles.courseLoadError} role="alert">Khóa học không còn trong danh sách này.</p>}
      <Suspense fallback={<section className="detail-panel" role="status">Đang chuẩn bị nội dung khóa học…</section>}><section key={displayedId} className="detail-panel" aria-busy={pending}>{panels[displayedId]?.panel}</section></Suspense>
    </div>
  </div>;
}

function CardProgress({ title, progress }: { title: string; progress: Progress }) {
  return <span className={styles.cardProgress}><span><span>{progress.total ? progress.count + "/" + progress.total + " bài hoàn thành" : "Chưa có bài học"}</span><strong>{progress.percent}%</strong></span><progress max={100} value={progress.percent} aria-label={"Tiến độ " + title + ": " + progress.percent + "%"} /></span>;
}

// Only this leaf suspends; the course links and selected panel stay interactive.
function DeferredProgress({ course, result }: { course: Course; result: Props["progressByCourse"] }) {
  const progress = use(result)?.[course.id];
  return progress ? <CardProgress title={course.title} progress={progress} /> : <span className={styles.cardProgress}>Chưa tải được tiến độ</span>;
}

function InitialProgress({ title, result }: { title: string; result: Promise<Progress | null> }) {
  const progress = use(result);
  return progress ? <CardProgress title={title} progress={progress} /> : <span className={styles.cardProgress}>Chưa tải được tiến độ</span>;
}
