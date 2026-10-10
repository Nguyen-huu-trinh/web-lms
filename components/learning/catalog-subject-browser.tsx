"use client";
import { useState, type ReactNode, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { isMyCoursesFilter } from "@/lib/catalog-search";
import { selectedSubjectGrade, type SubjectGrade, type GradeOption } from "@/lib/admin-validation";
import { subjectSymbol } from "@/lib/subject-symbol";
import { GradeMenu } from "@/components/admin/grade-menu";
import { FavoriteTeachersToolbar } from "./teacher-favorites";
import { EmptyState } from "./shared";
import styles from "./course-home.module.css";

type SubjectPanel = { id: string; name: string; grade: SubjectGrade; mine: boolean; teacherCount: number; panel: ReactNode; minePanel: ReactNode };
export function CatalogSubjectBrowser({ subjects, role, search, grades, gradeActions = {}, addSubject = {}, createGrade }: { gradeActions?: Record<string, ReactNode>; addSubject?: Record<string, ReactNode>; createGrade?: ReactNode; grades: GradeOption[]; subjects: SubjectPanel[]; role: string; search: string }) {
  const params = useSearchParams();
  const mine = isMyCoursesFilter(role, params.get("filter") ?? undefined);
  const grade = selectedSubjectGrade(params.get("grade"), grades);
  const available = mine ? subjects.filter((subject) => subject.mine) : subjects;
  const visible = available.filter((subject) => subject.grade === grade);
  const selected = visible.find((subject) => subject.id === params.get("subject"))?.id ?? visible[0]?.id;
  const mode = mine ? "mine" : "all";
  const activeKey = mode + ":" + selected;
  const [visited, setVisited] = useState(() => new Set([activeKey]));
  const hrefFor = (filter: string, subject?: string, nextGrade = grade) => {
    const query = new URLSearchParams({ filter, grade: nextGrade });
    if (search) query.set("q", search);
    if (subject) query.set("subject", subject);
    return "/courses?" + query;
  };
  const selectLocation = (href: string) => {
    setVisited((previous) => new Set([...previous, activeKey]));
    if (window.location.pathname + window.location.search !== href) window.history.pushState(null, "", href);
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectLocation(href);
  };
  return <>
    <div className={styles.mobileGrade}>
      <label className={styles.mobileField}><span>Khối đang học</span>
        <select aria-label="Chọn khối" value={grade} disabled={!grades.length} onChange={(event) => selectLocation(hrefFor(mode, undefined, event.target.value))}>
          {!grades.length && <option value="">Chưa có khối</option>}
          {grades.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
        </select>
      </label>
      {gradeActions[grade] && <GradeMenu name={grades.find((option) => option.code === grade)?.name ?? ""}>{gradeActions[grade]}</GradeMenu>}
      {createGrade}
    </div>
    <nav className={styles.grades} aria-label="Chọn khối">{grades.map((option) => <div className={styles.gradeTab} data-active={grade === option.code} key={option.code}><a href={hrefFor(mode, undefined, option.code)} aria-current={grade === option.code ? "page" : undefined} onClick={(event) => navigate(event, hrefFor(mode, undefined, option.code))}>{option.name}</a>{gradeActions[option.code] && <GradeMenu name={option.name}>{gradeActions[option.code]}</GradeMenu>}</div>)}{createGrade}</nav>
    {role === "STUDENT" && <FavoriteTeachersToolbar />}
    <div className={styles.workspace}>
      <aside className={styles.sidebar}><div className={styles.sidebarHeading}><h2>Môn học & kỳ thi</h2><span className={styles.count}>{visible.length} Mục</span>{addSubject[grade]}</div>
        <label className={styles.mobileSubject}>
          <span className={styles.mobileSubjectLabel}>Chọn môn học</span>
          <select aria-label="Chọn môn học" value={selected ?? ""} disabled={!visible.length} onChange={(event) => selectLocation(hrefFor(mode, event.target.value))}>
            {!visible.length && <option value="">Chưa có môn học</option>}
            {visible.map((subject) => <option key={subject.id} value={subject.id}>{subjectSymbol(subject.name)} {subject.name} · {subject.teacherCount} giáo viên</option>)}
          </select>
        </label>
        <nav aria-label="Môn học">{visible.map((subject) => <a key={subject.id} href={hrefFor(mode, subject.id)} className={styles.subjectLink} aria-current={selected === subject.id ? "page" : undefined} onClick={(event) => navigate(event, hrefFor(mode, subject.id))}><span aria-hidden="true">{subjectSymbol(subject.name)}</span><span className="selection-copy">{subject.name}</span><span className={styles.count}>{subject.teacherCount} GV</span></a>)}</nav>
      </aside>
      {!visible.length && <div className="detail-panel"><EmptyState title={search ? "Không tìm thấy môn học hoặc giáo viên phù hợp trong khối này." : mine ? "Bạn chưa được cấp quyền vào môn học nào trong khối này." : "Khối này chưa có môn học."} description="Chọn khối khác hoặc thay đổi bộ lọc để xem môn học." /></div>}
      {subjects.flatMap((subject) => (["all", "mine"] as const).map((filter) => {
        const key = filter + ":" + subject.id;
        return (visited.has(key) || key === activeKey) && <div key={key} className={styles.panel} hidden={key !== activeKey}>{filter === "mine" ? subject.minePanel : subject.panel}</div>;
      }))}
    </div>
  </>;
}
