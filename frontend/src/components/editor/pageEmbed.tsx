import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { useNode } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";

/** Live read-only preview of another page, embedded inline. Content is fetched
 *  fresh (never copied), so the embed always reflects the source. */
function EmbedView({ node, updateAttributes, deleteNode, extension }: NodeViewProps) {
  const { t } = useI18n();
  const pageId: string | null = node.attrs.pageId ?? null;
  const currentId: string | undefined = extension.options.currentId;

  const [query, setQuery] = useState("");
  const { data: pages } = useQuery({
    queryKey: ["nodes", "mention-index"],
    queryFn: () => api.nodes.list({ size: 200 }),
  });
  const { data: page, isLoading } = useNode(pageId ?? undefined);

  // Picker: shown until a page is chosen.
  if (!pageId) {
    const q = query.trim().toLowerCase();
    const results = (pages?.content ?? [])
      .filter((p) => p.id !== currentId && (q ? (p.title || "").toLowerCase().includes(q) : true))
      .slice(0, 6);
    return (
      <NodeViewWrapper className="page-embed page-embed-picker" contentEditable={false}>
        <div className="page-embed-head">
          <Search className="h-3.5 w-3.5 text-dim" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("embed.placeholder")}
            className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-dim"
          />
          <button onClick={() => deleteNode()} className="text-dim transition hover:text-ink">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
        <div className="page-embed-results">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-dim">{t("embed.empty")}</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => updateAttributes({ pageId: p.id })}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-mid transition hover:bg-card hover:text-ink"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-dim" strokeWidth={1.75} />
                <span className="truncate">{p.title || t("common.untitled")}</span>
              </button>
            ))
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="page-embed" contentEditable={false}>
      <div className="page-embed-head">
        <FileText className="h-3.5 w-3.5 shrink-0 text-accent2" strokeWidth={1.75} />
        <Link to={`/nodes/${pageId}`} className="truncate text-[13px] font-medium text-ink hover:text-accent2">
          {page?.title || (isLoading ? t("common.loading") : t("embed.missing"))}
        </Link>
        <span className="flex-1" />
        <Link to={`/nodes/${pageId}`} className="text-dim transition hover:text-ink" title={t("embed.open")}>
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
        <button onClick={() => deleteNode()} className="text-dim transition hover:text-ink" title={t("embed.remove")}>
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      {page && (page.content ? (
        <div className="tiptap page-embed-body" dangerouslySetInnerHTML={{ __html: page.content }} />
      ) : (
        <p className="px-3 py-2 text-[13px] text-dim">{t("collection.empty")}</p>
      ))}
    </NodeViewWrapper>
  );
}

export interface PageEmbedOptions {
  currentId?: string;
}

export const PageEmbed = Node.create<PageEmbedOptions>({
  name: "pageEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { currentId: undefined };
  },

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-page-id") || null,
        renderHTML: (attributes) => (attributes.pageId ? { "data-page-id": attributes.pageId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-page-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-page-embed": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});
