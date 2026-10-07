"use client";
import { useState, type ReactNode, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { NavigationLink as Link } from "@/components/ui/navigation-link";
import { isMyCoursesFilter } from "@/lib/catalog-search";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "./shared";
import styles from "./catalog.module.css";

type SubjectPanel = { id: string; name: string; mine: boolean; panel: ReactNode; minePanel: ReactNode };
export function CatalogSubjectBrowser({ subjects, role, search }: { subjects: SubjectPanel[]; role: string; search: string }) {
  const params = useSearchParams();
  const mine = isMyCoursesFilter(role, params.get("filter") ?? undefined);
  const visible = mine ? subjects.filter((subject) => subject.mine) : subjects;
  const selected = visible.find((subject) => subject.id === params.get("subject"))?.id ?? visible[0]?.id;
  const mode = mine ? "mine" : "all";
  const activeKey = mode + ":" + selected;
  const [visited, setVisited] = useState(() => new Set([activeKey]));
  const hrefFor = (filter: string, subject?: string) => {
    const query = new URLSearchParams({ filter });
    if (search) query.set("q", search);
    if (subject) query.set("subject", subject);
    return "/courses?" + query;
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setVisited((previous) => new Set([...previous, activeKey]));
    if (window.location.pathname + window.location.search !== href) window.history.pushState(null, "", href);
  };
  return <>
    <div className={styles.catalogToolbar}><nav className="filter-tabs" aria-label="Lọc môn học">{(["all", "mine"] as const).map((filter) => <a key={filter} href={hrefFor(filter, selected)} aria-current={mode === filter ? "page" : undefined} onClick={(event) => navigate(event, hrefFor(filter, selected))}><Icon name={filter === "all" ? "grid" : "book"} />{filter === "all" ? "Tất cả" : "Khóa học của tôi"}</a>)}</nav>
      <form action="/courses" method="get" role="search" className={styles.catalogSearch}><input type="hidden" name="filter" value={mode} /><button type="submit" aria-label="Tìm kiếm" title="Tìm kiếm"><Icon name="search" /></button><input id="catalog-search" name="q" type="search" aria-label="Tìm theo tên môn học hoặc giáo viên" defaultValue={search} placeholder="Tìm khóa học…" />{search && <Link href={"/courses?filter=" + mode} aria-label="Xóa tìm kiếm" title="Xóa tìm kiếm"><Icon name="close" /></Link>}</form>
    </div>
    {!visible.length && <div className="surface"><EmptyState title={search ? "Không tìm thấy môn học hoặc giáo viên phù hợp." : mine ? "Bạn chưa được cấp quyền vào môn học nào." : "Chưa có môn học."} description={search ? "Thử tên khác hoặc chuyển sang mục Tất cả." : mine ? "Các môn học được cấp sẽ xuất hiện tại đây." : undefined} /></div>}
    <div className={"split-layout surface " + styles.subjectBrowser} hidden={!visible.length}>
      <aside className="list-sidebar"><div className="sidebar-heading"><Icon name="layers" /><h2 className="section-label">Môn học</h2><span className="subtle-count">{visible.length}</span></div>
        <nav aria-label="Môn học">{visible.map((subject) => <a key={subject.id} href={hrefFor(mode, subject.id)} className={selected === subject.id ? "selection-item active" : "selection-item"} aria-current={selected === subject.id ? "page" : undefined} onClick={(event) => navigate(event, hrefFor(mode, subject.id))}><span className="selection-icon"><Icon name="book" /></span><span className="selection-copy">{subject.name}</span><Icon name="chevron" className="ml-auto" /></a>)}</nav>
      </aside>
      {subjects.flatMap((subject) => (["all", "mine"] as const).map((filter) => {
        const key = filter + ":" + subject.id;
        return (visited.has(key) || key === activeKey) && <div key={key} className={styles.subjectPanel} hidden={key !== activeKey}>{filter === "mine" ? subject.minePanel : subject.panel}</div>;
      }))}
    </div>
  </>;
}
