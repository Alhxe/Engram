import { useMemo, useState } from "react";
import type { NodeResponse } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { Select } from "../ui";
import type { Column } from "./TableView";

/**
 * Aggregates a collection into a simple bar chart: group by a property and count
 * pages, or sum/average a numeric property. Turns stored data into a quick metric.
 */
export default function ChartView({ children, columns }: { children: NodeResponse[]; columns: Column[] }) {
  const { t } = useI18n();
  const groupCols = columns.filter((c) => c.type === "SELECT" || c.type === "TEXT" || c.type === "MULTISELECT");
  const numberCols = columns.filter((c) => c.type === "NUMBER" || c.type === "RATING");

  const [groupBy, setGroupBy] = useState("");
  const [metric, setMetric] = useState("count"); // "count" | "sum:col" | "avg:col"
  const group = groupBy || groupCols[0]?.name || "";

  const bars = useMemo(() => {
    const buckets = new Map<string, { total: number; count: number }>();
    const add = (key: string, value: number) => {
      const b = buckets.get(key) ?? { total: 0, count: 0 };
      b.total += value;
      b.count += 1;
      buckets.set(key, b);
    };
    const [op, col] = metric.split(":");

    children.forEach((node) => {
      const raw = group ? node.properties.find((p) => p.name === group)?.value : null;
      const keys =
        raw && raw.includes(",") ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [raw?.trim() || t("view.noValue")];
      const metricValue = op === "count" ? 1 : Number(node.properties.find((p) => p.name === col)?.value) || 0;
      keys.forEach((k) => add(k || t("view.noValue"), metricValue));
    });

    return [...buckets.entries()]
      .map(([label, b]) => ({
        label,
        value: op === "count" ? b.count : op === "avg" ? (b.count ? b.total / b.count : 0) : b.total,
      }))
      .sort((a, b) => b.value - a.value);
  }, [children, group, metric, t]);

  const max = Math.max(...bars.map((b) => b.value), 1);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  if (children.length === 0) {
    return <p className="text-[13px] text-dim">{t("collection.empty")}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {groupCols.length > 0 && (
          <Select value={group} onChange={(e) => setGroupBy(e.target.value)} className="py-1 text-xs">
            {groupCols.map((c) => (
              <option key={c.name} value={c.name}>{t("chart.groupBy")}: {c.name}</option>
            ))}
          </Select>
        )}
        <Select value={metric} onChange={(e) => setMetric(e.target.value)} className="py-1 text-xs">
          <option value="count">{t("chart.count")}</option>
          {numberCols.flatMap((c) => [
            <option key={`sum:${c.name}`} value={`sum:${c.name}`}>{t("chart.sum")} {c.name}</option>,
            <option key={`avg:${c.name}`} value={`avg:${c.name}`}>{t("chart.avg")} {c.name}</option>,
          ])}
        </Select>
      </div>

      <div className="space-y-2 rounded-xl border border-line bg-card p-4">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 truncate text-right text-mid">{bar.label}</span>
            <div className="flex h-6 flex-1 items-center overflow-hidden rounded-md bg-elev">
              <div
                className="flex h-full items-center rounded-md bg-gradient-to-r from-accent to-violet-500 px-2 text-[11px] font-medium text-white"
                style={{ width: `${Math.max((bar.value / max) * 100, 3)}%` }}
              >
                {bar.value / max > 0.12 ? fmt(bar.value) : ""}
              </div>
              {bar.value / max <= 0.12 && <span className="ml-2 text-[11px] text-dim">{fmt(bar.value)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
