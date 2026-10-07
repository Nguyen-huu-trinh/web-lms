import {
  ArrowRight, BookOpen, Check, ChevronRight, CircleAlert, FileText,
  GraduationCap, Layers, LayoutGrid, LockKeyhole, LogOut, Play,
  RotateCcw, ShieldCheck, Sparkles, Utensils, X,
} from "lucide-react";

const icons = {
  book: BookOpen, grid: LayoutGrid, menu: Utensils, arrow: ArrowRight,
  chevron: ChevronRight, check: Check, play: Play, file: FileText,
  lock: LockKeyhole, logout: LogOut, close: X, layers: Layers,
  alert: CircleAlert, retry: RotateCcw, shield: ShieldCheck,
  sparkles: Sparkles, graduation: GraduationCap,
} as const;
export type IconName = keyof typeof icons;
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const LucideIcon = icons[name];
  return <LucideIcon className={`icon ${className}`} strokeWidth={1.75} aria-hidden="true" />;
}
