import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
  type Node,
} from "@xyflow/react";

// Border intersection point of `node` on the line toward `other` (React Flow's
// canonical floating-edge maths). Lets edges connect edge-to-edge at any angle.
function intersection(node: InternalNode<Node>, other: InternalNode<Node>) {
  const w = (node.measured.width ?? 0) / 2;
  const h = (node.measured.height ?? 0) / 2;
  const cx = node.internals.positionAbsolute.x + w;
  const cy = node.internals.positionAbsolute.y + h;
  const ox = other.internals.positionAbsolute.x + (other.measured.width ?? 0) / 2;
  const oy = other.internals.positionAbsolute.y + (other.measured.height ?? 0) / 2;
  const xx = (ox - cx) / (2 * w) - (oy - cy) / (2 * h);
  const yy = (ox - cx) / (2 * w) + (oy - cy) / (2 * h);
  const a = 1 / (Math.abs(xx) + Math.abs(yy) || 1);
  return { x: w * (a * xx + a * yy) + cx, y: h * (-a * xx + a * yy) + cy };
}

interface EdgeData {
  labelColor?: string;
  labelBg?: string;
  labelBorder?: string;
  [key: string]: unknown;
}

/** An edge that attaches to node borders (not fixed handles), so radial graphs
 *  read cleanly. Carries an optional verb label styled via `data`. */
export default function FloatingEdge({ id, source, target, markerEnd, style, label, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const s = intersection(sourceNode, targetNode);
  const tgt = intersection(targetNode, sourceNode);
  const [path, labelX, labelY] = getStraightPath({
    sourceX: s.x, sourceY: s.y, targetX: tgt.x, targetY: tgt.y,
  });
  const d = (data ?? {}) as EdgeData;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: d.labelBg ?? "#14161b",
              border: `1px solid ${d.labelBorder ?? "#323644"}`,
              color: d.labelColor ?? "#edeff3",
              padding: "1px 5px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              whiteSpace: "nowrap",
              zIndex: 1000,
              pointerEvents: "none",
            }}
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
