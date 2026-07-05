import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiKeyScope } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { Button, Input } from "./ui";

export default function ApiKeysManager() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: keys } = useQuery({ queryKey: ["apiKeys"], queryFn: () => api.apiKeys.list() });

  const [name, setName] = useState("");
  const [scope, setScope] = useState<ApiKeyScope>("READ");
  const [expiry, setExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.apiKeys.create({
        name,
        scope,
        expiresInDays: expiry ? Number(expiry) : null,
      }),
    onSuccess: (result) => {
      setCreatedKey(result.key);
      setName("");
      qc.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.apiKeys.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiKeys"] }),
  });

  const selectClass = "rounded-lg border border-line2 bg-card px-2 py-1.5 text-sm text-ink outline-none";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim()) create.mutate();
  };

  return (
    <div>
      {createdKey && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-300">{t("apikeys.copyOnce")}</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-app px-2 py-1 text-xs text-ink">{createdKey}</code>
            <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(createdKey)}>
              {t("common.copy")}
            </Button>
            <Button variant="ghost" onClick={() => setCreatedKey(null)}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2">
        <Input
          className="max-w-[12rem]"
          placeholder={t("apikeys.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={scope} onChange={(e) => setScope(e.target.value as ApiKeyScope)} className={selectClass}>
          <option value="READ">{t("apikeys.read")}</option>
          <option value="WRITE">{t("apikeys.write")}</option>
        </select>
        <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={selectClass}>
          <option value="">{t("apikeys.expNever")}</option>
          <option value="30">{t("apikeys.exp30")}</option>
          <option value="90">{t("apikeys.exp90")}</option>
          <option value="365">{t("apikeys.exp365")}</option>
        </select>
        <Button type="submit" disabled={create.isPending}>
          + {t("apikeys.create")}
        </Button>
      </form>

      {(!keys || keys.length === 0) && <p className="text-sm text-dim">{t("apikeys.empty")}</p>}

      <ul className="space-y-1.5">
        {keys?.map((key) => (
          <li
            key={key.id}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2 text-sm"
          >
            <span className="font-medium text-ink">{key.name}</span>
            <span className="rounded-md bg-elev px-1.5 py-0.5 text-xs text-mid">
              {key.scope === "WRITE" ? t("apikeys.write") : t("apikeys.read")}
            </span>
            <span className="text-xs text-dim">
              {key.expiresAt
                ? `${t("apikeys.expires")} ${new Date(key.expiresAt).toLocaleDateString()}`
                : t("apikeys.noExpiry")}
            </span>
            <button
              className="ml-auto text-xs text-red-400 hover:underline"
              onClick={() => remove.mutate(key.id)}
            >
              {t("apikeys.revoke")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
