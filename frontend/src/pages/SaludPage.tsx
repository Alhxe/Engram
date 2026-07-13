import { Link } from "react-router-dom";
import { ChevronRight, RefreshCw } from "lucide-react";
import type { NodeResponse } from "@/lib/types";
import {
  useAdvanceSaludWeek,
  useRecalculateSalud,
  useSaludStatus,
  useSaludToday,
  useSaludWeek,
} from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

/** Salud dashboard: plan status, weigh-in trend + recommendation, the reajustar
 *  button, and today's / this week's sessions. */
export default function SaludPage() {
  const { t } = useI18n();
  const { data: status } = useSaludStatus();
  const recalc = useRecalculateSalud();
  const advance = useAdvanceSaludWeek();
  const { data: today } = useSaludToday();
  const week = status?.semanaActual ?? 1;
  const { data: weekSessions } = useSaludWeek(week);

  if (!status?.exists) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-dim">{t("salud.empty")}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("salud.title")}</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("salud.week")} value={`${status.semanaActual}/${status.semanasTotal}`} />
        <Stat
          label={t("salud.weight")}
          value={status.pesoActual != null ? `${status.pesoActual} kg` : "—"}
          sub={status.pesoObjetivo != null ? `${t("salud.target")} ${status.pesoObjetivo}` : undefined}
        />
        <Stat label={t("salud.done")} value={String(status.sesionesHechas)} />
        <Stat label={t("salud.pending")} value={String(status.sesionesPendientes)} />
      </div>

      {status.recomendacion && (
        <div className="mb-4 rounded-xl border border-line bg-card p-3 text-[13px] text-mid">
          {status.recomendacion}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => recalc.mutate()}
          disabled={recalc.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${recalc.isPending ? "animate-spin" : ""}`} strokeWidth={2} />{" "}
          {t("salud.recalculate")}
        </button>
        <button
          onClick={() => advance.mutate()}
          disabled={advance.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mid transition hover:bg-elev disabled:opacity-50"
        >
          {t("salud.advanceWeek")}
        </button>
      </div>

      <Section title={t("salud.today")} items={today} empty={t("salud.noSession")} />
      <Section title={`${t("salud.thisWeek")} · ${t("salud.week")} ${week}`} items={weekSessions} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-dim">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-dim">{sub}</div>}
    </div>
  );
}

function Section({ title, items, empty }: { title: string; items?: NodeResponse[]; empty?: string }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dim">{title}</h2>
      {!items || items.length === 0 ? (
        <p className="text-[13px] text-dim">{empty ?? "—"}</p>
      ) : (
        <div className="space-y-1">
          {items.map((s) => {
            const estado = s.properties.find((p) => p.name === "estado")?.value ?? undefined;
            return (
              <Link
                key={s.id}
                to={`/nodes/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-mid transition hover:bg-elev"
              >
                <span>{s.title}</span>
                <span className="flex items-center gap-2">
                  {estado && <StateDot estado={estado} />}
                  <ChevronRight className="h-4 w-4 text-dim" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StateDot({ estado }: { estado: string }) {
  const cls = estado === "Hecho" ? "bg-emerald-500" : estado === "Saltado" ? "bg-zinc-400" : "bg-amber-500";
  return <span className={`h-2 w-2 rounded-full ${cls}`} title={estado} />;
}
