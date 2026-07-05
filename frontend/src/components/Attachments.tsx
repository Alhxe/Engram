import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachments({ nodeId }: { nodeId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["attachments", nodeId],
    queryFn: () => api.attachments.list(nodeId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["attachments", nodeId] });

  const upload = useMutation({
    mutationFn: (file: File) => api.attachments.upload(nodeId, file),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.attachments.remove(id),
    onSuccess: invalidate,
  });

  const open = async (id: string) => {
    const url = await api.attachments.blobUrl(id);
    window.open(url, "_blank", "noopener");
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />

      {data && data.length > 0 && (
        <ul className="mb-2 space-y-1">
          {data.map((att) => (
            <li
              key={att.id}
              className="group flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2 text-sm transition hover:border-line2"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-dim" strokeWidth={1.75} />
              <button
                className="truncate font-medium text-ink hover:text-accent2"
                onClick={() => open(att.id)}
              >
                {att.filename}
              </button>
              <span className="text-xs text-dim">{formatSize(att.sizeBytes)}</span>
              <button
                className="ml-auto text-dim opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                onClick={() => remove.mutate(att.id)}
                title={t("common.delete")}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-mid disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("attachments.add")}
      </button>
    </div>
  );
}
