import { useNavigate } from "react-router-dom";
import { GraduationCap, Plus } from "lucide-react";
import { useCreateSubject, useSubjects } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { Tree } from "./PageTree";
import type { NodeTreeItem } from "@/lib/types";

/** Sidebar "Academia" section: the study area. Subjects render with the same
 *  expandable tree as Pages (so you can drill into Temario/Apuntes/…), plus a
 *  button that scaffolds a new subject. */
export default function AcademiaNav() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: subjects } = useSubjects();
  const create = useCreateSubject();

  const add = () =>
    create.mutate(t("academia.newSubject"), { onSuccess: (s) => navigate(`/nodes/${s.id}`) });

  const items: NodeTreeItem[] = (subjects ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    kind: s.kind,
    layout: s.layout,
    hasChildren: s.hasChildren,
  }));

  return (
    <div className="mt-5 px-3">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
          <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} /> {t("academia.title")}
        </span>
        <button
          onClick={add}
          disabled={create.isPending}
          title={t("academia.newSubject")}
          className="flex h-5 w-5 items-center justify-center rounded text-dim transition hover:bg-elev hover:text-ink disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="px-2 py-1 text-xs text-dim">{t("academia.empty")}</p>
      ) : (
        <Tree roots={items} />
      )}
    </div>
  );
}
