import home from "./course-home.module.css";
import s from "./loading-skeleton.module.css";
import { LoadingFrame, Skeleton } from "./loading-skeleton";
export function CatalogSkeleton() {
  return <LoadingFrame className={home.home} label="Đang tải khóa học…">
    <div className={`${home.grades} ${s.catalogGrades}`}>{[0,1,2,3].map(i => <Skeleton key={i} width="110px" height={30} />)}</div>
    <div className={s.mobile}><Skeleton height={44} /></div>
    <div className={home.workspace}>
      <aside className={home.sidebar}>
        <div className={home.sidebarHeading}><Skeleton width="65%" height={12} /></div>
        <div className={s.desktop}>{Array.from({length: 9}, (_, i) => <div className={s.catalogSubject} key={i}><Skeleton height={31} /></div>)}</div>
        <div className={s.mobile}><Skeleton height={44} /></div>
      </aside>
      <section className={home.teacherPanel}>
        <div className={home.panelToolbar}>
          <div className={home.heading}><Skeleton width="24px" height={24} /><div className={s.copy}><Skeleton width="100px" height={18} /><Skeleton width="180px" height={10} /></div></div>
          <div className={s.desktop}><Skeleton width="220px" height={32} /></div>
        </div>
        <div className={home.cards}>{Array.from({length: 12}, (_, i) => <div className={home.card} key={i}>
          <Skeleton width="14px" height={14} />
          <div className={home.identity}><Skeleton width="30px" height={30} /><div className={`${s.copy} ${s.catalogIdentity}`}><Skeleton width="60%" height={14} /><Skeleton width="45%" height={11} /></div></div>
          <div className={home.progress}><Skeleton width="90px" height={6} /></div>
          <div className={home.enter}><Skeleton height={16} /></div>
        </div>)}</div>
      </section>
    </div>
  </LoadingFrame>;
}
