import { useMutation } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatMarkdown } from "@/lib/markdown";
import { useI18n } from "@/i18n/I18nContext";

/** Batch AI: summarize all sub-pages of a page into one overview. */
export default function AiSummary({ parentId }: { parentId: string }) {
  const { t } = useI18n();
  const summarize = useMutation({ mutationFn: () => api.ai.summarize(parentId) });
  const error = summarize.error instanceof ApiError ? summarize.error.message : null;
  const summary = summarize.data?.summary;

  return (
    <div className="mt-3">
      <button
        onClick={() => summarize.mutate()}
        disabled={summarize.isPending}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
        {summarize.isPending ? t("summary.working") : t("summary.button")}
      </button>

      {error && <p className="mt-1 px-2 text-xs text-red-400">{error}</p>}

      {summary && (
        <div className="fade-up mt-2 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent2" strokeWidth={1.75} />
            <span className="text-xs font-semibold uppercase tracking-wide text-dim">{t("summary.title")}</span>
            <button
              onClick={() => summarize.reset()}
              className="ml-auto text-dim transition hover:text-ink"
              title={t("common.close")}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <div
            className="ask-answer text-sm leading-relaxed text-ink"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(summary) }}
          />
        </div>
      )}
    </div>
  );
}
