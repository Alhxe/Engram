import { useState } from "react";
import { CheckCircle2, SkipForward } from "lucide-react";
import type { CompleteSessionBody, NodeResponse } from "@/lib/types";
import { useCompleteSession, useSaludTopes, useSkipSession } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

/** Exercises per calisthenics day, mirroring the backend generator so we can
 *  render a reps input per movement and map it to its progression record. */
const DAY_EXERCISES: Record<string, string[]> = {
  "Calistenia A": ["Flexiones", "Fondos", "Pica push-up", "Core"],
  "Calistenia B": ["Dominadas", "Remo australiano", "Sentadilla", "Hip thrust"],
  "Calistenia C": ["Flexiones", "Dominadas", "Sentadilla", "Core"],
};

/** Log panel shown on a training-session page (tag "entreno"): record reps /
 *  minutes / effort and Complete or Skip. Completing progresses the topes. */
export default function SessionView({ node }: { node: NodeResponse }) {
  const { t } = useI18n();
  const prop = (name: string) => node.properties.find((p) => p.name === name)?.value ?? null;
  const estado = prop("estado");
  const tipo = prop("tipo") ?? "";

  const { data: topes } = useSaludTopes();
  const complete = useCompleteSession();
  const skip = useSkipSession();

  const isStrength = tipo.startsWith("Calistenia");
  const isRun = tipo.startsWith("Carrera");
  const exercises = isStrength ? DAY_EXERCISES[tipo] ?? [] : [];

  const [reps, setReps] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");

  const topeId = (name: string) =>
    topes?.find((x) => x.title.toLowerCase() === name.toLowerCase())?.id;

  const submit = () => {
    const body: CompleteSessionBody = {};
    if (duration) body.durationMin = Number(duration);
    if (rpe) body.rpe = Number(rpe);
    if (notes.trim()) body.notes = notes.trim();
    if (isStrength) {
      body.exercises = exercises
        .map((name) => ({ topeId: topeId(name), reps: Number(reps[name]) }))
        .filter((e): e is { topeId: string; reps: number } => !!e.topeId && !Number.isNaN(e.reps));
    }
    complete.mutate({ id: node.id, body });
  };

  const badge =
    estado === "Hecho"
      ? { cls: "bg-emerald-500/15 text-emerald-500", label: t("salud.stateDone") }
      : estado === "Saltado"
        ? { cls: "bg-zinc-500/15 text-zinc-400", label: t("salud.stateSkipped") }
        : { cls: "bg-amber-500/15 text-amber-500", label: t("salud.statePending") };

  const numberField =
    "w-16 rounded-md border border-line bg-app px-2 py-1 text-right text-ink outline-none focus:border-accent/50";

  return (
    <div className="mt-4 rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">
          {t("salud.session")} · {tipo}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
      </div>

      {estado === "Pendiente" ? (
        <>
          {isStrength && (
            <div className="mb-3 space-y-2">
              {exercises.map((name) => (
                <label key={name} className="flex items-center justify-between gap-3 text-[13px] text-mid">
                  <span>{name}</span>
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={reps[name] ?? ""}
                      onChange={(e) => setReps((r) => ({ ...r, [name]: e.target.value }))}
                      className={numberField}
                    />
                    <span className="text-dim">{t("salud.reps")}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {isRun && (
            <label className="mb-3 flex items-center justify-between gap-3 text-[13px] text-mid">
              <span>{t("salud.minutes")}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-20 rounded-md border border-line bg-app px-2 py-1 text-right text-ink outline-none focus:border-accent/50"
              />
            </label>
          )}

          <div className="mb-3 flex items-center justify-between gap-3 text-[13px] text-mid">
            <span>{t("salud.effort")}</span>
            <select
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="rounded-md border border-line bg-app px-2 py-1 text-ink outline-none focus:border-accent/50"
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("salud.notes")}
            className="mb-3 w-full rounded-md border border-line bg-app px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent/50"
          />

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={complete.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> {t("salud.complete")}
            </button>
            <button
              onClick={() => skip.mutate(node.id)}
              disabled={skip.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mid transition hover:bg-elev disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" strokeWidth={2} /> {t("salud.skip")}
            </button>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-dim">
          {t("salud.logged")}: {prop("resultado") || prop("objetivo") || "—"}
        </p>
      )}
    </div>
  );
}
