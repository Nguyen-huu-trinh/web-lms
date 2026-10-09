import {
  LibraryBig, Star, Plus, UserPlus, Users, ArrowRight, BookOpen, Check, ChevronRight, CircleAlert, FileText,
  GraduationCap, Layers, LayoutGrid, LockKeyhole, LogOut, Play,
  Search, Tags, Pencil, Trash2, RotateCcw, ShieldCheck, Sparkles, Utensils, X,
} from "lucide-react";

const icons = {
  library: LibraryBig, star: Star, plus: Plus, userPlus: UserPlus, users: Users, book: BookOpen, grid: LayoutGrid, menu: Utensils, arrow: ArrowRight,
  chevron: ChevronRight, check: Check, play: Play, file: FileText,
  lock: LockKeyhole, logout: LogOut, close: X, layers: Layers,
  alert: CircleAlert, retry: RotateCcw, shield: ShieldCheck,
  sparkles: Sparkles, graduation: GraduationCap, edit: Pencil, trash: Trash2, pricing: Tags, search: Search,
} as const;
export type IconName = keyof typeof icons;
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const LucideIcon = icons[name];
  return <LucideIcon className={`icon ${className}`} strokeWidth={1.75} aria-hidden="true" />;
}
