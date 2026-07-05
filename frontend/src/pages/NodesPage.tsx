import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, Globe, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useCreateNode } from "@/lib/queries";
import { relativeTime } from "@/lib/time";
import { useI18n } from "@/i18n/I18nContext";
import { Button, LAYOUT_ICON, LAYOUT_TINT, TagChip } from "@/components/ui";
import ImportDialog from "@/components/ImportDialog";
import ClipDialog from "@/components/ClipDialog";
import Onboarding from "@/components/Onboarding";
import type { NodeResponse } from "@/lib/types";

function PageCard({ page }: { page: NodeResponse }) {
  const { t, lang } = useI18n();
  const Icon = LAYOUT_ICON[page.layout];
  return (
    <Link
      to={`/nodes/${page.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-line2 hover:bg-elev hover:shadow-lg hover:shadow-black/30"
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${LAYOUT_TINT[page.layout]}`}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="text-[11px] text-dim">{relativeTime(page.updatedAt, lang)}</span>
      </div>
      <span className="truncate text-[15px] font-semibold text-ink">
        {page.title || t("common.untitled")}
      </span>
      <div className="mt-auto flex min-h-[1.25rem] flex-wrap gap-1">
        {page.tags.slice(0, 3).map((tag) => <TagChip key={tag}>{tag}</TagChip>)}
      </div>
    </Link>
  );
}

export default function NodesPage() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const createNode = useCreateNode();
  const [importing, setImporting] = useState(false);
  const [clipping, setClipping] = useState(false);

  const { data: templates } = useQuery({ queryKey: ["templates"], queryFn: () => api.nodes.templates() });
  const { data: resurface } = useQuery({ queryKey: ["resurface"], queryFn: () => api.nodes.resurface() });
  const fromTemplate = useMutation({
    mutationFn: (id: string) => api.nodes.instantiate(id),
    onSuccess: (node) => navigate(`/nodes/${node.id}`),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["nodes", "home"],
    queryFn: () => api.nodes.list({ size: 200 }),
  });

  const all = data?.content ?? [];
  const roots = all.filter((n) => n.parentId === null);
  const recent = [...all]
    .filter((n) => n.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 5);

  const newPage = () => {
    createNode.mutate(
      { title: t("common.untitled"), content: "" },
      { onSuccess: (node) => navigate(`/nodes/${node.id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{t("home.title")}</h1>
          <p className="mt-1 text-sm text-dim">{t("home.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => setClipping(true)}>
            <Globe className="h-4 w-4" strokeWidth={1.75} /> {t("clip.button")}
          </Button>
          <Button variant="subtle" onClick={() => setImporting(true)}>
            <Sparkles className="h-4 w-4" strokeWidth={1.75} /> {t("import.button")}
          </Button>
          <Button onClick={newPage} disabled={createNode.isPending}>
            <Plus className="h-4 w-4" strokeWidth={2} /> {t("pages.new")}
          </Button>
        </div>
      </div>

      {importing && <ImportDialog onClose={() => setImporting(false)} />}
      {clipping && <ClipDialog onClose={() => setClipping(false)} />}

      {templates && templates.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-dim">
            <LayoutTemplate className="h-3.5 w-3.5" strokeWidth={2} /> {t("templates.title")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => fromTemplate.mutate(tpl.id)}
                disabled={fromTemplate.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-line2 bg-card px-3 py-1.5 text-sm text-mid transition hover:border-accent/50 hover:text-ink disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 text-accent2" strokeWidth={2} />
                {tpl.title || t("common.untitled")}
              </button>
            ))}
          </div>
        </section>
      )}

      {isLoading && <p className="text-sm text-dim">{t("common.loading")}</p>}

      {recent.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-dim">
            <Clock className="h-3.5 w-3.5" strokeWidth={2} /> {t("home.recent")}
          </h2>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {recent.map((page) => {
              const Icon = LAYOUT_ICON[page.layout];
              return (
                <Link
                  key={page.id}
                  to={`/nodes/${page.id}`}
                  className="flex shrink-0 items-center gap-2.5 rounded-xl border border-line bg-card py-2 pl-2.5 pr-4 transition hover:border-line2 hover:bg-elev"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${LAYOUT_TINT[page.layout]}`}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-col">
                    <span className="max-w-[12rem] truncate text-[13px] font-medium text-ink">
                      {page.title || t("common.untitled")}
                    </span>
                    <span className="text-[11px] text-dim">{relativeTime(page.updatedAt, lang)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {resurface && resurface.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-dim">
            {t("home.resurface")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {resurface.map((page) => {
              const Icon = LAYOUT_ICON[page.layout ?? "DOCUMENT"];
              return (
                <Link
                  key={page.id}
                  to={`/nodes/${page.id}`}
                  className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-mid transition hover:border-line2 hover:text-ink"
                >
                  <Icon className="h-3.5 w-3.5 text-dim" strokeWidth={1.75} />
                  {page.title || t("common.untitled")}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!isLoading && all.length === 0 ? (
        <Onboarding
          onNewPage={newPage}
          onImport={() => setImporting(true)}
          onClip={() => setClipping(true)}
        />
      ) : (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-dim">
            {t("home.all")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roots.map((page) => <PageCard key={page.id} page={page} />)}
          </div>
        </section>
      )}
    </div>
  );
}
