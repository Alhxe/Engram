import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";

/**
 * Pages that mention this page by title but don't link to it — one click links them.
 * Turns loose text into real connections.
 */
export default function UnlinkedMentions({ nodeId }: { nodeId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["unlinkedMentions", nodeId],
    queryFn: () => api.nodes.unlinkedMentions(nodeId),
  });

  const linkIt = useMutation({
    mutationFn: (sourceId: string) => api.links.create({ sourceId, targetId: nodeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unlinkedMentions", nodeId] });
      qc.invalidateQueries({ queryKey: ["backlinks", nodeId] });
      qc.invalidateQueries({ queryKey: ["localGraph", nodeId] });
    },
  });

  const items = data ?? [];
  if (items.length === 0) return <p className="text-sm text-dim">{t("mentions.none")}</p>;

  return (
    <ul className="space-y-1">
      {items.map((m) => (
        <li
          key={m.nodeId}
          className="group flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm"
        >
          <Link to={`/nodes/${m.nodeId}`} className="min-w-0 flex-1 truncate text-ink hover:text-accent2">
            {m.title || t("common.untitled")}
          </Link>
          <button
            onClick={() => linkIt.mutate(m.nodeId)}
            disabled={linkIt.isPending}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-dim transition hover:bg-elev hover:text-accent2 disabled:opacity-50"
          >
            <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("mentions.link")}
          </button>
        </li>
      ))}
    </ul>
  );
}
