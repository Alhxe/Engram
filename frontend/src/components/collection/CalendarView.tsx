import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { NodeResponse } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { useCollection } from "./useCollection";

const pad = (n: number) => String(n).padStart(2, "0");

function EventChip({ node, onOpen }: { node: NodeResponse; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: node.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`cursor-pointer truncate rounded-md bg-accent/20 px-1.5 py-0.5 text-accent2 transition hover:bg-accent/30 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {node.title || "—"}
    </div>
  );
}

function DayCell({
  day,
  dateStr,
  nodes,
  isToday,
  onAdd,
}: {
  day: number;
  dateStr: string;
  nodes: NodeResponse[];
  isToday: boolean;
  onAdd: () => void;
}) {
  const navigate = useNavigate();
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dateStr}` });
  return (
    <div ref={setNodeRef} className={`group min-h-[84px] bg-panel p-1.5 text-xs transition ${isOver ? "bg-accent/5" : ""}`}>
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
            isToday ? "bg-accent font-semibold text-white" : "text-dim"
          }`}
        >
          {day}
        </span>
        <button
          onClick={onAdd}
          className="text-dim opacity-0 transition hover:text-accent2 group-hover:opacity-100"
          title="+"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="space-y-1">
        {nodes.map((node) => (
          <EventChip key={node.id} node={node} onOpen={() => navigate(`/nodes/${node.id}`)} />
        ))}
      </div>
    </div>
  );
}

export default function CalendarView({
  children,
  parentId,
  dateName,
  untitled,
}: {
  children: NodeResponse[];
  parentId: string;
  dateName: string;
  untitled: string;
}) {
  const { lang } = useI18n();
  const { setProperty, addRow } = useCollection(parentId, untitled);
  const [offset, setOffset] = useState(0);
  const draggingRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [lang]);

  const dateOf = (node: NodeResponse) => node.properties.find((p) => p.name === dateName)?.value ?? null;

  const byDay = new Map<number, NodeResponse[]>();
  children.forEach((node) => {
    const value = dateOf(node);
    if (!value) return;
    const d = new Date(value);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(node);
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dateStrFor = (day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const onDragEnd = (event: DragEndEvent) => {
    draggingRef.current = true;
    setTimeout(() => (draggingRef.current = false), 0);
    const { active, over } = event;
    if (!over) return;
    const dateStr = String(over.id).replace("day:", "");
    const node = children.find((n) => n.id === active.id);
    if (!node || dateOf(node) === dateStr) return;
    setProperty.mutate({ nodeId: node.id as string, name: dateName, type: "DATE", value: dateStr });
  };

  const addOn = (day: number) =>
    addRow.mutate({ props: [{ name: dateName, type: "DATE", value: dateStrFor(day) }] });

  const monthLabel = base.toLocaleDateString(lang, { month: "long", year: "numeric" });

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex items-center justify-between border-b border-line bg-card px-3 py-2">
          <span className="text-sm font-semibold capitalize text-ink">{monthLabel}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setOffset(offset - 1)} className="flex h-6 w-6 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button onClick={() => setOffset(0)} className="rounded-md px-2 py-0.5 text-xs text-dim transition hover:bg-elev hover:text-ink">
              {monthLabelToday(lang)}
            </button>
            <button onClick={() => setOffset(offset + 1)} className="flex h-6 w-6 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink">
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-line bg-panel text-center text-[11px] font-medium uppercase tracking-wide text-dim">
          {weekdays.map((d) => <div key={d} className="py-1.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-line">
          {cells.map((day, index) =>
            day ? (
              <DayCell
                key={index}
                day={day}
                dateStr={dateStrFor(day)}
                nodes={byDay.get(day) ?? []}
                isToday={isToday(day)}
                onAdd={() => addOn(day)}
              />
            ) : (
              <div key={index} className="min-h-[84px] bg-app/40" />
            ),
          )}
        </div>
      </div>
    </DndContext>
  );
}

function monthLabelToday(lang: string): string {
  return lang === "es" ? "Hoy" : "Today";
}
