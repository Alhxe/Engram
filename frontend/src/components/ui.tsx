import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import {
  BarChart3,
  Bookmark,
  Calendar,
  Columns,
  FileText,
  Network,
  Scissors,
  Share2,
  Table,
} from "lucide-react";
import type { NodeKind, PageLayout } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "subtle" | "danger" }) {
  const styles: Record<string, string> = {
    primary: "bg-accent text-white hover:bg-accent2 shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
    ghost: "bg-transparent text-mid hover:bg-elev hover:text-ink",
    subtle: "bg-card text-ink border border-line2 hover:bg-elev",
    danger: "bg-transparent text-red-400 hover:bg-red-500/10",
  };
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-line2 bg-card px-3 py-2 text-sm text-ink outline-none transition placeholder:text-dim focus:border-accent/60 focus:ring-2 focus:ring-accent/20 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`rounded-lg border border-line2 bg-card px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60 ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl border border-line bg-card p-4 ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">{children}</h2>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-line2 p-10 text-center text-sm text-dim">
      {children}
    </div>
  );
}

const KIND_ICON: Record<NodeKind, typeof FileText> = {
  NOTE: FileText,
  MINDMAP_BRANCH: Network,
  SNIPPET: Scissors,
  BOOKMARK: Bookmark,
};

export function KindIcon({ kind, className = "" }: { kind: NodeKind; className?: string }) {
  const Icon = KIND_ICON[kind];
  return <Icon className={`h-4 w-4 shrink-0 text-dim ${className}`} strokeWidth={1.75} />;
}

const KIND_COLORS: Record<NodeKind, string> = {
  NOTE: "bg-blue-500/15 text-blue-300",
  MINDMAP_BRANCH: "bg-violet-500/15 text-violet-300",
  SNIPPET: "bg-amber-500/15 text-amber-300",
  BOOKMARK: "bg-emerald-500/15 text-emerald-300",
};

export function KindBadge({ kind }: { kind: NodeKind }) {
  const { t } = useI18n();
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${KIND_COLORS[kind]}`}>
      {t(`kind.${kind}`)}
    </span>
  );
}

export function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line2 bg-elev px-2 py-0.5 text-xs text-mid">
      #{children}
    </span>
  );
}

export const LAYOUT_ICON: Record<PageLayout, typeof FileText> = {
  DOCUMENT: FileText,
  MINDMAP: Share2,
  TABLE: Table,
  BOARD: Columns,
  CALENDAR: Calendar,
  CHART: BarChart3,
};

/** Text-only tint, for places like the sidebar tree where a filled chip is too loud. */
export const LAYOUT_TEXT: Record<PageLayout, string> = {
  DOCUMENT: "text-dim/70",
  MINDMAP: "text-violet-400/80",
  TABLE: "text-emerald-400/80",
  BOARD: "text-amber-400/80",
  CALENDAR: "text-rose-400/80",
  CHART: "text-sky-400/80",
};

export const LAYOUT_TINT: Record<PageLayout, string> = {
  DOCUMENT: "bg-blue-500/15 text-blue-300",
  MINDMAP: "bg-violet-500/15 text-violet-300",
  TABLE: "bg-emerald-500/15 text-emerald-300",
  BOARD: "bg-amber-500/15 text-amber-300",
  CALENDAR: "bg-rose-500/15 text-rose-300",
  CHART: "bg-sky-500/15 text-sky-300",
};

export function LayoutIcon({ layout, className = "" }: { layout: PageLayout; className?: string }) {
  const Icon = LAYOUT_ICON[layout];
  return <Icon className={`h-4 w-4 shrink-0 ${className}`} strokeWidth={1.75} />;
}
