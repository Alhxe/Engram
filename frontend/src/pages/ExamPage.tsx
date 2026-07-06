import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import { useExam, useNode } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";

/** Mock exam: a shuffled set of a subject's cards, self-graded right/wrong, with
 *  a final score. Unlike review, it doesn't reschedule — it's a test. */
export default function ExamPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scope = params.get("scope") ?? undefined;
  const count = Number(params.get("count") ?? "10") || 10;

  const { data: cards, isLoading, refetch } = useExam(scope, count);
  const { data: scopeNode } = useNode(scope);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);

  if (isLoading) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  const list = cards ?? [];

  const restart = () => {
    setIndex(0);
    setRevealed(false);
    setWrong([]);
    refetch();
  };

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <EmptyState>{t("exam.empty")}</EmptyState>
      </div>
    );
  }

  // Result screen
  if (index >= list.length) {
    const score = list.length - wrong.length;
    const pct = Math.round((score / list.length) * 100);
    const failed = list.filter((c) => wrong.includes(c.id));
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-line bg-card p-6 text-center">
          <div className="text-4xl font-bold text-ink">
            {score}/{list.length}
          </div>
          <div className={`mt-1 text-sm font-medium ${pct >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
            {pct}%
          </div>
        </div>

        {failed.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dim">{t("exam.failed")}</h2>
            <ul className="space-y-0.5">
              {failed.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/nodes/${c.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-mid transition hover:bg-elev/60 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5 shrink-0 text-red-400" strokeWidth={2} />
                    <span className="truncate">{c.title || t("common.untitled")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={restart}
            className="flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm text-ink transition hover:bg-elev"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} /> {t("exam.retry")}
          </button>
          {scope && (
            <button
              onClick={() => navigate(`/nodes/${scope}`)}
              className="rounded-lg px-4 py-2 text-sm text-dim transition hover:text-ink"
            >
              {t("exam.back")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const card = list[index];
  const answer = (ok: boolean) => {
    if (!ok) setWrong((w) => [...w, card.id]);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col p-6">
      <div className="mb-4 flex items-center gap-2.5 text-sm">
        <span className="font-semibold text-ink">{t("exam.title")}</span>
        {scopeNode && <span className="text-xs text-accent2">· {scopeNode.title}</span>}
        <span className="text-xs text-dim">
          {index + 1}/{list.length}
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-elev">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / list.length) * 100}%` }} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <p className="text-lg font-semibold text-ink">{card.title || t("common.untitled")}</p>
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
            <Eye className="h-4 w-4" strokeWidth={1.75} /> {t("review.show")}
          </button>
        )}
      </div>

      {revealed && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => answer(false)}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/40 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
          >
            <X className="h-4 w-4" strokeWidth={2} /> {t("exam.wrong")}
          </button>
          <button
            onClick={() => answer(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15"
          >
            <Check className="h-4 w-4" strokeWidth={2} /> {t("exam.right")}
          </button>
        </div>
      )}
    </div>
  );
}
