import { Link } from "react-router-dom";
import { HeartPulse, Plus } from "lucide-react";
import { useCreateSaludArea, useSaludExists } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

/** Sidebar "Salud" section: a link to the fitness dashboard, or a button that
 *  scaffolds the area on first use (mirrors AcademiaNav). */
export default function SaludNav() {
  const { t } = useI18n();
  const { data } = useSaludExists();
  const create = useCreateSaludArea();
  const exists = data?.exists;

  return (
    <div className="mt-5 px-3">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
          <HeartPulse className="h-3.5 w-3.5" strokeWidth={2} /> {t("salud.title")}
        </span>
        {!exists && (
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            title={t("salud.create")}
            className="flex h-5 w-5 items-center justify-center rounded text-dim transition hover:bg-elev hover:text-ink disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
      {exists ? (
        <Link
          to="/salud"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-[13px] text-mid transition hover:bg-elev/60 hover:text-ink"
        >
          {t("salud.dashboard")}
        </Link>
      ) : (
        <p className="px-2 py-1 text-xs text-dim">{t("salud.empty")}</p>
      )}
    </div>
  );
}
