import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/time";
import { useI18n } from "@/i18n/I18nContext";

export default function PageHistory({ nodeId }: { nodeId: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["history", nodeId], queryFn: () => api.nodes.history(nodeId) });

  const restore = useMutation({
    mutationFn: (revisionId: string) => api.nodes.restoreRevision(nodeId, revisionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["node", nodeId] });
      qc.invalidateQueries({ queryKey: ["history", nodeId] });
    },
  });

  const items = data ?? [];
  if (items.length === 0) return <p className="text-sm text-dim">{t("history.none")}</p>;

  return (
    <ul className="space-y-1">
      {items.map((rev) => (
        <li key={rev.id} className="group flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2">
          <span className="w-28 shrink-0 text-xs text-dim">{relativeTime(rev.createdAt, lang)}</span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-mid">
            {rev.preview || <span className="text-dim">{rev.title || t("common.untitled")}</span>}
          </span>
          <button
            onClick={() => restore.mutate(rev.id)}
            disabled={restore.isPending}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-dim opacity-0 transition hover:bg-elev hover:text-accent2 group-hover:opacity-100 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("history.restore")}
          </button>
        </li>
      ))}
    </ul>
  );
}
