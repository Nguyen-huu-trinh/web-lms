import styles from "@/components/learning/lesson-workspace.module.css";
export default function LoadingLesson() {
  return <main className={styles.workspace} role="status" aria-busy="true" aria-label="Đang tải bài học"><span className="sr-only">Đang tải bài học…</span><header className={styles.topbar} aria-hidden="true"><div className="skeleton w-1/3" /></header><div className={styles.body} aria-hidden="true"><section className={styles.stage}><div className="skeleton h-full min-h-64 w-full" /></section><aside className="surface lesson-panel p-5"><div className="skeleton w-2/3" />{[0,1,2].map((id) => <div key={id} className="skeleton large mt-5" />)}</aside></div></main>;
}
