import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Background, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { api } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import { useI18n } from "@/i18n/I18nContext";
import FloatingEdge from "./graph/FloatingEdge";

const edgeTypes = { floating: FloatingEdge };

// Two palettes so the graph matches the app theme (React Flow is otherwise fixed).
const PALETTES = {
  dark: {
    nodeBg: "#14161b", nodeBorder: "#323644", nodeText: "#edeff3",
    centerBg: "#6d7ef2", centerText: "#0b0c0f", dot: "#23262e",
    edge: "#565d6d", typed: "#93a0ff",
  },
  light: {
    nodeBg: "#ffffff", nodeBorder: "#c2cad7", nodeText: "#14181f",
    centerBg: "#4f5fe0", centerText: "#ffffff", dot: "#d3d9e2",
    edge: "#9aa2b0", typed: "#4f5fe0",
  },
};

/** A page's one-hop connection graph. Typed links (with a verb) are emphasized —
 *  solid, coloured, labelled and arrowed — over plain links (faint dashed). */
export default function LocalGraph({ nodeId }: { nodeId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const theme = getTheme();
  const c = PALETTES[theme];

  const { data } = useQuery({
    queryKey: ["localGraph", nodeId],
    queryFn: () => api.nodes.localGraph(nodeId),
  });

  const { flowNodes, flowEdges } = useMemo(() => {
    const items = data?.nodes ?? [];
    const neighbors = items.filter((n) => !n.center);
    const flowNodes: Node[] = items.map((n) => {
      let position = { x: 300, y: 170 };
      if (!n.center) {
        const idx = neighbors.indexOf(n);
        const angle = (2 * Math.PI * idx) / Math.max(neighbors.length, 1);
        const radius = Math.max(250, neighbors.length * 38);
        position = { x: 300 + radius * Math.cos(angle), y: 170 + radius * Math.sin(angle) };
      }
      return {
        id: n.id,
        position,
        data: { label: n.title || "—" },
        style: {
          borderRadius: 10,
          border: `1px solid ${n.center ? c.centerBg : c.nodeBorder}`,
          background: n.center ? c.centerBg : c.nodeBg,
          color: n.center ? c.centerText : c.nodeText,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: n.center ? 600 : 500,
          maxWidth: 180,
        },
      };
    });
    const flowEdges: Edge[] = (data?.edges ?? []).map((e, i) => {
      const typed = !!e.relType;
      return {
        id: `${e.sourceId}-${e.targetId}-${i}`,
        source: e.sourceId,
        target: e.targetId,
        type: "floating",
        label: e.relType ?? undefined,
        markerEnd: typed ? { type: MarkerType.ArrowClosed, color: c.typed } : undefined,
        style: typed
          ? { stroke: c.typed, strokeWidth: 2 }
          : { stroke: c.edge, strokeWidth: 1.25, strokeDasharray: "4 4" },
        data: { labelColor: c.nodeText, labelBg: c.nodeBg, labelBorder: c.nodeBorder },
      };
    });
    return { flowNodes, flowEdges };
  }, [data, c]);

  if (data && data.nodes.length <= 1) {
    return <p className="text-sm text-dim">{t("graph.noConnections")}</p>;
  }

  return (
    <div className="h-[300px] overflow-hidden rounded-xl border border-line bg-panel">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 0.9 }}
        minZoom={0.2}
        colorMode={theme}
        nodesDraggable={false}
        onNodeClick={(_, node) => navigate(`/nodes/${node.id}`)}
      >
        <Background color={c.dot} />
      </ReactFlow>
    </div>
  );
}
