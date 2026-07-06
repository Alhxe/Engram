import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useDeleteNode, useGenerateFlashcards } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

const COUNTS = [4, 8, 12];

/**
 * Generate flashcards from a page with AI: pick how many, generate, or
 * regenerate. "Regenerate" first trashes the cards from the previous run
 * (tracked locally) so it replaces that batch instead of piling up duplicates —
 * it never touches cards you made yourself.
 */
export default function FlashcardGenerator({ pageId }: { pageId: string }) {
  const { t } = useI18n();
  const gen = useGenerateFlashcards();
  const del = useDeleteNode();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(8);
  const [style, setStyle] = useState<"qa" | "cloze">("qa");
  const [lastBatch, setLastBatch] = useState<string[]>([]);
  const [created, setCreated] = useState<number | null>(null);

  const busy = gen.isPending || del.isPending;

  const run = async (regenerate: boolean) => {
    setCreated(null);
    try {
      if (regenerate && lastBatch.length) {
        await Promise.all(lastBatch.map((id) => del.mutateAsync(id)));
        setLastBatch([]);
      }
      const cards = await gen.mutateAsync({ pageId, count, style });
      setLastBatch(cards.map((c) => c.id));
      setCreated(cards.length);
    } catch {
      /* surfaced via gen.error below */
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2"
        title={t("ai.flashcardsHint")}
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> {t("ai.flashcards")}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line bg-panel p-3 shadow-xl shadow-black/40">
          <p className="mb-2.5 text-xs text-dim">{t("ai.flashcardsHint")}</p>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="mr-0.5 text-xs text-mid">{t("ai.count")}</span>
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`h-6 w-7 rounded text-xs transition ${
                  count === c ? "bg-accent text-white" : "bg-elev text-mid hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mb-3 flex items-center gap-1.5">
            <span className="mr-0.5 text-xs text-mid">{t("ai.style")}</span>
            {(["qa", "cloze"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`h-6 rounded px-2 text-xs transition ${
                  style === s ? "bg-accent text-white" : "bg-elev text-mid hover:text-ink"
                }`}
              >
                {t(`ai.style.${s}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => run(false)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              {busy ? t("ai.generating") : t("ai.generate")}
            </button>
            {lastBatch.length > 0 && (
              <button
                onClick={() => run(true)}
                disabled={busy}
                className="flex items-center justify-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs text-mid transition hover:text-ink disabled:opacity-50"
                title={t("ai.regenerate")}
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("ai.regenerate")}
              </button>
            )}
          </div>
          {gen.isError && (
            <p className="mt-2 text-xs text-red-400">
              {gen.error instanceof Error ? gen.error.message : t("ai.flashcardsError")}
            </p>
          )}
          {created !== null && !gen.isError && !busy && (
            <p className="mt-2 text-xs text-emerald-400">
              {created} {t("ai.created")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
