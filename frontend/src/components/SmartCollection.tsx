import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { api } from "@/lib/api";
import type { NodeResponse, SmartQuery } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { Button, Input, LayoutIcon, TagChip } from "./ui";
import InfoHint from "./InfoHint";

/**
 * Turns a page into a smart collection: pages anywhere carrying ALL given tags
 * (and optionally a property match) are gathered live, wherever they live.
 */
export default function SmartCollection({ node }: { node: NodeResponse }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const query = node.smartQuery;
  const active = !!query && (query.tags.length > 0 || !!query.propertyName);

  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState((query?.tags ?? []).join(", "));
  const [propName, setPropName] = useState(query?.propertyName ?? "");
  const [propValue, setPropValue] = useState(query?.propertyValue ?? "");

  const save = useMutation({
    mutationFn: (q: SmartQuery | null) => api.nodes.setSmartQuery(node.id, q),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["node", node.id] });
      qc.invalidateQueries({ queryKey: ["smartResults", node.id] });
      setOpen(false);
    },
  });

  const { data: results } = useQuery({
    queryKey: ["smartResults", node.id],
    queryFn: () => api.nodes.smartResults(node.id),
    enabled: active,
  });

  const apply = () => {
    const tagList = tags.split(",").map((s) => s.trim()).filter(Boolean);
    if (tagList.length === 0 && !propName.trim()) {
      save.mutate(null);
      return;
    }
    save.mutate({ tags: tagList, propertyName: propName.trim() || null, propertyValue: propValue.trim() || null });
  };

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-dim">
          <Filter className="h-3.5 w-3.5" strokeWidth={2} /> {t("smart.title")}
          <InfoHint text={t("help.smart")} />
        </h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-mid"
        >
          {active ? t("smart.edit") : t("smart.create")}
        </button>
      </div>

      {!active && !open && (
        <p className="text-[13px] text-dim">{t("smart.prompt")}</p>
      )}

      {open && (
        <div className="fade-up mb-3 space-y-2 rounded-xl border border-line bg-card/60 p-3">
          <p className="text-xs text-dim">{t("smart.hint")}</p>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-dim">{t("smart.tags")}</label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="grafos, java" />
          <div className="flex gap-2">
            <Input value={propName} onChange={(e) => setPropName(e.target.value)} placeholder={t("smart.propName")} />
            <Input value={propValue} onChange={(e) => setPropValue(e.target.value)} placeholder={t("smart.propValue")} />
          </div>
          <div className="flex items-center justify-end gap-2">
            {active && (
              <Button variant="ghost" onClick={() => save.mutate(null)}>{t("smart.clear")}</Button>
            )}
            <Button onClick={apply} disabled={save.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      )}

      {active && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-dim">
            {query!.tags.map((tag) => <TagChip key={tag}>{tag}</TagChip>)}
            {query!.propertyName && (
              <span className="rounded-full bg-elev px-2 py-0.5 text-mid">
                {query!.propertyName}{query!.propertyValue ? `: ${query!.propertyValue}` : ""}
              </span>
            )}
            <span className="text-dim">· {results?.length ?? 0}</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="divide-y divide-line">
              {(results ?? []).map((page: NodeResponse) => (
                <Link
                  key={page.id}
                  to={`/nodes/${page.id}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-card"
                >
                  <LayoutIcon layout={page.layout} className="text-dim" />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
                    {page.title || t("common.untitled")}
                  </span>
                  <span className="hidden items-center gap-1 sm:flex">
                    {page.tags.slice(0, 3).map((tag) => <TagChip key={tag}>{tag}</TagChip>)}
                  </span>
                </Link>
              ))}
              {results && results.length === 0 && (
                <p className="px-3.5 py-3 text-[13px] text-dim">{t("smart.empty")}</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
