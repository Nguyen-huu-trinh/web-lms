"use client";
import { useActionState, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Lesson, Database } from "@/types/database";
import type { CourseContent } from "@/repositories/lms";
import { completeLesson } from "@/app/(lms)/lessons/[id]/actions";
import { materialLink, progressSummary, videoEmbed } from "@/lib/learning";
import { ChapterList } from "./chapter-list";
import { CourseProgress, EmptyState } from "./shared";
type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];
export function LessonWorkspace({ lesson, materials, content, student, lessonTools, materialTools }: { lesson: Lesson; materials: MaterialRow[]; content: CourseContent; student: boolean; lessonTools?: React.ReactNode; materialTools?: React.ReactNode }) {
  const [tab, setTab] = useState<"outline" | "materials">("outline");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const videos = materials.filter((m) => m.type === "video");
  const [videoId, setVideoId] = useState(videos[0]?.id ?? "");
  const video = videos.find((v) => v.id === videoId) ?? videos[0];
  const [state, action, pending] = useActionState(completeLesson, {error:"",completed:false});
  const completed = [...new Set([...content.completed, ...(state.completed ? [lesson.id] : [])])];
  const progress = progressSummary(content.lessons.map((l) => l.id), completed);
  const done = completed.includes(lesson.id);
  const embed = video ? videoEmbed(video.provider, video.url) : null;
  const link = video ? materialLink(video.provider,video.url) : null;
  return <div className="lesson-layout">
    <section className="min-w-0 space-y-5">
      <div className="surface video-section">{video ? <>
        {videos.length > 1 && <label className="video-selection">Video bài học<select value={video?.id} onChange={(e) => setVideoId(e.target.value)}>{videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label>}
        {embed ? <div className="video-frame"><iframe key={embed} src={embed} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <EmptyState title="Video này chưa hỗ trợ phát trực tiếp." />}
        <div className="video-caption"><span>{video.title}</span>{link && <a className="text-link" href={link} target="_blank" rel="noopener noreferrer">Mở video ↗</a>}</div>
        <p className="video-help">Nếu video không phát được, hãy mở trong tab mới và kiểm tra quyền truy cập của bạn.</p>
      </> : <EmptyState title="Bài học này chưa có video." description="Bạn có thể xem các tài liệu khác trong tab Tài liệu." />}</div>
      <div className="surface lesson-info"><p className="eyebrow">Bài học</p><h1>{lesson.title}</h1>
        {lessonTools}
        {student && <form action={action}><input type="hidden" name="lesson_id" value={lesson.id} /><button className={done ? "button completed-button" : "button"} disabled={done || pending}>{done ? <><Icon name="check" /> Đã hoàn thành</> : pending ? <><span className="spinner" aria-hidden="true" /> Đang lưu…</> : <><Icon name="check" /> Đánh dấu đã hoàn thành</>}</button>{state.error && <p className="form-error" role="alert">{state.error}</p>}{done && <p className="sr-only" role="status">Đã hoàn thành bài học.</p>}</form>}
      </div>
      <div className="surface lesson-progress"><CourseProgress {...progress} /></div>
    </section>
    <aside className="surface lesson-panel"><div className="panel-tabs" role="tablist" aria-label="Nội dung bài học">{(["outline","materials"] as const).map((value,index) => <button key={value} ref={(el) => { tabRefs.current[index]=el; }} role="tab" id={`tab-${value}`} aria-controls={`panel-${value}`} aria-selected={tab===value} tabIndex={tab===value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(e) => { if (["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) { e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1-index; setTab(next ? "materials" : "outline"); tabRefs.current[next]?.focus(); } }}><Icon name={value === "outline" ? "layers" : "file"} />{value === "outline" ? "Mục lục" : "Tài liệu"}{value === "materials" && <span>{materials.length}</span>}</button>)}</div>
      {tab === "outline" ? <div id="panel-outline" role="tabpanel" aria-labelledby="tab-outline" tabIndex={0}><div className="panel-heading"><strong>{content.course.title}</strong><small>{content.total} bài học</small></div><ChapterList chapters={content.chapters} lessons={content.lessons} completed={completed} currentLesson={lesson.id} /></div> :
      <div id="panel-materials" role="tabpanel" aria-labelledby="tab-materials" tabIndex={0}>{materialTools}{materials.length ? <ul className="material-list">{materials.map((material) => { const url = materialLink(material.provider,material.url); return <li key={material.id}><span className="material-type"><Icon name={material.type === "pdf" ? "file" : "play"} />{material.type === "pdf" ? "PDF" : "VIDEO"}</span><h2>{material.title}</h2><p>{material.provider === "drive" ? "Google Drive" : "YouTube"}</p>{url ? <a className="text-link" href={url} target="_blank" rel="noopener noreferrer">{material.type === "pdf" ? "Mở tài liệu" : "Mở video"} ↗</a> : <p>Liên kết chưa khả dụng.</p>}</li>; })}</ul> : <EmptyState title="Bài học chưa có tài liệu." />}</div>}
    </aside>
  </div>;
}
