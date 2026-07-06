import { useState } from "react";
import { Eye, Pencil, Sparkles } from "lucide-react";
import { useSrsGrade } from "@/lib/queries";
import { GRADES, type Grade } from "@/lib/srs";
import { useI18n } from "@/i18n/I18nContext";
import NoteEditor from "./NoteEditor";
import type { NodeResponse } from "@/lib/types";

/**
 * Renders a flashcard-tagged page AS a card, not a plain document: the title is
 * the question (shown by the page header), the content is the answer — hidden
 * behind a reveal for self-testing, with grade buttons that schedule the next
 * review. An edit toggle drops back to the normal editor to change the answer.
 */
export default function FlashcardView({
  node,
  content,
  onChange,
  onFocusChange,
}: {
  node: NodeResponse;
  content: string;
  onChange: (v: string) => void;
  onFocusChange: (focused: boolean) => void;
}) {
  const { t } = useI18n();
  const grade = useSrsGrade();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);

  const due = node.properties?.find((p) => p.name === "Repaso")?.value;

  const doGrade = (g: Grade) => {
    grade.mutate({ id: node.id, grade: g });
    setRevealed(false);
  };

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-wide text-dim">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent2" strokeWidth={1.75} />
            {t("flashcard.label")}
            {due && <span className="normal-case tracking-normal">· {t("flashcard.next")} {due}</span>}
          </span>
          <button
            onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 normal-case tracking-normal text-dim transition hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /> {editing ? t("flashcard.done") : t("flashcard.edit")}
          </button>
        </div>

        {editing ? (
          <NoteEditor content={content} onChange={onChange} nodeId={node.id} onFocusChange={onFocusChange} />
        ) : revealed ? (
          <div
            className="text-[15px] leading-relaxed text-ink [&_code]:rounded [&_code]:bg-elev [&_code]:px-1 [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-elev [&_pre]:p-3 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-elev/50 py-3 text-sm font-medium text-mid transition hover:bg-elev hover:text-ink"
          >
            <Eye className="h-4 w-4" strokeWidth={1.75} />
            {t("review.show")}
          </button>
        )}
      </div>

      {!editing && revealed && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {GRADES.map(({ grade: g, key, cls }) => (
            <button
              key={g}
              onClick={() => doGrade(g)}
              className={`rounded-lg border py-2.5 text-sm font-medium transition ${cls}`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
