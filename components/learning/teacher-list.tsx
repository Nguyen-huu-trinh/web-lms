"use client";

import { Children, isValidElement, useState, type ReactNode } from "react";
import { useTeacherFavorites } from "./teacher-favorites";
import { filterFavoriteTeachers } from "@/lib/teacher-favorites";
import { Icon } from "@/components/ui/icon";
import styles from "./course-home.module.css";

export function TeacherList({ heading, teachers, children }: { heading: ReactNode; teachers: { id: string; name: string }[]; children: ReactNode }) {
  const favorites = useTeacherFavorites();
  const [query, setQuery] = useState("");
  const content = Children.toArray(children);
  const list = content.find((child) => isValidElement(child) && child.type === "ul");
  const rows = isValidElement<{ children: ReactNode }>(list) ? Children.toArray(list.props.children) : [];
  const visible = filterFavoriteTeachers(
    teachers.map((teacher, index) => ({ ...teacher, row: rows[index] })),
    favorites?.ids ?? new Set<string>(), query, favorites?.onlyFavorites ?? false,
  ).map(({ row }) => row);

  return <section className={styles.teacherPanel}>
    <div className={styles.panelToolbar}>
      {heading}
      <label className={styles.teacherSearch}>
        <Icon name="search" />
        <input type="search" aria-label="Lọc nhanh tên giáo viên" placeholder="Lọc nhanh tên thầy cô…" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
    </div>
    {teachers.length === 0 ? content : <>
      <ul className={styles.cards}>{visible}</ul>
      {visible.length === 0 && <p className={styles.noTeachers} role="status">Không tìm thấy giáo viên phù hợp.</p>}
    </>}
  </section>;
}
