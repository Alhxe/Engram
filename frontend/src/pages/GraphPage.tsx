import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { Network } from "lucide-react";
import { useLinks, useNodes } from "@/lib/queries";
import { getTheme } from "@/lib/theme";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";
import FloatingEdge from "@/components/graph/FloatingEdge";

const edgeTypes = { floating: FloatingEdge };

const PALETTES = {
  dark: {
    nodeBg: "#14161b", nodeBorder: "#323644", nodeText: "#edeff3", dot: "#23262e",
    edge: "#565d6d", typed: "#93a0ff", mask: "rgba(11,12,15,0.7)",
  },
  light: {
    nodeBg: "#ffffff", nodeBorder: "#c2cad7", nodeText: "#14181f", dot: "#d3d9e2",
    edge: "#9aa2b0", typed: "#4f5fe0", mask: "rgba(232,234,239,0.7)",
  },
};

export default function GraphPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const theme = getTheme();
  const c = PALETTES[theme];
  const { data: nodesPage } = useNodes();
  const { data: links } = useLinks();

  const { flowNodes, flowEdges } = useMemo(() => {
    const items = nodesPage?.content ?? [];
    const radius = Math.max(220, items.length * 34);

    const flowNodes: Node[] = items.map((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(items.length, 1);
      return {
        id: node.id,
        position: { x: 400 + radius * Math.cos(angle), y: 320 + radius * Math.sin(angle) },
        data: { label: node.title || t("common.untitled") },
        style: {
          borderRadius: 10,
          border: `1px solid ${c.nodeBorder}`,
          background: c.nodeBg,
          color: c.nodeText,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
        },
      };
    });

    const flowEdges: Edge[] = (links ?? []).map((link) => {
      const typed = !!link.relType;
      return {
        id: link.id,
        source: link.sourceId,
        target: link.targetId,
        type: "floating",
        label: link.relType ?? undefined,
        markerEnd: typed ? { type: MarkerType.ArrowClosed, color: c.typed } : undefined,
        style: typed
          ? { stroke: c.typed, strokeWidth: 2 }
          : { stroke: c.edge, strokeWidth: 1.25, strokeDasharray: "4 4" },
        data: { labelColor: c.nodeText, labelBg: c.nodeBg, labelBorder: c.nodeBorder },
      };
    });

    return { flowNodes, flowEdges };
  }, [nodesPage, links, t, c]);

  if (nodesPage && nodesPage.content.length === 0) {
    return (
      <div className="p-10">
        <EmptyState>{t("graph.empty")}</EmptyState>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-panel">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2.5 rounded-xl border border-line bg-card/90 px-3.5 py-2 backdrop-blur">
        <Network className="h-4 w-4 text-accent2" strokeWidth={1.75} />
        <span className="text-sm font-semibold text-ink">{t("graph.title")}</span>
        {nodesPage && (
          <span className="text-xs text-dim">
            {nodesPage.totalElements} · {(links ?? []).length} {t("graph.links")}
          </span>
        )}
      </div>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.1}
        colorMode={theme}
        onNodeClick={(_, node) => navigate(`/nodes/${node.id}`)}
      >
        <Background color={c.dot} />
        <Controls />
        <MiniMap pannable zoomable nodeColor={c.nodeBorder} maskColor={c.mask} />
      </ReactFlow>
    </div>
  );
}
