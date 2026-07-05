import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowUpRight, Plus } from "lucide-react";
import type { NodeResponse } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { useCollection } from "./useCollection";
import { TagChip } from "../ui";

interface Column {
  /** Property value backing this column, or null for the "no value" bucket. */
  value: string | null;
  label: string;
}

function Card({ node, onOpen }: { node: NodeResponse; onOpen: () => void }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: node.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group/card cursor-grab rounded-lg border border-line bg-card px-3 py-2 shadow-sm transition hover:border-line2 active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-sm font-medium text-ink">
          {node.title || t("common.untitled")}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onOpen}
          className="text-dim opacity-0 transition hover:text-accent2 group-hover/card:opacity-100"
          title={t("page.open")}
        >
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      {node.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {node.tags.slice(0, 3).map((tag) => <TagChip key={tag}>{tag}</TagChip>)}
        </div>
      )}
    </div>
  );
}

function ColumnBox({
  column,
  index,
  nodes,
  onAdd,
}: {
  column: Column;
  index: number;
  nodes: NodeResponse[];
  onAdd: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { setNodeRef, isOver } = useDroppable({ id: `col:${index}` });
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[13px] font-semibold text-mid">{column.label}</span>
        <span className="rounded-full bg-elev px-1.5 text-[11px] text-dim">{nodes.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-xl border p-2 transition ${
          isOver ? "border-accent/60 bg-accent/5" : "border-line bg-panel"
        }`}
      >
        {nodes.map((node) => (
          <Card key={node.id} node={node} onOpen={() => navigate(`/nodes/${node.id}`)} />
        ))}
        <button
          onClick={onAdd}
          className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-dim transition hover:bg-card hover:text-mid"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("board.addCard")}
        </button>
      </div>
    </div>
  );
}

export default function BoardView({
  children,
  parentId,
  groupName,
  untitled,
}: {
  children: NodeResponse[];
  parentId: string;
  groupName: string;
  untitled: string;
}) {
  const { t } = useI18n();
  const { setProperty, addRow } = useCollection(parentId, untitled);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newCol, setNewCol] = useState("");
  const [dragged, setDragged] = useState<NodeResponse | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const propOf = (node: NodeResponse) => node.properties.find((p) => p.name === groupName)?.value || null;

  const columns: Column[] = useMemo(() => {
    const present = new Map<string, Column>();
    // Real values first (in first-seen order), then any pre-created empty columns.
    children.forEach((node) => {
      const value = propOf(node);
      if (value && !present.has(value)) present.set(value, { value, label: value });
    });
    extraColumns.forEach((value) => {
      if (!present.has(value)) present.set(value, { value, label: value });
    });
    const cols = [...present.values()];
    cols.push({ value: null, label: t("view.noValue") });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, extraColumns, groupName, t]);

  const nodesFor = (column: Column) => children.filter((n) => propOf(n) === column.value);

  const onDragStart = (event: DragStartEvent) =>
    setDragged(children.find((n) => n.id === event.active.id) ?? null);

  const onDragEnd = (event: DragEndEvent) => {
    setDragged(null);
    const { active, over } = event;
    if (!over) return;
    const index = Number(String(over.id).replace("col:", ""));
    const column = columns[index];
    if (!column) return;
    const node = children.find((n) => n.id === active.id);
    if (!node || propOf(node) === column.value) return;
    setProperty.mutate({ nodeId: node.id as string, name: groupName, type: "SELECT", value: column.value });
  };

  const addCard = (column: Column) =>
    addRow.mutate({
      props: column.value ? [{ name: groupName, type: "SELECT", value: column.value }] : [],
    });

  const submitColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCol.trim();
    if (name && !columns.some((c) => c.value === name)) setExtraColumns((c) => [...c, name]);
    setNewCol("");
    setAdding(false);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((column, index) => (
          <ColumnBox
            key={column.value ?? "__none__"}
            column={column}
            index={index}
            nodes={nodesFor(column)}
            onAdd={() => addCard(column)}
          />
        ))}

        <div className="w-56 shrink-0">
          {adding ? (
            <form onSubmit={submitColumn} className="px-1">
              <input
                autoFocus
                value={newCol}
                onChange={(e) => setNewCol(e.target.value)}
                onBlur={submitColumn}
                onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                placeholder={t("board.columnName")}
                className="w-full rounded-lg border border-line2 bg-card px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent/60"
              />
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-dim transition hover:bg-card hover:text-mid"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("board.addColumn")}
            </button>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragged ? (
          <div className="w-60 rounded-lg border border-accent/50 bg-elev px-3 py-2 text-sm font-medium text-ink shadow-2xl">
            {dragged.title || t("common.untitled")}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
