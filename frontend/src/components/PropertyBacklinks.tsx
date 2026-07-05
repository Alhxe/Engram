import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";

/** Pages that point at this page through a RELATION property (inverse relation). */
export default function PropertyBacklinks({ nodeId }: { nodeId: string }) {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["propertyBacklinks", nodeId],
    queryFn: () => api.nodes.propertyBacklinks(nodeId),
  });

  if (!data || data.length === 0) {
    return <p className="text-sm text-dim">{t("propRefs.none")}</p>;
  }

  return (
    <ul className="space-y-1">
      {data.map((ref) => (
        <li key={`${ref.nodeId}-${ref.propertyName}`} className="flex items-center gap-2 text-sm">
          <Link to={`/nodes/${ref.nodeId}`} className="text-accent2 transition hover:underline">
            {ref.title || t("common.untitled")}
          </Link>
          <span className="rounded-full bg-elev px-1.5 py-0.5 text-[11px] text-dim">{ref.propertyName}</span>
        </li>
      ))}
    </ul>
  );
}
