import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Eye, GraduationCap, RotateCcw } from "lucide-react";
import { useNode, useSrsDue, useSrsGrade } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";

type Grade = "AGAIN" | "HARD" | "GOOD" | "EASY";

const GRADES: { grade: Grade; key: string; cls: string }[] = [
  { grade: "AGAIN", key: "review.again", cls: "border-red-500/40 text-red-300 hover:bg-red-500/15" },
  { grade: "HARD", key: "review.hard", cls: "border-amber-500/40 text-amber-300 hover:bg-amber-500/15" },
  { grade: "GOOD", key: "review.good", cls: "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15" },
  { grade: "EASY", key: "review.easy", cls: "border-sky-500/40 text-sky-300 hover:bg-sky-500/15" },
];

export default function ReviewPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scope = params.get("scope") ?? undefined;
  const { data: due, isLoading, refetch } = useSrsDue(scope);
  const { data: scopeNode } = useNode(scope);
  const grade = useSrsGrade();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (isLoading) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  const cards = due ?? [];

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <EmptyState>{t("review.empty")}</EmptyState>
        <p className="mt-4 text-xs text-dim">{t("review.hint")}</p>
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
        <button
          onClick={() => {
            setIndex(0);
            setRevealed(false);
            refetch();
          }}
          className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm text-ink transition hover:bg-elev"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          {t("review.restart")}
        </button>
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
      <div className="mb-4 flex items-center gap-2.5 text-sm">
        <GraduationCap className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="font-semibold text-ink">{t("review.title")}</span>
        {scopeNode && <span className="text-xs text-accent2">· {scopeNode.title}</span>}
        <span className="text-xs text-dim">
          {remaining} {t("review.count")}
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
        {/* Question */}
        <button
          onClick={() => navigate(`/nodes/${card.id}`)}
          className="text-left text-lg font-semibold text-ink hover:underline"
        >
          {card.title || t("common.untitled")}
        </button>

        {/* Answer */}
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

      {/* Grades — only once the answer is visible */}
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
