import { NavigationLink as Link } from "@/components/ui/navigation-link";
import { Icon } from "@/components/ui/icon";
import styles from "./course-home.module.css";

export function TeacherEntry({ id, accessible, started }: { id: string; accessible: boolean; started: boolean }) {
  const state = !accessible ? "purchase" : started ? "continue" : "start";
  const label = !accessible ? "Mua ngay" : started ? "V\u00e0o h\u1ecdc" : "B\u1eaft \u0111\u1ea7u h\u1ecdc";
  return <Link className={styles.enter} data-state={state} href={accessible ? `/courses/teachers/${id}` : "/menu"}>
    {label}{state !== "start" && <Icon name="arrow" />}
  </Link>;
}
