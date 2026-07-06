import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "./ui";

/**
 * Quick-capture an open question. Creates a page tagged "pregunta" with an
 * "Estado" = Abierta property; you answer it later and link it to the page that
 * resolves it. A smart collection on tag + Estado lists your open questions.
 */
export default function QuestionDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const node = await api.nodes.create({ title: text.trim(), content: "", tags: ["pregunta"] });
      await api.nodes.upsertProperty(node.id, { name: "Estado", type: "SELECT", value: "Abierta" });
      return node;
    },
    onSuccess: (node) => {
      qc.invalidateQueries({ queryKey: ["nodes"] });
      qc.invalidateQueries({ queryKey: ["children"] });
      onClose();
      navigate(`/nodes/${node.id}`);
    },
  });

  const error = create.error instanceof ApiError ? create.error.message : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fade-up w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <HelpCircle className="h-4 w-4 text-accent2" strokeWidth={1.75} /> {t("question.add")}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) create.mutate();
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("question.placeholder")}
            className="w-full rounded-xl border border-line2 bg-card px-3 py-2.5 text-sm text-ink outline-none placeholder:text-dim focus:border-accent/60"
          />
          <p className="mt-2 text-xs text-dim">{t("question.hint")}</p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={create.isPending || !text.trim()}>
              {create.isPending ? t("question.creating") : t("question.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
