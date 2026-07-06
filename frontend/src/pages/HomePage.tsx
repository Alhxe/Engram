import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CalendarDays, Clock, GraduationCap, HelpCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboard } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { LAYOUT_ICON, LAYOUT_TEXT } from "@/components/ui";
import type { PageRef } from "@/lib/types";

function PageLink({ page }: { page: PageRef }) {
  const { t } = useI18n();
  const Icon = LAYOUT_ICON[page.layout] ?? LAYOUT_ICON.DOCUMENT;
  return (
    <Link
      to={`/nodes/${page.id}`}
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-elev/60"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${LAYOUT_TEXT[page.layout] ?? "text-dim/70"}`} strokeWidth={1.75} />
      <span className="truncate text-mid">{page.title || t("common.untitled")}</span>
    </Link>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-dim">
        <Icon className="h-3.5 w-3.5 text-accent2" strokeWidth={1.75} /> {title}
      </div>
      {children}
    </div>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();

  const daily = useMutation({
    mutationFn: () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return api.nodes.daily(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    },
    onSuccess: (node) => navigate(`/nodes/${node.id}`),
  });

  if (isLoading || !data) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-5 text-xl font-bold text-ink">{t("dash.title")}</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Study */}
        <Card title={t("dash.study")} icon={GraduationCap}>
          {data.dueCards > 0 ? (
            <>
              <div className="mb-2 rounded-lg bg-accent/15 px-3 py-2 text-sm font-medium text-ink">
                {data.dueCards} {t("review.pending")}
              </div>
              <div className="space-y-0.5">
                {data.subjects
                  .filter((s) => s.due > 0)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/review?scope=${s.id}`)}
                      className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition hover:bg-elev/60"
                    >
                      <span className="truncate text-mid">{s.title}</span>
                      <span className="shrink-0 text-accent2">{s.due}</span>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <p className="py-2 text-sm text-dim">{t("dash.allCaughtUp")}</p>
          )}
        </Card>

        {/* Today */}
        <Card title={t("dash.today")} icon={CalendarDays}>
          <p className="mb-3 text-sm text-dim">{t("dash.todayHint")}</p>
          <button
            onClick={() => daily.mutate()}
            disabled={daily.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-elev/50 py-2 text-sm font-medium text-mid transition hover:bg-elev hover:text-ink disabled:opacity-50"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} /> {t("dash.openToday")}
          </button>
        </Card>

        {/* Recent */}
        <Card title={t("dash.recent")} icon={Clock}>
          {data.recent.length === 0 ? (
            <p className="py-1 text-sm text-dim">{t("dash.empty")}</p>
          ) : (
            data.recent.map((p) => <PageLink key={p.id} page={p} />)
          )}
        </Card>

        {/* Open questions */}
        <Card title={t("dash.questions")} icon={HelpCircle}>
          {data.openQuestions.length === 0 ? (
            <p className="py-1 text-sm text-dim">{t("dash.noQuestions")}</p>
          ) : (
            data.openQuestions.map((p) => <PageLink key={p.id} page={p} />)
          )}
        </Card>
      </div>

      {/* Resurface */}
      {data.resurface && (
        <div className="mt-3">
          <Card title={t("dash.resurface")} icon={RefreshCw}>
            <p className="mb-1.5 text-xs text-dim">{t("dash.resurfaceHint")}</p>
            <PageLink page={data.resurface} />
          </Card>
        </div>
      )}
    </div>
  );
}
