import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { Network } from "lucide-react";
import { useGlobalGraph, useLinks } from "@/lib/queries";
import { getTheme } from "@/lib/theme";
import { useI18n } from "@/i18n/I18nContext";
import { EmptyState } from "@/components/ui";
import FloatingEdge from "@/components/graph/FloatingEdge";

const edgeTypes = { floating: FloatingEdge };

// Above this many pages, draw only the most connected ones (the rest are still
// reachable through search and each page's local graph). Keeps the page usable
// however large the base grows.
const RENDER_CAP = 1200;

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

// Estimate a node's rendered box from its label. ReactFlow can't measure at
// layout time, so the layout runs on these estimates and the node styles below
// render with the SAME numbers — that agreement is what prevents overlaps.
function boxSize(label: string, scale: number) {
  const charW = 7.3 * scale; // ~13px medium weight
  const lineH = 18 * scale;
  const maxTextW = 190 * scale; // wrap width
  const textLen = Math.max(label.length, 4) * charW;
  const lines = Math.ceil(textLen / maxTextW);
  return {
    w: Math.min(textLen, maxTextW) + 30 * scale,
    h: lines * lineH + 18 * scale,
  };
}

/**
 * Deterministic three-stage layout, aware of node box sizes:
 *  1. Radial tree seed — the page tree is where most structure lives, so each
 *     root gets an angular sector (proportional to subtree size) and children
 *     fan out ring by ring. Near-final placement in O(n).
 *  2. Force relaxation — spatial-hash repulsion (O(n·k), scales to thousands)
 *     plus springs along edges pull linked pages together without collapsing.
 *  3. Overlap removal — iterative box-collision passes guarantee no two labels
 *     end up on top of each other, whatever stages 1–2 produced.
 */
function computeLayout(
  n: number,
  parents: Int32Array,
  edges: Array<[number, number]>,
  halfW: Float64Array,
  halfH: Float64Array,
) {
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  if (n === 0) return { x, y };

  // ---- 1. radial tree seed ----
  const children: number[][] = Array.from({ length: n }, () => []);
  const roots: number[] = [];
  for (let i = 0; i < n; i++) {
    if (parents[i] >= 0) children[parents[i]].push(i);
    else roots.push(i);
  }
  const weight = new Float64Array(n);
  {
    // post-order (iterative — page trees are shallow, but never trust a stack)
    const order: number[] = [];
    const stack = [...roots];
    const seen = new Uint8Array(n);
    while (stack.length) {
      const v = stack.pop()!;
      if (seen[v]) continue;
      seen[v] = 1;
      order.push(v);
      for (const k of children[v]) if (!seen[k]) stack.push(k);
    }
    for (let i = order.length - 1; i >= 0; i--) {
      const v = order[i];
      let sum = 0;
      for (const k of children[v]) sum += weight[k];
      weight[v] = Math.max(1, sum);
    }
  }
  {
    const RING = 300;
    const total = roots.reduce((s, r) => s + weight[r], 0) || 1;
    const seen = new Uint8Array(n);
    const stack: Array<{ v: number; depth: number; a0: number; a1: number }> = [];
    let acc = -Math.PI;
    for (const r of roots) {
      const span = (2 * Math.PI * weight[r]) / total;
      stack.push({ v: r, depth: 1, a0: acc, a1: acc + span });
      acc += span;
    }
    while (stack.length) {
      const { v, depth, a0, a1 } = stack.pop()!;
      if (seen[v]) continue;
      seen[v] = 1;
      const a = (a0 + a1) / 2;
      x[v] = depth * RING * Math.cos(a);
      y[v] = depth * RING * Math.sin(a);
      const kidsW = children[v].reduce((s, k) => s + weight[k], 0) || 1;
      let accKid = a0;
      for (const k of children[v]) {
        const span = ((a1 - a0) * weight[k]) / kidsW;
        stack.push({ v: k, depth: depth + 1, a0: accKid, a1: accKid + span });
        accKid += span;
      }
    }
  }

  // ---- 2. force relaxation with spatial hashing ----
  const radius = new Float64Array(n);
  for (let i = 0; i < n; i++) radius[i] = Math.hypot(halfW[i], halfH[i]);
  const CUTOFF = 460;
  const HASH = 100003;
  const iterations = n > 900 ? 60 : n > 300 ? 120 : 220;
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const cellOf = (v: number) => Math.floor(v / CUTOFF);

  for (let it = 0; it < iterations; it++) {
    const cool = 1 - it / iterations;
    fx.fill(0);
    fy.fill(0);

    const grid = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const key = cellOf(x[i]) * HASH + cellOf(y[i]);
      const bucket = grid.get(key);
      if (bucket) bucket.push(i);
      else grid.set(key, [i]);
    }

    // repulsion, only within the cutoff neighborhood
    for (let i = 0; i < n; i++) {
      const cx = cellOf(x[i]);
      const cy = cellOf(y[i]);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const bucket = grid.get(gx * HASH + gy);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j <= i) continue;
            let dx = x[i] - x[j];
            let dy = y[i] - y[j];
            let d2 = dx * dx + dy * dy;
            if (d2 < 0.01) {
              // coincident nodes: deterministic nudge apart
              dx = (((i * 37 + j * 11) % 7) - 3) || 1;
              dy = (((i * 53 + j * 17) % 7) - 3) || 1;
              d2 = dx * dx + dy * dy;
            }
            const d = Math.sqrt(d2);
            if (d > CUTOFF) continue;
            const want = radius[i] + radius[j] + 36;
            const f = ((want * want) / d2) * 2.2;
            const ux = dx / d;
            const uy = dy / d;
            fx[i] += ux * f; fy[i] += uy * f;
            fx[j] -= ux * f; fy[j] -= uy * f;
          }
        }
      }
    }

    // springs along edges, rest length respects both boxes
    for (const [s, t] of edges) {
      const dx = x[t] - x[s];
      const dy = y[t] - y[s];
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const rest = radius[s] + radius[t] + 80;
      const f = (d - rest) * 0.025;
      const ux = dx / d;
      const uy = dy / d;
      fx[s] += ux * f; fy[s] += uy * f;
      fx[t] -= ux * f; fy[t] -= uy * f;
    }

    // mild centring + integrate with cooling and a step cap
    const MAX_MOVE = 48;
    for (let i = 0; i < n; i++) {
      fx[i] -= x[i] * 0.004;
      fy[i] -= y[i] * 0.004;
      let mx = fx[i] * 0.9 * cool;
      let my = fy[i] * 0.9 * cool;
      mx = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, mx));
      my = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, my));
      x[i] += mx;
      y[i] += my;
    }
  }

  // ---- 3. overlap removal: nothing may cover a label ----
  const MARGIN = 14;
  let cell = 0;
  for (let i = 0; i < n; i++) cell = Math.max(cell, halfW[i] * 2 + MARGIN);
  cell = Math.max(cell, 120);
  const cellOf2 = (v: number) => Math.floor(v / cell);

  for (let pass = 0; pass < 48; pass++) {
    let moved = false;
    const grid = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const key = cellOf2(x[i]) * HASH + cellOf2(y[i]);
      const bucket = grid.get(key);
      if (bucket) bucket.push(i);
      else grid.set(key, [i]);
    }
    for (let i = 0; i < n; i++) {
      const cx = cellOf2(x[i]);
      const cy = cellOf2(y[i]);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const bucket = grid.get(gx * HASH + gy);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j <= i) continue;
            let dx = x[i] - x[j];
            let dy = y[i] - y[j];
            const ox = halfW[i] + halfW[j] + MARGIN - Math.abs(dx);
            const oy = halfH[i] + halfH[j] + MARGIN - Math.abs(dy);
            if (ox <= 0 || oy <= 0) continue;
            moved = true;
            if (dx === 0 && dy === 0) { dx = (i % 2) * 2 - 1; dy = 1; }
            if (ox < oy) {
              const push = (ox / 2) * (dx >= 0 ? 1 : -1);
              x[i] += push;
              x[j] -= push;
            } else {
              const push = (oy / 2) * (dy >= 0 ? 1 : -1);
              y[i] += push;
              y[j] -= push;
            }
          }
        }
      }
    }
    if (!moved) break;
  }

  return { x, y };
}

export default function GraphPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const theme = getTheme();
  const c = PALETTES[theme];
  const { data: allItems } = useGlobalGraph();
  const { data: links } = useLinks();

  const { flowNodes, flowEdges, total, kept } = useMemo(() => {
    const all = allItems ?? [];
    const allIds = new Set(all.map((n) => n.id));

    // degree over the FULL base (links + tree), used for sizing and for
    // choosing what to keep when the base is too big to draw whole
    const degree = new Map<string, number>();
    const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);
    const linkList = (links ?? []).filter((l) => allIds.has(l.sourceId) && allIds.has(l.targetId));
    for (const l of linkList) {
      bump(l.sourceId);
      bump(l.targetId);
    }
    for (const item of all) {
      if (item.parentId && allIds.has(item.parentId)) {
        bump(item.parentId);
        bump(item.id);
      }
    }

    // cap what we draw, most-connected first (stable order for determinism)
    let items = all;
    if (all.length > RENDER_CAP) {
      items = [...all]
        .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id))
        .slice(0, RENDER_CAP);
    }
    const idSet = new Set(items.map((n) => n.id));
    const indexOf = new Map(items.map((item, i) => [item.id, i] as const));
    const n = items.length;

    const visibleLinks = linkList.filter((l) => idSet.has(l.sourceId) && idSet.has(l.targetId));
    const parents = new Int32Array(n).fill(-1);
    const hasChildren = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const p = items[i].parentId;
      if (p && idSet.has(p)) {
        parents[i] = indexOf.get(p)!;
        hasChildren[indexOf.get(p)!] = 1;
      }
    }

    const layoutEdges: Array<[number, number]> = [];
    for (const l of visibleLinks) layoutEdges.push([indexOf.get(l.sourceId)!, indexOf.get(l.targetId)!]);
    for (let i = 0; i < n; i++) if (parents[i] >= 0) layoutEdges.push([parents[i], i]);

    // box estimates drive the layout AND the rendered styles (same numbers)
    const halfW = new Float64Array(n);
    const halfH = new Float64Array(n);
    const scales = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const deg = degree.get(items[i].id) ?? 0;
      const scale = 1 + Math.min(deg, 10) * 0.05; // hubs render bigger
      scales[i] = scale;
      const box = boxSize(items[i].title || t("common.untitled"), scale);
      halfW[i] = box.w / 2;
      halfH[i] = box.h / 2;
    }

    const { x, y } = computeLayout(n, parents, layoutEdges, halfW, halfH);

    const flowNodes: Node[] = items.map((item, i) => {
      const deg = degree.get(item.id) ?? 0;
      return {
        id: item.id,
        position: { x: x[i] - halfW[i], y: y[i] - halfH[i] },
        data: { label: item.title || t("common.untitled") },
        style: {
          width: halfW[i] * 2,
          borderRadius: 10,
          border: `1px solid ${hasChildren[i] ? c.typed : c.nodeBorder}`,
          background: c.nodeBg,
          color: c.nodeText,
          padding: `${8 * scales[i]}px ${14 * scales[i]}px`,
          fontSize: 13 * scales[i],
          lineHeight: `${18 * scales[i]}px`,
          fontWeight: 500,
          textAlign: "center" as const,
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          opacity: deg === 0 ? 0.4 : 1,
        },
      };
    });

    // parent→child: thin, subtle — the skeleton the tree hangs on
    const parentEdges: Edge[] = items
      .filter((item) => item.parentId && idSet.has(item.parentId))
      .map((item) => ({
        id: `pc-${item.id}`,
        source: item.parentId!,
        target: item.id,
        type: "floating",
        style: { stroke: c.parent, strokeWidth: 1 },
        data: { labelColor: c.nodeText, labelBg: c.nodeBg, labelBorder: c.nodeBorder },
      }));

    // explicit links: dashed for plain, accented + arrow for typed relations
    const linkEdges: Edge[] = visibleLinks.map((link) => {
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
    return {
      flowNodes,
      flowEdges: [...parentEdges, ...linkEdges],
      total: all.length,
      kept: n,
    };
  }, [allItems, links, t, c]);

  if (allItems && allItems.length === 0) {
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
        {allItems && (
          <span className="text-xs text-dim">
            {kept < total ? `${kept} / ${total} · ${t("graph.capped")}` : `${total}`} · {flowEdges.length}{" "}
            {t("graph.links")}
          </span>
        )}
      </div>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.05}
        colorMode={theme}
        onlyRenderVisibleElements
        onNodeClick={(_, node) => navigate(`/nodes/${node.id}`)}
      >
        <Background color={c.dot} />
        <Controls />
        <MiniMap pannable zoomable nodeColor={c.nodeBorder} maskColor={c.mask} />
      </ReactFlow>
    </div>
  );
}
