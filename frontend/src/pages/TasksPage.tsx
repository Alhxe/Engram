import { Link } from "react-router-dom";
import { Circle, ListChecks } from "lucide-react";
import { useTasks } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";
import type { TaskItem } from "@/lib/types";

/** Every open to-do across the whole base, grouped by the page it lives in. */
export default function TasksPage() {
  const { t } = useI18n();
  const { data, isLoading } = useTasks();

  if (isLoading) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  const tasks = data ?? [];
  const groups = new Map<string, { title: string; items: TaskItem[] }>();
  for (const it of tasks) {
    const g = groups.get(it.pageId) ?? { title: it.pageTitle, items: [] };
    g.items.push(it);
    groups.set(it.pageId, g);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-2.5 text-sm">
        <ListChecks className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="font-semibold text-ink">{t("tasks.title")}</span>
        {tasks.length > 0 && <span className="text-xs text-dim">{tasks.length}</span>}
      </div>

      {tasks.length === 0 ? (
        <EmptyState>{t("tasks.empty")}</EmptyState>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([pageId, g]) => (
            <section key={pageId}>
              <Link
                to={`/nodes/${pageId}`}
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dim transition hover:text-ink"
              >
                {g.title || t("common.untitled")}
              </Link>
              <ul className="space-y-0.5">
                {g.items.map((it, i) => (
                  <li key={i}>
                    <Link
                      to={`/nodes/${pageId}`}
                      className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-elev/60"
                    >
                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dim" strokeWidth={1.75} />
                      <span className="text-mid">{it.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
