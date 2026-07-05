import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/time";
import { useI18n } from "@/i18n/I18nContext";
import { Button, EmptyState } from "@/components/ui";

export default function TrashPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["trash"], queryFn: () => api.nodes.trash() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trash"] });
    qc.invalidateQueries({ queryKey: ["nodes"] });
    qc.invalidateQueries({ queryKey: ["children"] });
  };

  const restore = useMutation({ mutationFn: (id: string) => api.nodes.restore(id), onSuccess: invalidate });
  const purge = useMutation({ mutationFn: (id: string) => api.nodes.purge(id), onSuccess: invalidate });
  const empty = useMutation({ mutationFn: () => api.nodes.emptyTrash(), onSuccess: invalidate });

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{t("trash.title")}</h1>
          <p className="mt-1 text-sm text-dim">{t("trash.subtitle")}</p>
        </div>
        {items.length > 0 && (
          <Button variant="subtle" onClick={() => empty.mutate()} disabled={empty.isPending}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} /> {t("trash.empty")}
          </Button>
        )}
      </div>

      {items.length === 0 && <EmptyState>{t("trash.emptyState")}</EmptyState>}

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {items.map((item) => (
            <li key={item.id} className="group flex items-center gap-3 px-3.5 py-2.5">
              <Trash2 className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {item.title || t("common.untitled")}
              </span>
              <span className="hidden text-xs text-dim sm:inline">{relativeTime(item.deletedAt, lang)}</span>
              <button
                onClick={() => restore.mutate(item.id)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-dim transition hover:bg-elev hover:text-ink"
                title={t("trash.restore")}
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("trash.restore")}
              </button>
              <button
                onClick={() => purge.mutate(item.id)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-dim transition hover:bg-red-500/10 hover:text-red-400"
                title={t("trash.deleteForever")}
              >
                {t("trash.deleteForever")}
              </button>
            </li>
        ))}
      </ul>
    </div>
  );
}
