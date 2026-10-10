"use client";

import { Children, isValidElement, useState, type ReactNode } from "react";
import { matchesCatalogSearch } from "@/lib/catalog-search";
import { Icon } from "@/components/ui/icon";
import styles from "./course-home.module.css";

export function TeacherList({ heading, names, children }: { heading: ReactNode; names: string[]; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const content = Children.toArray(children);
  const list = content.find((child) => isValidElement(child) && child.type === "ul");
  const rows = isValidElement<{ children: ReactNode }>(list) ? Children.toArray(list.props.children) : [];
  const visible = rows.filter((_, index) => matchesCatalogSearch(names[index] ?? "", query));

  return <section className={styles.teacherPanel}>
    <div className={styles.panelToolbar}>
      {heading}
      <label className={styles.teacherSearch}>
        <Icon name="search" />
        <input type="search" aria-label="Lọc nhanh tên giáo viên" placeholder="Lọc nhanh tên thầy cô…" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
    </div>
    {names.length === 0 ? content : <>
      <ul className={styles.cards}>{visible}</ul>
      {visible.length === 0 && <p className={styles.noTeachers} role="status">Không tìm thấy giáo viên phù hợp.</p>}
    </>}
  </section>;
}
