import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import MentionList, { type MentionItem, type MentionListRef } from "./MentionList";

export interface PageLinkOptions {
  /** Return the pages that match the current query (already filtered/sorted). */
  getItems: (query: string) => MentionItem[];
  /** Create a brand-new page with the given title and resolve to it. */
  createPage: (title: string) => Promise<{ id: string; title: string }>;
  /** Called after a link is inserted, with the target page id. */
  onLinked: (targetId: string) => void;
  labels: { empty: string; create: string };
}

/**
 * "@" mention that links to another page. Picking an existing page inserts a
 * chip; picking "create" spins up a new page first. Unlike the old [[wikilink]]
 * this resolves the target immediately, so backlinks are never guessed.
 */
export function createPageLink(options: PageLinkOptions) {
  // `marks: ""` stops inline marks (font size, bold, alignment styles…) from
  // wrapping the mention chip, so it always renders at its own fixed size.
  return Mention.extend({ marks: "" }).configure({
    HTMLAttributes: { class: "page-link" },
    renderLabel: ({ node }) => node.attrs.label ?? node.attrs.id,
    suggestion: {
      char: "@",
      items: ({ query }) => options.getItems(query),

      command: ({ editor, range, props }) => {
        const item = props as unknown as MentionItem;

        const insert = (id: string, label: string) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: "mention", attrs: { id, label } },
              { type: "text", text: " " },
            ])
            .run();
          options.onLinked(id);
        };

        if (item.isNew) {
          options
            .createPage(item.query ?? "")
            .then((node) => insert(node.id, node.title))
            .catch(() => {});
        } else if (item.id) {
          insert(item.id, item.title);
        }
      },

      render: () => {
        let component: ReactRenderer<MentionListRef> | null = null;
        let popup: HTMLDivElement | null = null;

        const place = (rect: DOMRect | null | undefined) => {
          if (!popup || !rect) return;
          const margin = 8;
          const width = popup.offsetWidth || 288;
          const left = Math.min(rect.left, window.innerWidth - width - margin);
          const below = rect.bottom + 6;
          const height = popup.offsetHeight || 0;
          const top = below + height > window.innerHeight - margin ? rect.top - height - 6 : below;
          popup.style.left = `${Math.max(margin, left)}px`;
          popup.style.top = `${Math.max(margin, top)}px`;
        };

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, {
              props: { ...props, labels: options.labels },
              editor: props.editor,
            });
            popup = document.createElement("div");
            popup.style.position = "fixed";
            popup.style.zIndex = "60";
            popup.appendChild(component.element);
            document.body.appendChild(popup);
            place(props.clientRect?.());
          },
          onUpdate: (props) => {
            component?.updateProps({ ...props, labels: options.labels });
            place(props.clientRect?.());
          },
          onKeyDown: (props) => {
            if (props.event.key === "Escape") {
              popup?.remove();
              return true;
            }
            return component?.ref?.onKeyDown(props.event) ?? false;
          },
          onExit: () => {
            popup?.remove();
            popup = null;
            component?.destroy();
            component = null;
          },
        };
      },
    } as Partial<SuggestionOptions>,
  });
}
