import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "success" | "warn" | "danger" | "note";

/**
 * A highlighted block (info / warning / success / …) rendered as
 * <div class="callout" data-variant="…"><div class="callout-body">…</div></div>.
 * Inserted from the slash menu via `wrapIn("callout", { variant })`.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-variant") || "info",
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.callout" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "callout" }),
      ["div", { class: "callout-body" }, 0],
    ];
  },
});
