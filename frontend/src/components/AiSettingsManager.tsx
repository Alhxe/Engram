import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { AiProviderType, AiTask } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { Button, Input } from "./ui";

const PROVIDERS: { type: AiProviderType; name: string; hint: string }[] = [
  { type: "CLAUDE", name: "Claude", hint: "sk-ant-…" },
  { type: "DEEPSEEK", name: "DeepSeek", hint: "sk-…" },
  { type: "CUSTOM", name: "Custom (OpenAI-compatible)", hint: "sk-… (optional)" },
];

const TIER_STYLE: Record<string, string> = {
  CHEAP: "bg-emerald-500/15 text-emerald-300",
  BALANCED: "bg-amber-500/15 text-amber-300",
  POWERFUL: "bg-violet-500/15 text-violet-300",
  UNKNOWN: "bg-zinc-500/15 text-zinc-300",
};

function ProviderCard({
  provider,
  name,
  hint,
  connected,
}: {
  provider: AiProviderType;
  name: string;
  hint: string;
  connected: boolean;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [url, setUrl] = useState("");
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const needsUrl = provider === "CUSTOM";
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ai", "settings"] });

  const connect = useMutation({
    mutationFn: () =>
      api.ai.setCredential({ provider, apiKey: key.trim(), baseUrl: needsUrl ? url.trim() : undefined }),
    onSuccess: () => {
      setKey("");
      setUrl("");
      setTestMsg(null);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: () => api.ai.deleteCredential(provider),
    onSuccess: () => {
      setTestMsg(null);
      invalidate();
    },
  });
  const test = useMutation({
    mutationFn: () => api.ai.test(provider),
    onSuccess: () => setTestMsg(t("ai.testOk")),
    onError: (e) => setTestMsg(e instanceof ApiError ? e.message : t("ai.testFail")),
  });

  const connectError = connect.error instanceof ApiError ? connect.error.message : null;

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-medium text-ink">{name}</div>
          <div className="text-xs text-dim">{connected ? t("ai.connected") : t("ai.notConnected")}</div>
        </div>
        {connected && (
          <>
            <Button variant="subtle" onClick={() => test.mutate()} disabled={test.isPending}>
              {t("ai.test")}
            </Button>
            <button
              onClick={() => remove.mutate()}
              className="flex h-8 w-8 items-center justify-center rounded-md text-dim transition hover:bg-red-500/10 hover:text-red-400"
              title={t("ai.remove")}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {!connected && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (needsUrl ? url.trim() : key.trim()) connect.mutate();
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          {needsUrl && (
            <Input
              className="w-full"
              type="url"
              placeholder={t("ai.baseUrlHint")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}
          <Input
            className="max-w-xs"
            type="password"
            placeholder={`${t("ai.apiKeyOf")} ${name} (${hint})`}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <Button type="submit" disabled={connect.isPending || (needsUrl ? !url.trim() : !key.trim())}>
            {t("ai.connect")}
          </Button>
        </form>
      )}

      {connectError && <p className="mt-2 text-sm text-red-400">{connectError}</p>}
      {testMsg && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-mid">
          <Check className="h-4 w-4 text-emerald-400" strokeWidth={2} /> {testMsg}
        </p>
      )}
    </div>
  );
}

export default function AiSettingsManager() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ai", "settings"], queryFn: () => api.ai.settings() });

  const setTask = useMutation({
    mutationFn: (v: { task: AiTask; provider: AiProviderType; model: string }) =>
      api.ai.setTaskModel(v.task, { provider: v.provider, model: v.model, enabled: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai", "settings"] }),
  });

  const { data: usage } = useQuery({ queryKey: ["ai", "usage"], queryFn: () => api.ai.usage() });

  const models = data?.models ?? [];
  const connectedSet = new Set(
    (data?.providers ?? []).filter((p) => p.connected).map((p) => p.provider),
  );
  const anyConnected = connectedSet.size > 0;

  const fmt = (n: number) => n.toLocaleString();
  const usd = (n: number) => (n < 0.01 && n > 0 ? "< $0.01" : `$${n.toFixed(2)}`);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((p) => (
          <ProviderCard
            key={p.type}
            provider={p.type}
            name={p.name}
            hint={p.hint}
            connected={connectedSet.has(p.type)}
          />
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs text-dim">{t("ai.tasksHint")}</p>
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="divide-y divide-line">
            {data?.tasks.map((task) => {
              const model = models.find((m) => m.id === task.model && m.provider === task.provider);
              const providerName = PROVIDERS.find((p) => p.type === task.provider)?.name ?? task.provider;
              return (
                <div key={task.task} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 text-sm text-ink">{t(`ai.task.${task.task}`)}</span>
                  {model && (
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${TIER_STYLE[model.tier]}`}>
                      {t(`ai.tier.${model.tier}`)}
                    </span>
                  )}
                  {!connectedSet.has(task.provider) && (
                    <span className="text-[11px] text-amber-400/80">{providerName} · {t("ai.notConnected")}</span>
                  )}
                  <select
                    value={`${task.provider}:${task.model}`}
                    disabled={!anyConnected}
                    onChange={(e) => {
                      const [provider, model] = e.target.value.split(":") as [AiProviderType, string];
                      setTask.mutate({ task: task.task, provider, model });
                    }}
                    className="rounded-lg border border-line2 bg-card px-2 py-1 text-[13px] text-ink outline-none focus:border-accent/60 disabled:opacity-50"
                  >
                    {PROVIDERS.map((p) => (
                      <optgroup key={p.type} label={p.name}>
                        {models
                          .filter((m) => m.provider === p.type)
                          .map((m) => (
                            <option key={`${p.type}:${m.id}`} value={`${p.type}:${m.id}`}>
                              {m.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {usage && usage.byTask.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-dim">{t("ai.usageHint")}</p>
            <span className="text-sm font-semibold text-ink">
              {usd(usage.totalCostUsd)} · {fmt(usage.totalInputTokens + usage.totalOutputTokens)} tok
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-card text-left text-[11px] uppercase tracking-wide text-dim">
                  <th className="px-3.5 py-2 font-semibold">{t("ai.usageTask")}</th>
                  <th className="px-3.5 py-2 text-right font-semibold">{t("ai.usageCalls")}</th>
                  <th className="px-3.5 py-2 text-right font-semibold">Tokens</th>
                  <th className="px-3.5 py-2 text-right font-semibold">{t("ai.usageCost")}</th>
                </tr>
              </thead>
              <tbody>
                {usage.byTask.map((row) => (
                  <tr key={row.task} className="border-b border-line last:border-0">
                    <td className="px-3.5 py-2 text-mid">{t(`ai.task.${row.task}`)}</td>
                    <td className="px-3.5 py-2 text-right text-dim">{fmt(row.calls)}</td>
                    <td className="px-3.5 py-2 text-right text-dim">
                      {fmt(row.inputTokens + row.outputTokens)}
                    </td>
                    <td className="px-3.5 py-2 text-right text-mid">{usd(row.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
