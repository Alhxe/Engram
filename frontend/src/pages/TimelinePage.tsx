import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { useAllNodes } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState, LAYOUT_ICON, LAYOUT_TEXT } from "@/components/ui";
import type { NodeResponse } from "@/lib/types";

/** A chronological, cross-collection view of everything, by month created. */
export default function TimelinePage() {
  const { t, lang } = useI18n();
  const { data, isLoading } = useAllNodes();

  const groups = useMemo(() => {
    const items = (data?.content ?? []).filter((n) => n.createdAt);
    items.sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : -1)); // newest first
    const byMonth = new Map<string, NodeResponse[]>();
    for (const n of items) {
      const key = n.createdAt!.slice(0, 7); // YYYY-MM
      const arr = byMonth.get(key);
      if (arr) arr.push(n);
      else byMonth.set(key, [n]);
    }
    return [...byMonth.entries()];
  }, [data]);

  if (isLoading) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="p-10">
        <EmptyState>{t("timeline.empty")}</EmptyState>
      </div>
    );
  }

  const monthLabel = (key: string) =>
    new Date(`${key}-01T00:00:00`).toLocaleDateString(lang, { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-5 flex items-center gap-2.5 text-sm">
        <CalendarClock className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="font-semibold text-ink">{t("timeline.title")}</span>
      </div>

      <div className="space-y-6">
        {groups.map(([key, items]) => (
          <section key={key}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dim">{monthLabel(key)}</h2>
            <ol className="space-y-0.5 border-l border-line pl-3">
              {items.map((n) => {
                const Icon = LAYOUT_ICON[n.layout] ?? LAYOUT_ICON.DOCUMENT;
                const day = n.createdAt!.slice(8, 10);
                return (
                  <li key={n.id}>
                    <Link
                      to={`/nodes/${n.id}`}
                      className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-elev/60"
                    >
                      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-dim">{day}</span>
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${LAYOUT_TEXT[n.layout] ?? "text-dim/70"}`}
                        strokeWidth={1.75}
                      />
                      <span className="truncate text-mid group-hover:text-ink">{n.title || t("common.untitled")}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
