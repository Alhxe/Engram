import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, GitMerge, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useI18n } from "@/i18n/I18nContext";

/** Finds likely duplicates of a page and lets the user merge them into it. */
export default function DuplicatesDialog({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [merged, setMerged] = useState<Set<string>>(new Set());

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["duplicates", nodeId],
    queryFn: () => api.ai.duplicates(nodeId),
    enabled: false,
  });
  useEffect(() => { refetch(); }, [refetch]);

  const merge = useMutation({
    // Merge the duplicate INTO the current page (the duplicate is trashed).
    mutationFn: (dupId: string) => api.nodes.merge(dupId, nodeId),
    onSuccess: (_res, dupId) => {
      setMerged((m) => new Set(m).add(dupId));
      qc.invalidateQueries({ queryKey: ["node", nodeId] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
      qc.invalidateQueries({ queryKey: ["backlinks", nodeId] });
      toast.success(t("dup.merged"));
    },
  });

  const results = (data ?? []).filter((d) => !merged.has(d.nodeId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up w-full max-w-md rounded-2xl border border-line2 bg-panel p-5 shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Copy className="h-4 w-4 text-accent2" strokeWidth={1.75} /> {t("dup.title")}
          </h3>
          <button onClick={onClose} className="text-dim transition hover:text-ink"><X className="h-4 w-4" strokeWidth={2} /></button>
        </div>
        <p className="mb-4 text-[13px] text-dim">{t("dup.hint")}</p>

        {isFetching && <p className="text-sm text-dim">{t("dup.searching")}</p>}
        {!isFetching && results.length === 0 && <p className="text-sm text-mid">{t("dup.none")}</p>}

        <ul className="space-y-2">
          {results.map((d) => (
            <li key={d.nodeId} className="flex items-start gap-2 rounded-lg border border-line bg-card/60 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{d.title || t("common.untitled")}</p>
                {d.reason && <p className="mt-0.5 text-[12px] text-dim">{d.reason}</p>}
              </div>
              <button
                onClick={() => merge.mutate(d.nodeId)}
                disabled={merge.isPending}
                className="flex shrink-0 items-center gap-1 rounded-md border border-line2 px-2 py-1 text-xs font-medium text-mid transition hover:border-accent/50 hover:text-ink disabled:opacity-50"
              >
                <GitMerge className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("dup.merge")}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
