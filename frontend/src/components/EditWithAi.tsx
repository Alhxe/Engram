import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { EditResponse } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "./ui";

/**
 * "Edit with AI": the user types an instruction, the AI proposes the full new
 * body, and NOTHING is saved until the user applies it. Applying hands the HTML
 * to the page (normal autosave path, so version history still snapshots) and
 * materializes the inline page references the AI added.
 */
export default function EditWithAi({
  nodeId,
  onApply,
  onClose,
}: {
  nodeId: string;
  onApply: (html: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<EditResponse | null>(null);

  const propose = useMutation({
    mutationFn: () => api.ai.edit(nodeId, instruction),
    onSuccess: setProposal,
  });

  const apply = () => {
    if (!proposal) return;
    onApply(proposal.html);
    // Best-effort: register the cross-links the new content carries.
    for (const targetId of proposal.linkedIds) {
      api.links.create({ sourceId: nodeId, targetId }).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["backlinks"] });
    qc.invalidateQueries({ queryKey: ["links"] });
    onClose();
  };

  const error = propose.error instanceof ApiError ? propose.error.message : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fade-up flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
            {t("aiEdit.title")}
          </h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!proposal ? (
            <div className="space-y-3">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={t("aiEdit.placeholder")}
                rows={4}
                autoFocus
                className="w-full resize-y rounded-xl border border-line2 bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-dim focus:border-accent/60"
              />
              <p className="text-xs text-dim">{t("aiEdit.hint")}</p>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-xs text-dim">{t("aiEdit.previewHint")}</p>
              <div
                className="tiptap rounded-xl border border-line bg-card px-4 py-3 text-[15px] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: proposal.html }}
              />
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          {!proposal ? (
            <Button onClick={() => propose.mutate()} disabled={!instruction.trim() || propose.isPending}>
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              {propose.isPending ? t("aiEdit.working") : t("aiEdit.propose")}
            </Button>
          ) : (
            <>
              <Button variant="subtle" onClick={() => setProposal(null)}>
                {t("aiEdit.back")}
              </Button>
              <Button onClick={apply}>
                <Check className="h-4 w-4" strokeWidth={1.75} /> {t("aiEdit.apply")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
