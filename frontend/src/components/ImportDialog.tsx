import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, CornerDownRight, FileText, Sparkles, Table, Undo2, Upload, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { IngestionPlan, IngestionResult } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { Button, LAYOUT_ICON, LAYOUT_TINT } from "./ui";

export default function ImportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<IngestionPlan | null>(null);
  const [done, setDone] = useState<IngestionResult | null>(null);
  // Destination in the tree: seeded with the AI's suggestion, overridable.
  const [parent, setParent] = useState<{ id: string; title: string } | null>(null);
  const [parentQuery, setParentQuery] = useState("");
  const isCsv = !!file && file.name.toLowerCase().endsWith(".csv");

  // Light id+title list of every page — powers the destination picker.
  const { data: allPages } = useQuery({ queryKey: ["global-graph"], queryFn: () => api.nodes.graph() });
  const parentMatches = useMemo(() => {
    const q = parentQuery.trim().toLowerCase();
    if (!q) return [];
    return (allPages ?? [])
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 6);
  }, [parentQuery, allPages]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["nodes"] });
    qc.invalidateQueries({ queryKey: ["children"] });
    qc.invalidateQueries({ queryKey: ["trash"] });
  };

  const preview = useMutation({
    mutationFn: () => api.ai.ingestPreview(file, text),
    onSuccess: (p) => {
      setPlan(p);
      setParent(
        p.suggestedParentId && p.suggestedParentTitle
          ? { id: p.suggestedParentId, title: p.suggestedParentTitle }
          : null,
      );
    },
  });
  const commit = useMutation({
    mutationFn: () => api.ai.ingestCommit({ parentId: parent?.id ?? null, plan: plan! }),
    onSuccess: (result) => {
      invalidate();
      setDone(result);
    },
  });
  const undo = useMutation({
    mutationFn: (importId: string) => api.ai.ingestUndo(importId),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });
  const csv = useMutation({
    mutationFn: () => api.nodes.importCsv(file!),
    onSuccess: (node) => {
      invalidate();
      onClose();
      navigate(`/nodes/${node.id}`);
    },
  });

  const error =
    (preview.error instanceof ApiError && preview.error.message) ||
    (commit.error instanceof ApiError && commit.error.message) ||
    (csv.error instanceof ApiError && csv.error.message) ||
    null;
  const canPreview = (file || text.trim()) && !preview.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fade-up flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold text-ink">{t("import.title")}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {done ? (
            <div className="fade-up flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Check className="h-6 w-6" strokeWidth={2} />
              </span>
              <p className="text-sm text-ink">
                {t("import.created")} {done.createdPages} {t("import.pagesWord")}
                {done.createdLinks > 0 && ` · ${done.createdLinks} ${t("import.linksWord")}`}
              </p>
              <p className="text-xs text-dim">{t("import.doneHint")}</p>
            </div>
          ) : !plan ? (
            <div className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line2 bg-card px-4 py-8 text-center transition hover:border-accent/50">
                <Upload className="h-6 w-6 text-dim" strokeWidth={1.5} />
                <span className="text-sm text-mid">{file ? file.name : t("import.dropHint")}</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.csv,text/plain"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex items-center gap-3 text-xs text-dim">
                <span className="h-px flex-1 bg-line" /> {t("import.or")} <span className="h-px flex-1 bg-line" />
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("import.textPlaceholder")}
                rows={5}
                className="w-full resize-y rounded-xl border border-line2 bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-dim focus:border-accent/60"
              />
              <p className="text-xs text-dim">{t("import.costHint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-3 text-sm text-mid">
                {plan.pages.length} {t("import.pagesWord")} · {t("import.reviewHint")}
              </p>

              {/* Destination in the tree — AI-suggested, user-overridable */}
              <div className="mb-3 rounded-xl border border-line bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-dim">
                  <CornerDownRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {t("import.parentLabel")}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {parent ? (
                    <span className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[13px] text-ink">
                      {plan.suggestedParentId === parent.id && (
                        <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                      )}
                      {parent.title}
                      <button
                        onClick={() => setParent(null)}
                        className="ml-0.5 text-dim transition hover:text-ink"
                        title={t("import.parentRoot")}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </span>
                  ) : (
                    <span className="rounded-lg border border-line2 bg-elev px-2.5 py-1 text-[13px] text-mid">
                      {t("import.parentRoot")}
                    </span>
                  )}
                  <div className="relative min-w-40 flex-1">
                    <input
                      value={parentQuery}
                      onChange={(e) => setParentQuery(e.target.value)}
                      placeholder={t("import.parentSearch")}
                      className="w-full rounded-lg border border-line2 bg-card px-2.5 py-1 text-[13px] text-ink outline-none placeholder:text-dim focus:border-accent/60"
                    />
                    {parentMatches.length > 0 && (
                      <div className="absolute left-0 top-8 z-10 w-full overflow-hidden rounded-lg border border-line2 bg-panel shadow-xl shadow-black/40">
                        {parentMatches.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setParent({ id: p.id, title: p.title });
                              setParentQuery("");
                            }}
                            className="block w-full truncate px-2.5 py-1.5 text-left text-[13px] text-mid transition hover:bg-card hover:text-ink"
                          >
                            {p.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {plan.pages.map((page, i) => {
                const Icon = LAYOUT_ICON[page.layout];
                return (
                  <div key={i} className="rounded-xl border border-line bg-card p-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${LAYOUT_TINT[page.layout]}`}>
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </span>
                      <span className="flex-1 truncate text-sm font-medium text-ink">{page.title}</span>
                      <span className="text-[11px] text-dim">{t(`layout.${page.layout}`)}</span>
                    </div>
                    {page.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {page.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-line2 bg-elev px-2 py-0.5 text-[11px] text-mid">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {(page.properties.length > 0 || page.linkTitles.length > 0) && (
                      <p className="mt-1.5 text-[11px] text-dim">
                        {page.properties.length > 0 && `${page.properties.length} ${t("import.propsWord")}`}
                        {page.properties.length > 0 && page.linkTitles.length > 0 && " · "}
                        {page.linkTitles.length > 0 && `${page.linkTitles.length} ${t("import.linksWord")}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          {done ? (
            <>
              <Button
                variant="subtle"
                onClick={() => undo.mutate(done.importId)}
                disabled={undo.isPending}
              >
                <Undo2 className="h-4 w-4" strokeWidth={1.75} /> {t("import.undo")}
              </Button>
              <Button onClick={onClose}>{t("import.doneButton")}</Button>
            </>
          ) : !plan ? (
            isCsv ? (
              <Button onClick={() => csv.mutate()} disabled={csv.isPending}>
                <Table className="h-4 w-4" strokeWidth={1.75} />
                {csv.isPending ? t("import.creating") : t("import.csv")}
              </Button>
            ) : (
              <Button onClick={() => preview.mutate()} disabled={!canPreview}>
                <FileText className="h-4 w-4" strokeWidth={1.75} />
                {preview.isPending ? t("import.analyzing") : t("import.preview")}
              </Button>
            )
          ) : (
            <>
              <Button variant="subtle" onClick={() => setPlan(null)}>
                {t("import.back")}
              </Button>
              <Button onClick={() => commit.mutate()} disabled={commit.isPending}>
                {commit.isPending
                  ? t("import.creating")
                  : `${t("import.create")} ${plan.pages.length} ${t("import.pagesWord")}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
