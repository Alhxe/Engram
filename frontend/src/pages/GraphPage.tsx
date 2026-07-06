import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { Network } from "lucide-react";
import { useAllNodes, useLinks } from "@/lib/queries";
import { getTheme } from "@/lib/theme";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";
import FloatingEdge from "@/components/graph/FloatingEdge";

const edgeTypes = { floating: FloatingEdge };

const PALETTES = {
  dark: {
    nodeBg: "#14161b", nodeBorder: "#323644", nodeText: "#edeff3", dot: "#23262e",
    edge: "#565d6d", typed: "#93a0ff", parent: "#3a3f4d", mask: "rgba(11,12,15,0.7)",
  },
  light: {
    nodeBg: "#ffffff", nodeBorder: "#c2cad7", nodeText: "#14181f", dot: "#d3d9e2",
    edge: "#9aa2b0", typed: "#4f5fe0", parent: "#c7cedb", mask: "rgba(232,234,239,0.7)",
  },
};

// Lightweight, deterministic force-directed layout (no external deps).
// Seeds nodes on a circle, then relaxes: nodes repel each other, edges act as
// springs, and a mild pull keeps the whole thing centred. Connected nodes cluster;
// orphans drift to the edge. Deterministic (no randomness) so the layout is stable.
function forceLayout(ids: string[], edges: Array<[number, number]>) {
  const n = ids.length;
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  const seedR = Math.max(200, n * 12);
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / Math.max(n, 1);
    px[i] = seedR * Math.cos(a);
    py[i] = seedR * Math.sin(a);
  }

  const iterations = n > 250 ? 120 : 320;
  const REST = 130, SPRING = 0.02, REPULSE = 9000, CENTER = 0.012, STEP = 0.85, MAX_MOVE = 60;
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);

  for (let it = 0; it < iterations; it++) {
    const cool = 1 - it / iterations;
    fx.fill(0);
    fy.fill(0);

    // repulsion between every pair (O(n²) — fine for a personal base)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = px[i] - px[j];
        let dy = py[i] - py[j];
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = 1; dy = 1; d2 = 2; }
        const d = Math.sqrt(d2);
        const f = REPULSE / d2;
        const ux = dx / d, uy = dy / d;
        fx[i] += ux * f; fy[i] += uy * f;
        fx[j] -= ux * f; fy[j] -= uy * f;
      }
    }

    // springs along edges
    for (const [s, t] of edges) {
      const dx = px[t] - px[s];
      const dy = py[t] - py[s];
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (d - REST) * SPRING;
      const ux = dx / d, uy = dy / d;
      fx[s] += ux * f; fy[s] += uy * f;
      fx[t] -= ux * f; fy[t] -= uy * f;
    }

    // centring + integrate (with cooling and a per-step cap)
    for (let i = 0; i < n; i++) {
      fx[i] -= px[i] * CENTER;
      fy[i] -= py[i] * CENTER;
      let mx = fx[i] * STEP * cool;
      let my = fy[i] * STEP * cool;
      mx = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, mx));
      my = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, my));
      px[i] += mx; py[i] += my;
    }
  }

  const pos = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < n; i++) pos.set(ids[i], { x: px[i] + 400, y: py[i] + 320 });
  return pos;
}

export default function GraphPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const theme = getTheme();
  const c = PALETTES[theme];
  const { data: nodesPage } = useAllNodes();
  const { data: links } = useLinks();

  const { flowNodes, flowEdges } = useMemo(() => {
    const items = nodesPage?.content ?? [];
    const ids = items.map((n) => n.id);
    const idSet = new Set(ids);
    const indexOf = new Map(ids.map((id, i) => [id, i] as const));

    // Build the edge set that drives BOTH the layout and the render:
    // explicit links + parent→child (the tree). The tree is where most of the
    // structure lives, so drawing it is what makes the graph feel connected.
    const layoutEdges: Array<[number, number]> = [];
    const degree = new Map<string, number>();
    const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);

    const linkList = (links ?? []).filter((l) => idSet.has(l.sourceId) && idSet.has(l.targetId));
    for (const l of linkList) {
      layoutEdges.push([indexOf.get(l.sourceId)!, indexOf.get(l.targetId)!]);
      bump(l.sourceId); bump(l.targetId);
    }
    for (const node of items) {
      if (node.parentId && idSet.has(node.parentId)) {
        layoutEdges.push([indexOf.get(node.parentId)!, indexOf.get(node.id)!]);
        bump(node.parentId); bump(node.id);
      }
    }

    const pos = forceLayout(ids, layoutEdges);

    const flowNodes: Node[] = items.map((node) => {
      const deg = degree.get(node.id) ?? 0;
      const scale = 1 + Math.min(deg, 10) * 0.05; // hubs render bigger
      const orphan = deg === 0;
      return {
        id: node.id,
        position: pos.get(node.id) ?? { x: 0, y: 0 },
        data: { label: node.title || t("common.untitled") },
        style: {
          borderRadius: 10,
          border: `1px solid ${node.hasChildren ? c.typed : c.nodeBorder}`,
          background: c.nodeBg,
          color: c.nodeText,
          padding: `${8 * scale}px ${14 * scale}px`,
          fontSize: 13 * scale,
          fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          opacity: orphan ? 0.4 : 1,
        },
      };
    });

    // parent→child: thin, subtle — the skeleton the tree hangs on
    const parentEdges: Edge[] = items
      .filter((node) => node.parentId && idSet.has(node.parentId))
      .map((node) => ({
        id: `pc-${node.id}`,
        source: node.parentId!,
        target: node.id,
        type: "floating",
        style: { stroke: c.parent, strokeWidth: 1 },
        data: { labelColor: c.nodeText, labelBg: c.nodeBg, labelBorder: c.nodeBorder },
      }));

    // explicit links: dashed for plain, accented + arrow for typed relations
    const linkEdges: Edge[] = linkList.map((link) => {
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

    // parent edges under the links so typed relations stay legible on top
    return { flowNodes, flowEdges: [...parentEdges, ...linkEdges] };
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
            {nodesPage.totalElements} · {flowEdges.length} {t("graph.links")}
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
