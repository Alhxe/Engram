import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Unlink, Tag, Clock } from "lucide-react";
import { api } from "@/lib/api";
import type { NodeTreeItem } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";

function Group({ icon: Icon, title, hint, items }: { icon: typeof Tag; title: string; hint: string; items: NodeTreeItem[] }) {
  const { t } = useI18n();
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        <Icon className="h-4 w-4 text-dim" strokeWidth={1.75} /> {title}
        <span className="rounded-full bg-elev px-1.5 text-[11px] text-mid">{items.length}</span>
      </h3>
      <p className="mb-2 mt-0.5 text-xs text-dim">{hint}</p>
      {items.length === 0 ? (
        <p className="text-[13px] text-dim">{t("hygiene.clean")}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 20).map((n) => (
            <Link
              key={n.id}
              to={`/nodes/${n.id}`}
              className="rounded-lg border border-line2 bg-card px-2.5 py-1 text-[13px] text-mid transition hover:border-accent/50 hover:text-ink"
            >
              {n.title || t("common.untitled")}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Surfaces pages worth revisiting: graph islands, untagged, and stale. */
export default function HygienePanel() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["hygiene"], queryFn: () => api.nodes.hygiene() });

  if (isLoading || !data) return <p className="text-sm text-dim">{t("common.loading")}</p>;

  return (
    <div className="space-y-5">
      <Group icon={Unlink} title={t("hygiene.orphans")} hint={t("hygiene.orphansHint")} items={data.orphans} />
      <Group icon={Tag} title={t("hygiene.untagged")} hint={t("hygiene.untaggedHint")} items={data.untagged} />
      <Group icon={Clock} title={t("hygiene.stale")} hint={t("hygiene.staleHint")} items={data.stale} />
    </div>
  );
}
