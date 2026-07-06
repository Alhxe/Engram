import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Inbox, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useInbox } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState, LAYOUT_ICON, LAYOUT_TEXT } from "@/components/ui";

/** Frictionless capture: throw a thought in, triage later. Items are pages
 *  tagged "inbox"; archiving just removes the tag (files it out of the inbox). */
export default function InboxPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useInbox();
  const [text, setText] = useState("");

  const capture = useMutation({
    mutationFn: (title: string) => api.nodes.create({ title, tags: ["inbox"] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
      setText("");
    },
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const n = await api.nodes.get(id);
      return api.nodes.update(id, {
        title: n.title,
        content: n.content,
        kind: n.kind,
        layout: n.layout,
        parentId: n.parentId,
        tags: n.tags.filter((tg) => tg !== "inbox"),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-2.5 text-sm">
        <Inbox className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="font-semibold text-ink">{t("inbox.title")}</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) capture.mutate(text.trim());
        }}
        className="mb-5 flex gap-2"
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("inbox.placeholder")}
          className="flex-1 rounded-xl border border-line2 bg-card px-3 py-2.5 text-sm text-ink outline-none placeholder:text-dim focus:border-accent/60"
        />
        <button
          type="submit"
          disabled={capture.isPending || !text.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white transition hover:bg-accent2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> {t("inbox.capture")}
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-dim">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyState>{t("inbox.empty")}</EmptyState>
      ) : (
        <div className="space-y-1">
          {items.map((p) => {
            const Icon = LAYOUT_ICON[p.layout] ?? LAYOUT_ICON.DOCUMENT;
            return (
              <div key={p.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-elev/60">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${LAYOUT_TEXT[p.layout] ?? "text-dim/70"}`} strokeWidth={1.75} />
                <button
                  onClick={() => navigate(`/nodes/${p.id}`)}
                  className="flex-1 truncate text-left text-sm text-mid hover:text-ink"
                >
                  {p.title || t("common.untitled")}
                </button>
                <button
                  onClick={() => archive.mutate(p.id)}
                  title={t("inbox.archive")}
                  className="shrink-0 rounded p-1 text-dim opacity-0 transition hover:text-ink group-hover:opacity-100"
                >
                  <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
