import { useNavigate } from "react-router-dom";
import { FileText, Globe, Sparkles, Wand2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

/** First-run welcome shown on the home screen when there are no pages yet. */
export default function Onboarding({
  onNewPage,
  onImport,
  onClip,
}: {
  onNewPage: () => void;
  onImport: () => void;
  onClip: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const actions = [
    { icon: FileText, title: t("onboard.newTitle"), desc: t("onboard.newDesc"), run: onNewPage },
    { icon: Wand2, title: t("onboard.importTitle"), desc: t("onboard.importDesc"), run: onImport },
    { icon: Globe, title: t("onboard.clipTitle"), desc: t("onboard.clipDesc"), run: onClip },
    { icon: Sparkles, title: t("onboard.askTitle"), desc: t("onboard.askDesc"), run: () => navigate("/ask") },
  ];

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-b from-card to-panel p-8 sm:p-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-violet-500 text-lg font-bold text-white shadow-[0_4px_16px_rgba(109,126,242,0.45)]">
          E
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">{t("onboard.title")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mid">{t("onboard.subtitle")}</p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((a) => (
          <button
            key={a.title}
            onClick={a.run}
            className="group flex items-start gap-3 rounded-xl border border-line bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-elev"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elev text-accent2 transition group-hover:bg-accent group-hover:text-white">
              <a.icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{a.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-dim">{a.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-dim">{t("onboard.tip")}</p>
    </div>
  );
}
