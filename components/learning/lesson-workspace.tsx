"use client";
import { NavigationLink as Link } from "@/components/ui/navigation-link";
import styles from "./lesson-workspace.module.css";
import { useActionState, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Lesson, Database } from "@/types/database";
import type { CourseContent } from "@/repositories/lms";
import { completeLesson } from "@/app/(lms)/lessons/[id]/actions";
import { materialLink, videoEmbed } from "@/lib/learning";
import { ChapterList } from "./chapter-list";
import { EmptyState } from "./shared";
import { FullscreenPlayer } from "./fullscreen-player";
type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];
export function LessonWorkspace({ lesson, materials, content, student, materialTools, materialActions }: { lesson: Lesson; materials: MaterialRow[]; content: CourseContent; student: boolean; materialTools?: React.ReactNode; materialActions?: Record<string, React.ReactNode> }) {
  const [tab, setTab] = useState<"outline" | "materials">("materials");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const videos = materials.filter((m) => m.type === "video");
  const [videoId, setVideoId] = useState(videos[0]?.id ?? "");
  const video = videos.find((v) => v.id === videoId) ?? videos[0];
  const [state, action, pending] = useActionState(completeLesson, {error:"",completed:false});
  const completed = [...new Set([...content.completed, ...(state.completed ? [lesson.id] : [])])];

  const done = completed.includes(lesson.id);
  const embed = video ? videoEmbed(video.provider, video.url) : null;
  const playerSrc = embed && video?.provider === "youtube" ? `${embed}?controls=1&fs=0&playsinline=1&iv_load_policy=3&rel=0` : embed;
  const orderedLessons = content.chapters.flatMap((chapter) => content.lessons.filter((item) => item.chapter_id === chapter.id));
  const position = orderedLessons.findIndex((item) => item.id === lesson.id);
  const next = orderedLessons[position + 1];
  return <main className={styles.workspace}>
    <header className={styles.topbar}><Link href={`/courses/${content.course.id}`} className={styles.back} aria-label="Về khóa học"><Icon name="chevron" /></Link><h1>{lesson.title}</h1><div className={styles.topActions}><span className={styles.position}>Bài {position + 1}/{orderedLessons.length}</span>{student && <form action={action}><input type="hidden" name="lesson_id" value={lesson.id} /><button className={done ? "button completed-button" : "button"} disabled={done || pending}>{done ? <><Icon name="check" /> Đã hoàn thành</> : pending ? <><span className="spinner" aria-hidden="true" /> Đang lưu…</> : <><Icon name="check" /> Hoàn thành</>}</button>{state.error && <p className="form-error" role="alert">{state.error}</p>}{done && <p className="sr-only" role="status">Đã hoàn thành bài học.</p>}</form>}{next ? <Link className={styles.next} href={`/lessons/${next.id}`}>Bài tiếp <Icon name="arrow" /></Link> : <Link className={styles.next} href={`/courses/${content.course.id}`}>Về khóa học</Link>}</div></header>
    <div className={styles.body}><section className={styles.stage}>
      <div className="surface video-section">{video ? <>
        {videos.length > 1 && <label className="video-selection">Video bài học<select value={video?.id} onChange={(e) => setVideoId(e.target.value)}>{videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label>}
        {embed ? <FullscreenPlayer><div className="video-frame"><iframe key={embed} src={playerSrc ?? undefined} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen={video.provider !== "youtube"} referrerPolicy="strict-origin-when-cross-origin" />{video.provider === "youtube" && <div className={styles.playerBottomShield} aria-hidden="true" onContextMenu={(event) => event.preventDefault()} />}</div></FullscreenPlayer> : <EmptyState title="Video này chưa hỗ trợ phát trực tiếp." />}
      </> : <EmptyState title="Bài học này chưa có video." description="Bạn có thể xem các tài liệu khác trong tab Tài liệu." />}</div>
</section>
    <aside className="surface lesson-panel"><div className="panel-tabs" role="tablist" aria-label="Nội dung bài học">{(["outline","materials"] as const).map((value,index) => <button key={value} ref={(el) => { tabRefs.current[index]=el; }} role="tab" id={`tab-${value}`} aria-controls={`panel-${value}`} aria-selected={tab===value} tabIndex={tab===value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(e) => { if (["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) { e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1-index; setTab(next ? "materials" : "outline"); tabRefs.current[next]?.focus(); } }}><Icon name={value === "outline" ? "layers" : "file"} />{value === "outline" ? "Mục lục" : "Tài liệu"}{value === "materials" && <span>{materials.length}</span>}</button>)}</div>
      {tab === "outline" ? <div id="panel-outline" role="tabpanel" aria-labelledby="tab-outline" tabIndex={0}><div className="panel-heading"><strong>{content.course.title}</strong><small>{content.total} bài học</small></div><ChapterList chapters={content.chapters} lessons={content.lessons} completed={completed} currentLesson={lesson.id} /></div> :
      <div id="panel-materials" role="tabpanel" aria-labelledby="tab-materials" tabIndex={0}>{materialTools && <div className={styles.materialToolbar}>{materialTools}</div>}{materials.length ? <ul className="material-list">{materials.map((material) => { const url = materialLink(material.provider,material.url); return <li key={material.id} data-active={material.type === "video" && material.id === video?.id}><div className={styles.materialHeader}><span className={styles.materialIcon} data-type={material.type}><Icon name={material.type === "pdf" ? "file" : "play"} /></span><div className={styles.materialCopy}><span className={styles.materialMeta}>{material.type === "pdf" ? "PDF" : "VIDEO"} · {material.provider === "drive" ? "Google Drive" : "YouTube"}</span><h2>{material.title}</h2></div></div><footer className={styles.materialFooter}>{url ? material.type === "video" ? <button type="button" className="text-link" onClick={() => setVideoId(material.id)}>{material.id === video?.id ? "Đang xem" : "Xem video"}</button> : <a className="text-link" href={url} target="_blank" rel="noopener noreferrer">Mở tài liệu ↗</a> : <p>Liên kết chưa khả dụng.</p>}{materialActions?.[material.id]}</footer></li>; })}</ul> : <EmptyState title="Bài học chưa có tài liệu." />}</div>}
    </aside>
  </div></main>;
}
