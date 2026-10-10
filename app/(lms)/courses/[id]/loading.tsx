import c from "@/components/learning/catalog.module.css";
import s from "@/components/learning/loading-skeleton.module.css";
import { LoadingFrame, GradeSkeleton, Skeleton, CourseContentSkeleton } from "@/components/learning/loading-skeleton";
export default function LoadingCourse() { return <LoadingFrame className={`${c.catalog} ${c.coursePage} ${c.singleCourse}`} label="Đang tải nội dung khóa học…"><GradeSkeleton /><div className={c.courseContainer}><div className={s.breadcrumb}><Skeleton width="360px" height={44} /></div><section className={`detail-panel ${c.fullCourseContent}`}><CourseContentSkeleton compact /></section></div></LoadingFrame>; }
