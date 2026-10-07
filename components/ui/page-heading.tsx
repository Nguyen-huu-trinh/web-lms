import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function PageHeading({ eyebrow, title, description, icon, children }: {
  eyebrow: string;
  title: string;
  description?: string | null;
  icon: IconName;
  children?: ReactNode;
}) {
  return <header className="page-heading">
    <div className="heading-content">
      <span className="heading-symbol"><Icon name={icon} /></span>
      <div className="min-w-0"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>
    </div>
    {children && <div className="page-actions">{children}</div>}
  </header>;
}
