import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Button, Input } from "./ui";

export default function WebhooksManager() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["webhooks"], queryFn: () => api.webhooks.list() });
  const [url, setUrl] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["webhooks"] });
  const create = useMutation({
    mutationFn: () => api.webhooks.create(url.trim()),
    onSuccess: () => {
      setUrl("");
      invalidate();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => api.webhooks.remove(id), onSuccess: invalidate });

  const items = data ?? [];

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) create.mutate();
        }}
        className="mb-3 flex flex-wrap items-center gap-2"
      >
        <Input className="max-w-sm" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="submit" disabled={create.isPending || !url.trim()}>
          {t("common.add")}
        </Button>
      </form>

      {items.length === 0 && <p className="text-sm text-dim">{t("webhooks.empty")}</p>}

      <ul className="space-y-1.5">
        {items.map((wh) => (
          <li key={wh.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-mid">{wh.url}</span>
            <button
              className="text-dim transition hover:text-red-400"
              onClick={() => remove.mutate(wh.id)}
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
