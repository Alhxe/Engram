import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, getUsername } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nContext";
import { LANGUAGES, LANGUAGE_LABELS } from "@/i18n/translations";
import ApiKeysManager from "@/components/ApiKeysManager";
import AiSettingsManager from "@/components/AiSettingsManager";
import WebhooksManager from "@/components/WebhooksManager";
import HygienePanel from "@/components/HygienePanel";
import { Button } from "@/components/ui";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line py-7 last:border-0">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-dim">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [backingUp, setBackingUp] = useState(false);

  const signOut = () => {
    clearSession();
    window.location.reload();
  };

  const backup = async () => {
    setBackingUp(true);
    try {
      await api.backup();
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-ink">{t("settings.title")}</h1>

      <Section title={t("settings.account")} hint={t("settings.accountHint")}>
        <div className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-violet-500 text-sm font-semibold text-white">
              {(getUsername() ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <span className="font-medium text-ink">{getUsername()}</span>
          </div>
          <Button variant="subtle" onClick={signOut}>
            {t("sidebar.signOut")}
          </Button>
        </div>
      </Section>

      <Section title={t("settings.language")} hint={t("settings.languageHint")}>
        <div className="inline-flex items-center rounded-lg border border-line bg-card p-0.5">
          {LANGUAGES.map((code) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition ${
                lang === code ? "bg-elev text-ink shadow-sm" : "text-dim hover:text-mid"
              }`}
            >
              {LANGUAGE_LABELS[code]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("ai.title")} hint={t("ai.hint")}>
        <AiSettingsManager />
      </Section>

      <Section title={t("settings.apiKeys")} hint={t("settings.apiKeysHint")}>
        <ApiKeysManager />
      </Section>

      <Section title={t("webhooks.title")} hint={t("webhooks.hint")}>
        <WebhooksManager />
      </Section>

      <Section title={t("calendarFeed.title")} hint={t("calendarFeed.hint")}>
        <code className="block break-all rounded-lg border border-line bg-card px-3 py-2 text-xs text-mid">
          {window.location.origin}/api/v1/calendar.ics?key=YOUR_API_KEY
        </code>
      </Section>

      <Section title={t("hygiene.title")} hint={t("hygiene.hint")}>
        <HygienePanel />
      </Section>

      <Section title={t("backup.title")} hint={t("backup.hint")}>
        <Button variant="subtle" onClick={backup} disabled={backingUp}>
          <Download className="h-4 w-4" strokeWidth={1.75} />
          {backingUp ? t("backup.working") : t("backup.export")}
        </Button>
      </Section>
    </div>
  );
}
