import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Code2, Copy, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSnippets } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";
import type { NodeResponse } from "@/lib/types";

/** Extract the plain code text out of a snippet page's HTML content. */
function codeText(html: string | null): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim();
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function SnippetCard({ s }: { s: NodeResponse }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const code = codeText(s.content);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          onClick={() => navigate(`/nodes/${s.id}`)}
          className="truncate text-sm font-medium text-ink hover:underline"
        >
          {s.title || t("common.untitled")}
        </button>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs text-dim transition hover:text-ink"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2} />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          {copied ? t("snippets.copied") : t("snippets.copy")}
        </button>
      </div>
      <pre className="max-h-40 overflow-auto rounded-lg bg-elev p-3 text-xs text-mid">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** A copy-first code snippet library. Snippets are pages tagged "snippet". */
export default function SnippetsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useSnippets();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.nodes.create({
        title: title.trim() || t("common.untitled"),
        content: `<pre><code>${escapeHtml(code)}</code></pre>`,
        tags: ["snippet"],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snippets"] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
      setOpen(false);
      setTitle("");
      setCode("");
    },
  });

  const snippets = data ?? [];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm">
          <Code2 className="h-4 w-4 text-accent2" strokeWidth={1.75} />
          <span className="font-semibold text-ink">{t("snippets.title")}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-xs text-mid transition hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("snippets.new")}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-dim">{t("common.loading")}</p>
      ) : snippets.length === 0 ? (
        <EmptyState>{t("snippets.empty")}</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {snippets.map((s) => (
            <SnippetCard key={s.id} s={s} />
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">{t("snippets.new")}</h2>
              <button onClick={() => setOpen(false)} className="text-dim transition hover:text-ink">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("snippets.namePlaceholder")}
              className="mb-2 w-full rounded-lg border border-line2 bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-dim focus:border-accent/60"
            />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("snippets.codePlaceholder")}
              rows={8}
              className="w-full rounded-lg border border-line2 bg-card px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-dim focus:border-accent/60"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => create.mutate()}
                disabled={create.isPending || !code.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent2 disabled:opacity-50"
              >
                {create.isPending ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
