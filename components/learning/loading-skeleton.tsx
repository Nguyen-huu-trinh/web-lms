import type { CSSProperties, ReactNode } from "react";
import styles from "./loading-skeleton.module.css";
export function Skeleton({ width = "100%", height = 16 }: { width?: string; height?: number }) {
  return <div className={`skeleton ${styles.bar}`} style={{ width, height } as CSSProperties} />;
}
export function LoadingFrame({ children, className = "", label = "Đang tải nội dung…" }: { children: ReactNode; className?: string; label?: string }) {
  return <main className={className} role="status" aria-busy="true" aria-label={label}><span className="sr-only">{label}</span><div aria-hidden="true" className={styles.contents}>{children}</div></main>;
}
export function GradeSkeleton() { return <div className={styles.grades}>{[0,1,2,3].map(i => <Skeleton key={i} width="120px" height={44} />)}</div>; }
export function CourseContentSkeleton() {
  return <div className={styles.content} aria-hidden="true"><Skeleton width="160px" /><Skeleton width="45%" height={30} /><div className={styles.progress}><Skeleton width="45%" height={22} /><Skeleton height={8} /><Skeleton width="30%" /></div>{[0,1,2].map(i => <div className={styles.chapter} key={i}><Skeleton width="55%" height={24} /><Skeleton width="80%" /><Skeleton width="65%" /></div>)}</div>;
}
