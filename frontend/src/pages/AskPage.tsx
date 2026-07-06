import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, FolderTree, Save, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatMarkdown } from "@/lib/markdown";
import type { AskResponse } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";

// Convert the answer into clean, editor-safe HTML for saving as a note
// (paragraphs + lists + inline bold/code; citation markers dropped).
function answerToNoteHtml(raw: string): string {
  const inline = (line: string) =>
    line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(\d+)\]/g, "");
  return raw
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return "";
      if (lines.every((l) => /^[-*•]\s/.test(l))) {
        return "<ul>" + lines.map((l) => "<li>" + inline(l.replace(/^[-*•]\s/, "")) + "</li>").join("") + "</ul>";
      }
      return "<p>" + lines.map(inline).join(" ") + "</p>";
    })
    .filter(Boolean)
    .join("");
}

export default function AskPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState("");
  const scope = params.get("scope") ?? "";

  // Pages that can be a scope: any page that contains sub-pages.
  const { data: pages } = useQuery({
    queryKey: ["nodes", "ask-scopes"],
    queryFn: () => api.nodes.list({ size: 200 }),
  });
  const scopes = useMemo(
    () =>
      (pages?.content ?? [])
        .filter((p) => p.hasChildren)
        .sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    [pages],
  );
  const scopeTitle = scopes.find((p) => p.id === scope)?.title;

  const ask = useMutation<AskResponse, unknown, string>({
    mutationFn: (q: string) => api.ai.ask(q, scope || null),
  });

  // Persist a synthesis as a real note, linked to the sources it drew from.
  const save = useMutation({
    mutationFn: async () => {
      const answer = ask.data?.answer ?? "";
      const page = await api.nodes.create({
        title: asked || t("ask.heading"),
        content: answerToNoteHtml(answer),
        tags: ["síntesis"],
      });
      await Promise.all(
        (ask.data?.sources ?? []).map((s) =>
          api.links.create({ sourceId: page.id, targetId: s.nodeId, relType: "fuente" }),
        ),
      );
      return page;
    },
    onSuccess: (page) => navigate(`/nodes/${page.id}`),
  });

  const setScope = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("scope", id);
    else next.delete("scope");
    setParams(next, { replace: true });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setAsked(q);
    ask.mutate(q);
  };

  const error = ask.error instanceof ApiError ? ask.error.message : null;
  const data = ask.data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-white">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t("ask.heading")}</h1>
      </div>
      <p className="mb-6 text-sm text-dim">{t("ask.subtitle")}</p>

      <div className="mb-3 flex items-center gap-2">
        <FolderTree className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.75} />
        <span className="text-[13px] text-dim">{t("ask.scopeLabel")}</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line2 bg-card px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent/60"
        >
          <option value="">{t("ask.scopeAll")}</option>
          {scopes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || t("common.untitled")}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={submit} className="relative mb-8">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={scopeTitle ? t("ask.placeholderScoped").replace("{scope}", scopeTitle) : t("ask.placeholder")}
          className="w-full rounded-xl border border-line2 bg-card py-3 pl-4 pr-12 text-[15px] text-ink outline-none transition placeholder:text-dim focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={ask.isPending || !input.trim()}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent2 disabled:opacity-50"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>

      {ask.isPending && <p className="text-sm text-dim">{t("ask.thinking")}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && !ask.isPending && (
        <div className="fade-up">
          {asked && <p className="mb-4 text-sm text-dim">“{asked}”</p>}
          {data.answer ? (
            <>
              <div
                className="ask-answer text-[15px] leading-relaxed text-ink"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(data.answer) }}
              />
              <div className="mt-4">
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-medium text-mid transition hover:bg-elev hover:text-ink disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {save.isPending ? t("ask.saving") : t("ask.save")}
                </button>
              </div>
              {data.sources.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dim">
                    {t("ask.sources")}
                  </h2>
                  <ul className="space-y-1">
                    {data.sources.map((s) => (
                      <li key={s.nodeId} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-elev text-[11px] font-semibold text-dim">
                          {s.index}
                        </span>
                        <Link to={`/nodes/${s.nodeId}`} className="text-accent2 transition hover:underline">
                          {s.title || t("common.untitled")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-mid">
              {scopeTitle ? t("ask.noSourcesScoped").replace("{scope}", scopeTitle) : t("ask.noSources")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
