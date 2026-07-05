import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { LinkSuggestion } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";

/** AI-proposed connections from this page to related pages (feature: auto-linking). */
export default function LinkSuggestions({ nodeId }: { nodeId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggest = useMutation({
    mutationFn: () => api.ai.suggestLinks(nodeId),
    onSuccess: (list) => {
      if (list.length === 0) toast.info(t("linkAi.none"));
    },
  });

  const accept = useMutation({
    mutationFn: (s: LinkSuggestion) =>
      api.links.create({ sourceId: nodeId, targetId: s.targetId, relType: s.relType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backlinks"] }),
  });

  const suggestions = (suggest.data ?? []).filter((s) => !dismissed.has(s.targetId));

  return (
    <div className="mb-3">
      <button
        onClick={() => suggest.mutate()}
        disabled={suggest.isPending}
        className="flex items-center gap-1.5 rounded-md border border-line2 bg-card px-2.5 py-1 text-xs font-medium text-mid transition hover:border-accent/50 hover:text-ink disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5 text-accent2" strokeWidth={1.75} />
        {suggest.isPending ? t("linkAi.working") : t("linkAi.button")}
      </button>

      {suggestions.length > 0 && (
        <ul className="fade-up mt-2 space-y-1.5">
          {suggestions.map((s) => (
            <li key={s.targetId} className="flex items-start gap-2 rounded-lg border border-line bg-card/60 px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                  <span className="font-medium text-ink">{s.title}</span>
                  <span className="rounded-full bg-elev px-1.5 py-0.5 text-[10px] text-accent2">{s.relType}</span>
                </div>
                {s.reason && <p className="mt-0.5 text-[12px] text-dim">{s.reason}</p>}
              </div>
              <button
                onClick={() => { accept.mutate(s); setDismissed((d) => new Set(d).add(s.targetId)); }}
                className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-emerald-400 transition hover:bg-emerald-500/10"
                title={t("linkAi.accept")}
              >
                <Check className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                onClick={() => setDismissed((d) => new Set(d).add(s.targetId))}
                className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-dim transition hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
