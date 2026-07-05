import { useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

/**
 * Image with Word-style drag-to-resize handles and left/center/right alignment.
 * Width is stored in px on the node; alignment on a data attribute.
 */
export default function ImageComponent({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, title, width, align } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: string | null;
    align?: string;
  };
  const imgRef = useRef<HTMLImageElement>(null);

  const startResize = (side: "left" | "right") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = imgRef.current?.offsetWidth ?? 0;
    const onMove = (ev: PointerEvent) => {
      const delta = side === "right" ? ev.clientX - startX : startX - ev.clientX;
      const next = Math.max(60, startWidth + delta);
      updateAttributes({ width: `${Math.round(next)}px` });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <NodeViewWrapper className="editor-image-wrap" style={{ display: "flex", justifyContent: justify }}>
      <div
        className={`image-frame ${selected ? "is-selected" : ""}`}
        style={{ width: width ?? "auto", maxWidth: "100%" }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ""}
          title={title ?? undefined}
          className="editor-image"
          draggable={false}
        />
        {editor.isEditable && (
          <>
            <span className="image-handle image-handle-l" onPointerDown={startResize("left")} />
            <span className="image-handle image-handle-r" onPointerDown={startResize("right")} />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
