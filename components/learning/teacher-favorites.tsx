"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { setTeacherFavorite } from "@/app/(lms)/courses/favorite-actions";
import { Icon } from "@/components/ui/icon";
import styles from "./course-home.module.css";

type Favorites = {
  ids: Set<string>; pending: Set<string>; enabled: boolean; onlyFavorites: boolean;
  setOnlyFavorites: (value: boolean) => void; toggle: (id: string) => Promise<void>; error: string;
};
const Context = createContext<Favorites | null>(null);
export function useTeacherFavorites() { return useContext(Context); }

export function TeacherFavoritesProvider({ initialIds, enabled, loadFailed, children }: { initialIds: string[]; enabled: boolean; loadFailed: boolean; children: ReactNode }) {
  const [ids, setIds] = useState(() => new Set(initialIds));
  const [pending, setPending] = useState(new Set<string>());
  const inFlight = useRef(new Set<string>());
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [error, setError] = useState(loadFailed ? "Chưa tải được danh sách gắn sao. Vui lòng tải lại trang." : "");
  async function toggle(id: string) {
    if (!enabled || loadFailed || inFlight.current.has(id)) return;
    const next = !ids.has(id);
    inFlight.current.add(id);
    setPending(new Set(inFlight.current));
    setError("");
    const update = (value: boolean) => setIds(previous => {
      const copy = new Set(previous);
      if (value) copy.add(id); else copy.delete(id);
      return copy;
    });
    update(next);
    try {
      const result = await setTeacherFavorite(id, next);
      if (!result.ok) throw new Error("save failed");
    } catch {
      update(!next);
      setError("Không lưu được thay đổi gắn sao. Vui lòng thử lại.");
    } finally {
      inFlight.current.delete(id);
      setPending(new Set(inFlight.current));
    }
  }
  return <Context.Provider value={{ ids, pending, enabled: enabled && !loadFailed, onlyFavorites, setOnlyFavorites, toggle, error }}>{children}</Context.Provider>;
}

export function FavoriteTeachersToolbar() {
  const state = useTeacherFavorites();
  if (!state) return null;
  return <div className={styles.favoritesBanner}>
    <div><strong>Thầy cô yêu thích</strong><p>Bấm ngôi sao cạnh tên thầy cô để ưu tiên hiển thị đầu danh sách.</p>{state.error && <p role="alert">{state.error}</p>}</div>
    <button type="button" aria-pressed={state.onlyFavorites} disabled={!state.enabled} onClick={() => state.setOnlyFavorites(!state.onlyFavorites)}><Icon name="star" />Chỉ hiện thầy cô đã gắn sao</button>
  </div>;
}

export function TeacherFavoriteButton({ id, name }: { id: string; name: string }) {
  const state = useTeacherFavorites();
  if (!state) return <span aria-hidden="true" />;
  const active = state.ids.has(id);
  const label = `${active ? "Bỏ gắn sao" : "Gắn sao"} ${name}`;
  return <button type="button" className={`${styles.accessStar} ${styles.favoriteButton}`} data-active={active} aria-pressed={active} aria-label={label} title={label} disabled={!state.enabled || state.pending.has(id)} aria-busy={state.pending.has(id)} onClick={() => void state.toggle(id)}><Icon name="star" /></button>;
}
