import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type { MealIdea, NodeResponse } from "@/lib/types";
import {
  useCreateWorkout,
  useDeleteWorkout,
  useGenerateMenu,
  useGenerateRecipe,
  useRecalculateSalud,
  useSaludStatus,
  useSaludTodayMenu,
  useSaludToday,
  useSaludWeek,
  useSetSaludWeek,
  useSuggestDishes,
  useUpdateWorkout,
  useWeighIn,
} from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

/** Salud dashboard: plan status, week navigation, weigh-in, today's session +
 *  menu, and AI dish/recipe requests — all constrained by the food preferences. */
export default function SaludPage() {
  const { t } = useI18n();
  const { data: status } = useSaludStatus();
  const recalc = useRecalculateSalud();
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <WeekNav week={week} total={status.semanasTotal} />
        <button
          onClick={() => recalc.mutate()}
          disabled={recalc.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${recalc.isPending ? "animate-spin" : ""}`} strokeWidth={2} />{" "}
          {t("salud.recalculate")}
        </button>
        <WeightQuickAdd />
      </div>

      {status.recomendacion && (
        <div className="mb-6 rounded-xl border border-line bg-card p-3 text-[13px] text-mid">
          {status.recomendacion}
        </div>
      )}

      <Section title={t("salud.today")} items={today} empty={t("salud.noSession")} />

      <TodayMenu />
      <MealIdeas />

      <WorkoutManager title={`${t("salud.thisWeek")} · ${t("salud.week")} ${week}`} items={weekSessions} />
    </div>
  );
}

const TIPOS = [
  "Calistenia A",
  "Calistenia B",
  "Calistenia C",
  "Carrera Z2",
  "Carrera intervalos",
  "Carrera larga",
  "Descanso",
];
const ESTADOS = ["Pendiente", "Hecho", "Saltado"];

function WorkoutManager({ title, items }: { title: string; items?: NodeResponse[] }) {
  const { t } = useI18n();
  const del = useDeleteWorkout();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">{title}</h2>
        <button
          onClick={() => {
            setAdding((a) => !a);
            setEditing(null);
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("salud.newWorkout")}
        </button>
      </div>

      {adding && <WorkoutForm onDone={() => setAdding(false)} />}

      <div className="space-y-1">
        {(items ?? []).map((s) =>
          editing === s.id ? (
            <WorkoutForm key={s.id} session={s} onDone={() => setEditing(null)} />
          ) : (
            <WorkoutRow
              key={s.id}
              s={s}
              onEdit={() => {
                setEditing(s.id);
                setAdding(false);
              }}
              onDelete={() => del.mutate(s.id)}
            />
          ),
        )}
        {(!items || items.length === 0) && !adding && <p className="text-[13px] text-dim">—</p>}
      </div>
    </section>
  );
}

function WorkoutRow({ s, onEdit, onDelete }: { s: NodeResponse; onEdit: () => void; onDelete: () => void }) {
  const estado = s.properties.find((p) => p.name === "estado")?.value ?? undefined;
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-mid">
      <Link to={`/nodes/${s.id}`} className="min-w-0 flex-1 truncate transition hover:text-ink">
        {s.title}
      </Link>
      <span className="flex items-center gap-2 pl-2">
        {estado && <StateDot estado={estado} />}
        <button onClick={onEdit} className="rounded p-1 text-dim transition hover:bg-elev hover:text-ink" title="Editar">
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-dim transition hover:bg-elev hover:text-rose-400"
          title="Borrar"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </span>
    </div>
  );
}

function WorkoutForm({ session, onDone }: { session?: NodeResponse; onDone: () => void }) {
  const { t } = useI18n();
  const create = useCreateWorkout();
  const update = useUpdateWorkout();
  const prop = (n: string) => session?.properties.find((p) => p.name === n)?.value ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(prop("fecha") || today);
  const [tipo, setTipo] = useState(prop("tipo") || "Descanso");
  const [objetivo, setObjetivo] = useState(prop("objetivo") || "");
  const [estado, setEstado] = useState(prop("estado") || "Pendiente");
  const pending = create.isPending || update.isPending;

  const save = () => {
    if (session) update.mutate({ id: session.id, body: { fecha, tipo, objetivo, estado } }, { onSuccess: onDone });
    else create.mutate({ fecha, tipo, objetivo }, { onSuccess: onDone });
  };

  const field = "rounded-md border border-line bg-app px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent/50";

  return (
    <div className="mb-1 space-y-2 rounded-lg border border-accent/40 bg-card p-3">
      <div className="flex flex-wrap gap-2">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={field} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={field}>
          {TIPOS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        {session && (
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={field}>
            {ESTADOS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        )}
      </div>
      <input
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        placeholder={t("salud.objective")}
        className={`w-full ${field}`}
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {t("salud.save")}
        </button>
        <button
          onClick={onDone}
          className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mid transition hover:bg-elev"
        >
          {t("salud.cancel")}
        </button>
      </div>
    </div>
  );
}

function WeekNav({ week, total }: { week: number; total: number }) {
  const { t } = useI18n();
  const setWeek = useSetSaludWeek();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-card px-1 py-0.5">
      <button
        onClick={() => setWeek.mutate(week - 1)}
        disabled={week <= 1 || setWeek.isPending}
        className="flex h-7 w-7 items-center justify-center rounded-md text-mid transition hover:bg-elev disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
      </button>
      <span className="px-1 text-[13px] text-mid">
        {t("salud.week")} {week}/{total}
      </span>
      <button
        onClick={() => setWeek.mutate(week + 1)}
        disabled={week >= total || setWeek.isPending}
        className="flex h-7 w-7 items-center justify-center rounded-md text-mid transition hover:bg-elev disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function WeightQuickAdd() {
  const { t } = useI18n();
  const [kg, setKg] = useState("");
  const weigh = useWeighIn();
  const submit = () => {
    const v = Number(kg);
    if (!Number.isNaN(v) && v > 0) weigh.mutate({ peso: v }, { onSuccess: () => setKg("") });
  };
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        placeholder={t("salud.weight")}
        className="w-24 rounded-lg border border-line bg-card px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent/50"
      />
      <button
        onClick={submit}
        disabled={weigh.isPending || !kg}
        className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mid transition hover:bg-elev disabled:opacity-50"
      >
        {t("salud.logWeight")}
      </button>
    </div>
  );
}

function TodayMenu() {
  const { t } = useI18n();
  const { data: menu } = useSaludTodayMenu();
  const generate = useGenerateMenu();
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">{t("salud.todayMenu")}</h2>
        <button
          onClick={() => generate.mutate(undefined)}
          disabled={generate.isPending}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2 disabled:opacity-50"
        >
          <Sparkles className={`h-3.5 w-3.5 ${generate.isPending ? "animate-pulse" : ""}`} strokeWidth={2} />{" "}
          {menu ? t("salud.regenerate") : t("salud.generateMenu")}
        </button>
      </div>
      {menu?.content ? (
        <div
          className="prose-salud rounded-xl border border-line bg-card p-4 text-[13px] text-mid [&_h3]:mb-0.5 [&_h3]:mt-2 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-ink [&_p]:mb-1"
          dangerouslySetInnerHTML={{ __html: menu.content }}
        />
      ) : (
        <p className="text-[13px] text-dim">{t("salud.noMenu")}</p>
      )}
    </section>
  );
}

const MEALS = ["desayuno", "comida", "cena", "snack"];

function MealIdeas() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [meal, setMeal] = useState("cena");
  const [note, setNote] = useState("");
  const [ideas, setIdeas] = useState<MealIdea[]>([]);
  const suggest = useSuggestDishes();
  const recipe = useGenerateRecipe();

  const ask = () =>
    suggest.mutate({ meal, note: note.trim() || undefined }, { onSuccess: setIdeas });

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dim">{t("salud.askDishes")}</h2>
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            className="rounded-md border border-line bg-app px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent/50"
          >
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("salud.dishNote")}
            className="min-w-[8rem] flex-1 rounded-md border border-line bg-app px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent/50"
          />
          <button
            onClick={ask}
            disabled={suggest.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <UtensilsCrossed className="h-4 w-4" strokeWidth={2} /> {t("salud.suggest")}
          </button>
        </div>

        {suggest.isError && <p className="text-[13px] text-rose-400">{t("salud.aiError")}</p>}

        {ideas.length > 0 && (
          <ul className="space-y-1.5">
            {ideas.map((idea) => (
              <li
                key={idea.nombre}
                className="flex items-start justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2"
              >
                <div>
                  <div className="text-[13px] font-medium text-ink">{idea.nombre}</div>
                  {idea.descripcion && <div className="text-xs text-dim">{idea.descripcion}</div>}
                </div>
                <button
                  onClick={() =>
                    recipe.mutate(idea.nombre, { onSuccess: (page) => navigate(`/nodes/${page.id}`) })
                  }
                  disabled={recipe.isPending}
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2 disabled:opacity-50"
                >
                  <ChefHat className="h-3.5 w-3.5" strokeWidth={2} /> {t("salud.recipe")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
