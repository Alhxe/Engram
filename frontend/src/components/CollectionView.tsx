import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ChevronRight, GripVertical, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useReorderNodes } from "@/lib/queries";
import type { NodeResponse, SavedView, SchemaField } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { LayoutIcon, Select, TagChip } from "./ui";
import TableView, { type Column } from "./collection/TableView";
import BoardView from "./collection/BoardView";
import CalendarView from "./collection/CalendarView";
import ChartView from "./collection/ChartView";

// Mind-map view pulls in React Flow — load it only when actually shown.
const MapView = lazy(() => import("./collection/MapView"));

export type ViewMode = "list" | "table" | "board" | "calendar" | "map" | "chart";

export default function CollectionView({
  children,
  parentId,
  lockedMode,
  defaultMode = "list",
  onAdd,
  tall = false,
  schema = [],
}: {
  children: NodeResponse[];
  parentId: string;
  lockedMode?: ViewMode;
  defaultMode?: ViewMode;
  onAdd?: () => void;
  tall?: boolean;
  schema?: SchemaField[];
}) {
  const { t } = useI18n();
  const [freeMode, setFreeMode] = useState<ViewMode>(defaultMode);
  const mode = lockedMode ?? freeMode;
  const untitled = t("common.untitled");

  const columns: Column[] = useMemo(() => {
    const map = new Map<string, Column>();
    // Schema columns first, so they always show even with no data yet (and carry options).
    schema.forEach((f) => map.set(f.name, { name: f.name, type: f.type, options: f.options ?? null }));
    children.forEach((child) => child.properties.forEach((p) => {
      if (!map.has(p.name)) map.set(p.name, { name: p.name, type: p.type });
    }));
    return [...map.values()];
  }, [children, schema]);

  const [groupBy, setGroupBy] = useState("");
  const [dateBy, setDateBy] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [filterText, setFilterText] = useState("");
  const qc = useQueryClient();

  const onSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir(1);
    } else if (sortDir === 1) {
      setSortDir(-1);
    } else {
      setSortCol("");
      setSortDir(1);
    }
  };

  const { data: savedViews } = useQuery({
    queryKey: ["views", parentId],
    queryFn: () => api.nodes.views(parentId),
  });
  const createView = useMutation({
    mutationFn: (name: string) =>
      api.nodes.createView(parentId, {
        name,
        mode,
        groupBy,
        dateBy,
        sortCol,
        sortDir,
        filterText,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["views", parentId] }),
  });
  const deleteView = useMutation({
    mutationFn: (viewId: string) => api.nodes.deleteView(parentId, viewId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["views", parentId] }),
  });

  const applyView = (view: SavedView) => {
    if (!lockedMode && view.mode) setFreeMode(view.mode as ViewMode);
    setGroupBy(view.groupBy ?? "");
    setDateBy(view.dateBy ?? "");
    setSortCol(view.sortCol ?? "");
    setSortDir(view.sortDir === -1 ? -1 : 1);
    setFilterText(view.filterText ?? "");
  };

  const saveView = () => {
    const name = window.prompt(t("views.namePrompt"));
    if (name && name.trim()) createView.mutate(name.trim());
  };

  const selectCols = columns.filter((c) => c.type === "SELECT" || c.type === "TEXT");
  const dateCols = columns.filter((c) => c.type === "DATE");
  // Board/calendar bootstrap their own property if none exists yet.
  const groupName = groupBy || selectCols[0]?.name || t("board.defaultGroup");
  const dateName = dateBy || dateCols[0]?.name || t("calendar.defaultDate");

  const modes: ViewMode[] = ["list", "table", "board", "calendar", "chart", "map"];
  const showModeSwitcher = !lockedMode;
  const showGroupPicker = mode === "board" && selectCols.length > 1;
  const showDatePicker = mode === "calendar" && dateCols.length > 1;

  return (
    <div>
      {(showModeSwitcher || showGroupPicker || showDatePicker) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {showModeSwitcher && (
            <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setFreeMode(m)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    mode === m ? "bg-elev text-ink shadow-sm" : "text-dim hover:text-mid"
                  }`}
                >
                  {t(`view.${m}`)}
                </button>
              ))}
            </div>
          )}
          {showGroupPicker && (
            <Select value={groupName} onChange={(e) => setGroupBy(e.target.value)} className="py-1 text-xs">
              {selectCols.map((c) => (
                <option key={c.name} value={c.name}>{t("view.groupBy")}: {c.name}</option>
              ))}
            </Select>
          )}
          {showDatePicker && (
            <Select value={dateName} onChange={(e) => setDateBy(e.target.value)} className="py-1 text-xs">
              {dateCols.map((c) => (
                <option key={c.name} value={c.name}>{t("view.dateBy")}: {c.name}</option>
              ))}
            </Select>
          )}
        </div>
      )}

      {(savedViews?.length || true) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {savedViews?.map((view) => (
            <span
              key={view.id}
              className="group flex items-center gap-1 rounded-full border border-line2 bg-card py-0.5 pl-2.5 pr-1 text-xs text-mid"
            >
              <button onClick={() => applyView(view)} className="hover:text-ink">
                {view.name}
              </button>
              <button
                onClick={() => deleteView.mutate(view.id)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-dim opacity-0 transition group-hover:opacity-100 hover:text-red-400"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
          <button
            onClick={saveView}
            className="flex items-center gap-1 rounded-full border border-dashed border-line2 px-2 py-0.5 text-xs text-dim transition hover:border-accent/50 hover:text-mid"
          >
            <Bookmark className="h-3 w-3" strokeWidth={2} /> {t("views.save")}
          </button>
        </div>
      )}

      {mode === "list" && (
        <ListView children={children} parentId={parentId} untitled={untitled} onAdd={onAdd} />
      )}
      {mode === "table" && (
        <TableView
          children={children}
          derivedColumns={columns}
          parentId={parentId}
          untitled={untitled}
          filter={filterText}
          onFilter={setFilterText}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={onSort}
        />
      )}
      {mode === "board" && (
        <BoardView children={children} parentId={parentId} groupName={groupName} untitled={untitled} />
      )}
      {mode === "calendar" && (
        <CalendarView children={children} parentId={parentId} dateName={dateName} untitled={untitled} />
      )}
      {mode === "chart" && <ChartView children={children} columns={columns} />}
      {mode === "map" && (
        <Suspense fallback={<div className="h-[460px] rounded-xl border border-line bg-panel" />}>
          <MapView children={children} parentId={parentId} untitled={untitled} tall={tall} />
        </Suspense>
      )}
    </div>
  );
}

function ListView({
  children,
  parentId,
  untitled,
  onAdd,
}: {
  children: NodeResponse[];
  parentId: string;
  untitled: string;
  onAdd?: () => void;
}) {
  const { t } = useI18n();
  const reorder = useReorderNodes(parentId);
  const dragId = useRef<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => children.map((c) => c.id));
  const [overId, setOverId] = useState<string | null>(null);

  // Re-seed local order whenever the set of children changes (add/remove).
  useEffect(() => {
    const ids = children.map((c) => c.id);
    setOrder((prev) => {
      const sameSet = prev.length === ids.length && prev.every((id) => ids.includes(id));
      return sameSet ? prev : ids;
    });
  }, [children]);

  const byId = new Map(children.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as NodeResponse[];

  const drop = (targetId: string) => {
    const from = dragId.current;
    dragId.current = null;
    setOverId(null);
    if (!from || from === targetId) return;
    const next = [...order];
    next.splice(next.indexOf(from), 1);
    next.splice(next.indexOf(targetId), 0, from);
    setOrder(next);
    reorder.mutate(next);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="divide-y divide-line">
        {ordered.map((node) => (
          <div
            key={node.id}
            onDragOver={(e) => {
              if (dragId.current) {
                e.preventDefault();
                setOverId(node.id);
              }
            }}
            onDrop={() => drop(node.id)}
            className={`group flex items-center transition ${
              overId === node.id ? "bg-accent/10" : ""
            }`}
          >
            <button
              draggable
              onDragStart={() => (dragId.current = node.id)}
              onDragEnd={() => {
                dragId.current = null;
                setOverId(null);
              }}
              className="flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-dim/0 transition group-hover:text-dim/70 active:cursor-grabbing"
              title={t("collection.drag")}
            >
              <GripVertical className="h-4 w-4" strokeWidth={2} />
            </button>
            <Link
              to={`/nodes/${node.id}`}
              className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pr-3.5 text-sm hover:text-accent2"
            >
              <LayoutIcon layout={node.layout} className="text-dim" />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">
                {node.title || untitled}
              </span>
              <span className="hidden items-center gap-1 sm:flex">
                {node.tags.slice(0, 3).map((tag) => <TagChip key={tag}>{tag}</TagChip>)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-dim/60" strokeWidth={2} />
            </Link>
          </div>
        ))}
        {children.length === 0 && (
          <p className="px-3.5 py-3 text-[13px] text-dim">{t("collection.empty")}</p>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex w-full items-center gap-1.5 px-3.5 py-2 text-left text-[13px] text-dim transition hover:bg-card hover:text-mid"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("page.newSubPage")}
          </button>
        )}
      </div>
    </div>
  );
}
