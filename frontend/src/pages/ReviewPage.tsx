import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, Eye, GraduationCap, Layers, RotateCcw } from "lucide-react";
import { useNode, useSrsDue, useSrsGrade, useSrsSummary } from "@/lib/queries";
import { GRADES, type Grade } from "@/lib/srs";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";

export default function ReviewPage() {
  const [params] = useSearchParams();
  const scope = params.get("scope") ?? undefined;
  // No scope → the hub (pick a subject). scope="all" → everything due.
  if (!scope) return <ReviewHub />;
  return <ReviewSession scope={scope === "all" ? undefined : scope} />;
}

/** Landing screen: subjects with their due counts — review is chosen, not global. */
function ReviewHub() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: subjects, isLoading } = useSrsSummary();

  if (isLoading) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  const list = subjects ?? [];
  const totalDue = list.reduce((sum, s) => sum + s.due, 0);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-5 flex items-center gap-2.5 text-sm">
        <GraduationCap className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="font-semibold text-ink">{t("review.title")}</span>
      </div>

      {list.length === 0 ? (
        <div className="mt-6 text-center">
          <EmptyState>{t("review.noSubjects")}</EmptyState>
          <p className="mt-4 text-xs text-dim">{t("review.hint")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {list.map((s) => {
            const disabled = s.due === 0;
            return (
              <button
                key={s.id}
                onClick={() => !disabled && navigate(`/review?scope=${s.id}`)}
                disabled={disabled}
                className={`flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left transition ${
                  disabled ? "opacity-60" : "hover:border-accent/50 hover:bg-elev"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <GraduationCap className="h-4 w-4 text-dim" strokeWidth={1.75} />
                  <span className="text-sm font-medium text-ink">{s.title || t("common.untitled")}</span>
                </span>
                <span className="flex items-center gap-2 text-xs">
                  {s.due > 0 ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent2">
                      {s.due} {t("review.pending")}
                    </span>
                  ) : (
                    <span className="text-dim">{t("review.upToDate")}</span>
                  )}
                  <span className="text-dim">
                    {s.total} {t("review.cards")}
                  </span>
                  {!disabled && <ChevronRight className="h-4 w-4 text-dim" strokeWidth={2} />}
                </span>
              </button>
            );
          })}

          {totalDue > 0 && (
            <button
              onClick={() => navigate("/review?scope=all")}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line2 px-4 py-2.5 text-sm text-mid transition hover:border-accent/50 hover:text-ink"
            >
              <Layers className="h-4 w-4" strokeWidth={1.75} />
              {t("review.all")} ({totalDue})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A focused review session over a scope (a subject/topic subtree, or all). */
function ReviewSession({ scope }: { scope?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: due, isLoading, refetch } = useSrsDue(scope);
  const { data: scopeNode } = useNode(scope);
  const grade = useSrsGrade();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (isLoading) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  const cards = due ?? [];

  const back = (
    <button
      onClick={() => navigate("/review")}
      className="mb-4 flex items-center gap-1 text-xs text-dim transition hover:text-ink"
    >
      <ChevronRight className="h-3.5 w-3.5 rotate-180" strokeWidth={2} /> {t("review.title")}
    </button>
  );

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        {back}
        <div className="p-10 text-center">
          <EmptyState>{t("review.empty")}</EmptyState>
        </div>
      </div>
    );
  }

  if (index >= cards.length) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Check className="h-7 w-7" strokeWidth={2} />
        </div>
        <h2 className="text-lg font-semibold text-ink">{t("review.doneTitle")}</h2>
        <p className="text-sm text-dim">{t("review.doneBody")}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              setIndex(0);
              setRevealed(false);
              refetch();
            }}
            className="flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm text-ink transition hover:bg-elev"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
            {t("review.restart")}
          </button>
          <button
            onClick={() => navigate("/review")}
            className="rounded-lg px-4 py-2 text-sm text-dim transition hover:text-ink"
          >
            {t("review.title")}
          </button>
        </div>
      </div>
    );
  }

  const card = cards[index];
  const remaining = cards.length - index;

  const answer = (g: Grade) => {
    grade.mutate({ id: card.id, grade: g });
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col p-6">
      {back}
      <div className="mb-4 flex items-center gap-2.5 text-sm">
        <GraduationCap className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="font-semibold text-ink">{t("review.title")}</span>
        {scopeNode && <span className="text-xs text-accent2">· {scopeNode.title}</span>}
        <span className="text-xs text-dim">
          {remaining} {t("review.pending")}
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
        <button
          onClick={() => navigate(`/nodes/${card.id}`)}
          className="text-left text-lg font-semibold text-ink hover:underline"
        >
          {card.title || t("common.untitled")}
        </button>

        {revealed ? (
          <div
            className="mt-5 border-t border-line pt-5 text-[15px] leading-relaxed text-ink [&_code]:rounded [&_code]:bg-elev [&_code]:px-1 [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-elev [&_pre]:p-3 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: card.content ?? "" }}
          />
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-elev/50 py-3 text-sm font-medium text-mid transition hover:bg-elev hover:text-ink"
          >
            <Eye className="h-4 w-4" strokeWidth={1.75} />
            {t("review.show")}
          </button>
        )}
      </div>

      {revealed && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {GRADES.map(({ grade: g, key, cls }) => (
            <button
              key={g}
              onClick={() => answer(g)}
              className={`rounded-lg border py-2.5 text-sm font-medium transition ${cls}`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
