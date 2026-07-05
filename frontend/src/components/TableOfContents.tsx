import { useMemo } from "react";
import { List } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

/**
 * Auto table of contents built from the page's headings. Clicking an entry
 * scrolls to the matching heading in the live editor DOM (matched by document
 * order, which is identical in the parsed HTML and the rendered editor).
 */
export default function TableOfContents({ content }: { content: string }) {
  const { t } = useI18n();

  const headings = useMemo(() => {
    const doc = new DOMParser().parseFromString(content || "", "text/html");
    return Array.from(doc.querySelectorAll("h1, h2, h3")).map((el, index) => ({
      index,
      level: Number(el.tagName[1]),
      text: (el.textContent || "").trim(),
    }));
  }, [content]);

  const visible = headings.filter((h) => h.text.length > 0);
  if (visible.length < 3) return null;

  const scrollTo = (index: number) => {
    const els = document.querySelectorAll(".tiptap h1, .tiptap h2, .tiptap h3");
    els[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="mt-5 rounded-xl border border-line bg-card/60 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-dim">
        <List className="h-3.5 w-3.5" strokeWidth={2} /> {t("toc.title")}
      </div>
      <ul className="space-y-0.5">
        {visible.map((h) => (
          <li key={h.index}>
            <button
              onClick={() => scrollTo(h.index)}
              className="block w-full truncate text-left text-[13px] text-mid transition hover:text-accent2"
              style={{ paddingLeft: `${(h.level - 1) * 0.85}rem` }}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
