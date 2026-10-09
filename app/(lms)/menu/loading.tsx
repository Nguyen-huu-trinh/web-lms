import p from "./pricing.module.css";
import s from "@/components/learning/loading-skeleton.module.css";
import { LoadingFrame, Skeleton } from "@/components/learning/loading-skeleton";
export default function LoadingPricing() {
  return <LoadingFrame className={p.page} label="Đang tải bảng giá…"><header className={p.heading}><div className={s.content}><Skeleton width="150px" /><Skeleton width="280px" height={36} /><Skeleton width="320px" /></div></header><section className={p.panel}><div className={p.panelHeader}><Skeleton width="180px" height={24} /></div><div className={p.listContainer}><div className={p.list}>{[0,1,2].map(i => <div className={p.cardRow} key={i}><div className={p.leftCol}><Skeleton width="48px" height={48} /><Skeleton width="150px" height={22} /></div><div className={p.rightCol}><Skeleton width="120px" height={28} /></div></div>)}</div></div></section></LoadingFrame>;
}
