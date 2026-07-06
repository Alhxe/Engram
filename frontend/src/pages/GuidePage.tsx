import { useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { useGuide } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

/** A printable study guide: a subject's whole subtree flattened into one
 *  document. "Print / Save PDF" uses the browser's print-to-PDF. */
export default function GuidePage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const scope = params.get("scope") ?? undefined;
  const { data: sections, isLoading } = useGuide(scope);

  if (isLoading) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  const list = sections ?? [];

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <span className="text-xs uppercase tracking-wide text-dim">{t("guide.title")}</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent2"
        >
          <Printer className="h-4 w-4" strokeWidth={1.75} /> {t("guide.print")}
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-dim">{t("guide.empty")}</p>
      ) : (
        <article className="space-y-6 text-ink">
          {list.map((s, i) => (
            <section key={i}>
              {i === 0 ? (
                <h1 className="mb-3 text-2xl font-bold">{s.title || t("common.untitled")}</h1>
              ) : (
                <h2 className="mb-2 mt-6 text-lg font-semibold">{s.title || t("common.untitled")}</h2>
              )}
              {s.content && (
                <div
                  className="text-[15px] leading-relaxed [&_code]:rounded [&_code]:bg-elev [&_code]:px-1 [&_h2]:mt-3 [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-elev [&_pre]:p-3 [&_strong]:font-semibold [&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-line [&_th]:px-2 [&_th]:py-1"
                  dangerouslySetInnerHTML={{ __html: s.content }}
                />
              )}
            </section>
          ))}
        </article>
      )}
    </div>
  );
}
