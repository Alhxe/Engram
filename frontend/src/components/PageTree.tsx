import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, CornerLeftUp } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useBreadcrumb, useMoveNode, useNodeChildren } from "@/lib/queries";
import type { NodeTreeItem } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { LAYOUT_ICON, LAYOUT_TEXT } from "./ui";

// Shared expand state so the tree can auto-open the ancestor chain of the
// active page (deep links / link navigation) instead of each node tracking
// its own open flag in isolation.
const TreeContext = createContext<{ openIds: Set<string>; toggle: (id: string) => void } | null>(null);

// The Academia study area has its own sidebar section, so its root page (and the
// subjects nested under it) are hidden from the general Pages tree.
const isAcademiaRoot = (item: NodeTreeItem) => item.title?.trim().toLowerCase() === "academia";
// The Salud area likewise has its own sidebar section.
const isSaludRoot = (item: NodeTreeItem) => item.title?.trim().toLowerCase() === "salud";

function TreeIcon({ item }: { item: NodeTreeItem }) {
  // Older backend payloads may not carry the layout yet — fall back to a document.
  const layout = item.layout ?? "DOCUMENT";
  const Icon = LAYOUT_ICON[layout] ?? LAYOUT_ICON.DOCUMENT;
  return (
    <Icon
      className={`h-3.5 w-3.5 shrink-0 ${LAYOUT_TEXT[layout] ?? "text-dim/70"}`}
      strokeWidth={1.75}
    />
  );
}

function TreeNode({ item, depth }: { item: NodeTreeItem; depth: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const ctx = useContext(TreeContext)!;
  const open = ctx.openIds.has(item.id);
  const { data: children } = useNodeChildren(item.id, open);

  const draggable = useDraggable({ id: item.id, data: { item } });
  const droppable = useDroppable({ id: item.id });
  const setRefs = useCallback(
    (el: HTMLElement | null) => {
      draggable.setNodeRef(el);
      droppable.setNodeRef(el);
    },
    [draggable, droppable],
  );

  const isActive = location.pathname === `/nodes/${item.id}`;

  return (
    <div>
      <div
        ref={setRefs}
        {...draggable.listeners}
        {...draggable.attributes}
        onClick={() => navigate(`/nodes/${item.id}`)}
        className={`group flex cursor-pointer select-none items-center rounded-lg py-1 pr-2 text-[13px] transition ${
          droppable.isOver
            ? "bg-accent/20 ring-1 ring-accent/60"
            : isActive
              ? "bg-elev text-ink"
              : "text-mid hover:bg-elev/60 hover:text-ink"
        } ${draggable.isDragging ? "opacity-30" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 2}px` }}
      >
        <span className="flex h-5 w-4 shrink-0 items-center justify-center">
          {item.hasChildren && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                ctx.toggle(item.id);
              }}
              className="flex h-4 w-4 items-center justify-center rounded text-dim hover:bg-line2 hover:text-ink"
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
                strokeWidth={2.25}
              />
            </button>
          )}
        </span>
        <TreeIcon item={item} />
        <span className={`ml-1.5 truncate ${isActive ? "font-medium" : ""}`}>
          {item.title || t("common.untitled")}
        </span>
      </div>
      {open && children?.map((child) => <TreeNode key={child.id} item={child} depth={depth + 1} />)}
    </div>
  );
}

function RootDropZone() {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: "__root__" });
  return (
    <div
      ref={setNodeRef}
      className={`mt-1.5 flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-xs transition ${
        isOver ? "border-accent/60 bg-accent/10 text-accent2" : "border-line2 text-dim"
      }`}
    >
      <CornerLeftUp className="h-3.5 w-3.5" strokeWidth={2} />
      {t("tree.toRoot")}
    </div>
  );
}

export function Tree({ roots }: { roots: NodeTreeItem[] }) {
  const move = useMoveNode();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<NodeTreeItem | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const activeId = location.pathname.startsWith("/nodes/")
    ? location.pathname.slice("/nodes/".length)
    : undefined;
  const { data: breadcrumb } = useBreadcrumb(activeId);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Open every ancestor of the active page (breadcrumb minus the page itself)
  // so a direct URL or an in-page link reveals and highlights it in the tree.
  useEffect(() => {
    if (!breadcrumb) return;
    const ancestors = breadcrumb.map((b) => b.id).filter((id) => id !== activeId);
    if (ancestors.length === 0) return;
    setOpenIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ancestors) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [breadcrumb, activeId]);

  const treeCtx = useMemo(() => ({ openIds, toggle }), [openIds, toggle]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragStart = (event: DragStartEvent) => {
    setActiveItem((event.active.data.current?.item as NodeTreeItem) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over || over.id === active.id) return;
    const parentId = over.id === "__root__" ? null : (over.id as string);
    move.mutate({ id: active.id as string, parentId });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveItem(null)}
    >
      <TreeContext.Provider value={treeCtx}>
        <div className="space-y-px">
          {roots.map((item) => <TreeNode key={item.id} item={item} depth={0} />)}
          {activeItem && <RootDropZone />}
        </div>
      </TreeContext.Provider>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-elev px-2.5 py-1 text-[13px] text-ink shadow-xl ring-1 ring-accent/40">
            <TreeIcon item={activeItem} />
            <span className="truncate">{activeItem.title || "…"}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default function PageTree() {
  const { data: roots } = useNodeChildren(undefined, true);
  // The Academia root lives in its own sidebar section, not the Pages tree.
  return <Tree roots={(roots ?? []).filter((item) => !isAcademiaRoot(item) && !isSaludRoot(item))} />;
}
