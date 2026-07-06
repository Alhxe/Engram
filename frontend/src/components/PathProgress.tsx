import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Route } from "lucide-react";
import { api } from "@/lib/api";
import { useNodes } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import type { NodeResponse } from "@/lib/types";

const DONE = "Hecho";

const isDone = (n: NodeResponse) => n.properties?.some((p) => p.name === DONE && p.value === "true");

/**
 * Learning-path view: shown on a page tagged "ruta". Renders its child pages as
 * an ordered, checkable list with a progress bar. Ticking a step toggles a
 * "Hecho" checkbox property on that child — plain substrate, no new model.
 */
export default function PathProgress({ nodeId }: { nodeId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useNodes(nodeId);
  const steps = data?.content ?? [];

  const toggle = useMutation({
    mutationFn: ({ childId, done }: { childId: string; done: boolean }) =>
      api.nodes.upsertProperty(childId, { name: DONE, type: "CHECKBOX", value: done ? "true" : "false" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nodes"] }),
  });

  if (steps.length === 0) return null;

  const doneCount = steps.filter(isDone).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="mb-6 rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Route className="h-4 w-4 text-accent2" strokeWidth={1.75} /> {t("path.title")}
        </span>
        <span className="text-xs text-dim">
          {doneCount}/{steps.length} · {pct}%
        </span>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-elev">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ol className="space-y-0.5">
        {steps.map((step) => {
          const done = isDone(step);
          return (
            <li key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => toggle.mutate({ childId: step.id, done: !done })}
                className="flex h-6 w-6 shrink-0 items-center justify-center text-dim transition hover:text-ink"
                title={t("path.toggle")}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
                ) : (
                  <Circle className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
              <button
                onClick={() => navigate(`/nodes/${step.id}`)}
                className={`truncate text-left text-sm transition hover:underline ${
                  done ? "text-dim line-through" : "text-mid hover:text-ink"
                }`}
              >
                {step.title || t("common.untitled")}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
