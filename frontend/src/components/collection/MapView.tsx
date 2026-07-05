import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useCreateLink, useDeleteLink, useLinks, useUpdatePosition } from "@/lib/queries";
import type { NodeResponse } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { useCollection } from "./useCollection";

const MAP_COLORS: (string | null)[] = [null, "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#f87171"];

export default function MapView({
  children,
  parentId,
  untitled,
  tall,
}: {
  children: NodeResponse[];
  parentId: string;
  untitled: string;
  tall: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: links } = useLinks();
  const createLink = useCreateLink();
  const deleteLink = useDeleteLink();
  const updatePosition = useUpdatePosition();
  const { addRow, rename } = useCollection(parentId, untitled);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const childIds = useMemo(() => new Set(children.map((c) => c.id)), [children]);
  const selectedNode = children.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    setLabelDraft(selectedNode?.title ?? "");
  }, [selectedNode]);

  useEffect(() => {
    setRfNodes(
      children.map((node, index) => {
        const hasPos = node.mapX != null && node.mapY != null;
        const angle = (2 * Math.PI * index) / Math.max(children.length, 1);
        const radius = Math.max(140, children.length * 26);
        const position = hasPos
          ? { x: node.mapX as number, y: node.mapY as number }
          : { x: 300 + radius * Math.cos(angle), y: 220 + radius * Math.sin(angle) };
        return {
          id: node.id,
          position,
          data: { label: node.title || "—" },
          style: {
            borderRadius: 10,
            border: node.mapColor ? `1px solid ${node.mapColor}` : "1px solid #323644",
            background: node.mapColor ?? "#14161b",
            color: node.mapColor ? "#0b0c0f" : "#edeff3",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
          },
        };
      }),
    );
    setRfEdges(
      (links ?? [])
        .filter((l) => childIds.has(l.sourceId) && childIds.has(l.targetId))
        .map((l) => ({ id: l.id, source: l.sourceId, target: l.targetId, animated: true, style: { stroke: "#565d6d" } })),
    );
  }, [children, links, childIds, setRfNodes, setRfEdges]);

  const applyColor = (color: string | null) => {
    if (!selectedId) return;
    const rfNode = rfNodes.find((n) => n.id === selectedId);
    if (!rfNode) return;
    updatePosition.mutate({ id: selectedId, x: rfNode.position.x, y: rfNode.position.y, color });
  };

  const commitLabel = () => {
    if (selectedNode && labelDraft.trim() && labelDraft !== selectedNode.title) {
      rename.mutate({ node: selectedNode, title: labelDraft });
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-panel ${
        tall ? "h-[calc(100vh-260px)] min-h-[460px]" : "h-[460px]"
      }`}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <button
          onClick={() => addRow.mutate({})}
          disabled={addRow.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition hover:bg-accent2 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} /> {t("map.addNode")}
        </button>
        <span className="hidden rounded-lg bg-card/80 px-2.5 py-1.5 text-[11px] text-dim backdrop-blur md:inline">
          {t("map.hint")}
        </span>
      </div>

      {selectedNode && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-line bg-card/95 px-2.5 py-1.5 backdrop-blur">
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder={untitled}
            className="w-36 rounded-md border border-line2 bg-app px-2 py-1 text-xs text-ink outline-none focus:border-accent/60"
          />
          <span className="h-4 w-px bg-line2" />
          {MAP_COLORS.map((color) => (
            <button
              key={color ?? "none"}
              onClick={() => applyColor(color)}
              className="h-4 w-4 rounded-full border border-line2 transition hover:scale-110"
              style={{ background: color ?? "transparent" }}
              title={color ?? t("map.clearColor")}
            />
          ))}
        </div>
      )}

      {children.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="text-sm text-dim">{t("map.emptyCanvas")}</p>
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        colorMode="dark"
        deleteKeyCode={["Backspace", "Delete"]}
        onSelectionChange={({ nodes }) => setSelectedId(nodes[0]?.id ?? null)}
        onNodeDragStop={(_, node) => {
          const color = children.find((c) => c.id === node.id)?.mapColor ?? null;
          updatePosition.mutate({ id: node.id, x: node.position.x, y: node.position.y, color });
        }}
        onConnect={(c: Connection) => {
          if (c.source && c.target) createLink.mutate({ sourceId: c.source, targetId: c.target });
        }}
        onEdgesDelete={(deleted) => deleted.forEach((edge) => deleteLink.mutate(edge.id))}
        onNodeDoubleClick={(_, node) => navigate(`/nodes/${node.id}`)}
      >
        <Background color="#23262e" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
