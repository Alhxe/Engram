import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ClipboardCheck, RotateCcw, Sparkles, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useGenerateExam, useNode } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import type { ExamQuestion } from "@/lib/types";

const COUNTS = [5, 10, 15];

/** AI-written multiple-choice exam over a subject: complex, application-level
 *  questions, auto-graded, with per-question explanations. */
export default function ExamPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scope = params.get("scope") ?? undefined;
  const { data: node } = useNode(scope);
  const gen = useGenerateExam();

  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const start = () => {
    if (!scope) return;
    gen.mutate(
      { pageId: scope, count },
      {
        onSuccess: (qs) => {
          setQuestions(qs);
          setIndex(0);
          setAnswers([]);
          setFinished(false);
        },
      },
    );
  };

  const error = gen.error instanceof ApiError ? gen.error.message : null;

  // --- Start screen ---
  if (!questions) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardCheck className="h-4 w-4 text-accent2" strokeWidth={1.75} /> {t("exam.title")}
            {node && <span className="text-accent2">· {node.title}</span>}
          </div>
          <p className="mb-4 text-sm text-dim">{t("exam.intro")}</p>
          <div className="mb-4 flex items-center gap-1.5">
            <span className="mr-1 text-xs text-mid">{t("exam.count")}</span>
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`h-7 w-8 rounded text-sm transition ${
                  count === c ? "bg-accent text-white" : "bg-elev text-mid hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={start}
            disabled={gen.isPending || !scope}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent2 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} /> {gen.isPending ? t("exam.generating") : t("exam.start")}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  // --- Result ---
  if (finished) {
    const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-line bg-card p-6 text-center">
          <div className="text-4xl font-bold text-ink">
            {score}/{questions.length}
          </div>
          <div className={`mt-1 text-sm font-medium ${pct >= 70 ? "text-emerald-400" : "text-amber-400"}`}>{pct}%</div>
        </div>

        <div className="mt-6 space-y-4">
          {questions.map((q, i) => {
            const ok = answers[i] === q.answer;
            return (
              <div key={i} className="rounded-xl border border-line bg-card p-4">
                <p className="mb-2 flex items-start gap-2 text-sm font-medium text-ink">
                  {ok ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2} />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={2} />
                  )}
                  {q.question}
                </p>
                <ul className="space-y-1 text-sm">
                  {q.options.map((o, oi) => (
                    <li
                      key={oi}
                      className={`rounded px-2 py-1 ${
                        oi === q.answer
                          ? "bg-emerald-500/15 text-emerald-300"
                          : oi === answers[i]
                            ? "bg-red-500/15 text-red-300"
                            : "text-mid"
                      }`}
                    >
                      {o}
                    </li>
                  ))}
                </ul>
                {q.explanation && <p className="mt-2 text-xs text-dim">{q.explanation}</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setQuestions(null)}
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

  // --- Question flow ---
  const q = questions[index];
  const selected = answers[index];
  const select = (oi: number) => {
    const next = [...answers];
    next[index] = oi;
    setAnswers(next);
  };
  const advance = () => {
    if (index + 1 >= questions.length) setFinished(true);
    else setIndex(index + 1);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-2 flex items-center gap-2.5 text-sm">
        <ClipboardCheck className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="font-semibold text-ink">{t("exam.title")}</span>
        <span className="text-xs text-dim">
          {index + 1}/{questions.length}
        </span>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-elev">
        <div className="h-full bg-accent transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="mb-4 text-base font-medium text-ink">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((o, oi) => (
            <button
              key={oi}
              onClick={() => select(oi)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                selected === oi
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-line text-mid hover:border-line2 hover:text-ink"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  selected === oi ? "border-accent bg-accent text-white" : "border-line2 text-dim"
                }`}
              >
                {String.fromCharCode(65 + oi)}
              </span>
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={advance}
          disabled={selected === undefined}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-accent2 disabled:opacity-50"
        >
          {index + 1 >= questions.length ? t("exam.finish") : t("exam.next")}
        </button>
      </div>
    </div>
  );
}
