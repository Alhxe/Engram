import { Link } from "react-router-dom";
import { Sprout } from "lucide-react";
import { useGarden } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

/** Public "digital garden": the index of every publicly shared page. No auth. */
export default function GardenPage() {
  const { t } = useI18n();
  const { data, isLoading } = useGarden();
  const entries = data ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <div className="mb-1 flex items-center gap-2.5">
        <Sprout className="h-5 w-5 text-accent2" strokeWidth={1.75} />
        <h1 className="text-2xl font-bold text-ink">{t("garden.title")}</h1>
      </div>
      <p className="mb-8 text-sm text-dim">{t("garden.subtitle")}</p>

      {isLoading ? (
        <p className="text-sm text-dim">{t("common.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-dim">{t("garden.empty")}</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.token}>
              <Link
                to={`/p/${e.token}`}
                className="block rounded-lg px-3 py-2 text-[15px] text-mid transition hover:bg-elev/60 hover:text-ink"
              >
                {e.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
