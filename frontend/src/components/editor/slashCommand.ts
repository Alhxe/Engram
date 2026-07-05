import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import SlashMenu, { type SlashItem, type SlashMenuRef } from "./SlashMenu";

/**
 * "/" command menu for inserting blocks (headings, lists, table, image…).
 * More discoverable than the toolbar; the menu is filtered as you type.
 */
export function createSlashCommand(items: SlashItem[]) {
  return Extension.create({
    name: "slashCommand",

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          allowSpaces: false,
          startOfLine: false,
          pluginKey: new PluginKey("slashCommand"),

          command: ({ editor, range, props }) => (props as SlashItem).run(editor, range),

          items: ({ query }) => {
            const q = query.toLowerCase();
            return items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 10);
          },

          render: () => {
            let component: ReactRenderer<SlashMenuRef> | null = null;
            let popup: HTMLDivElement | null = null;

            const place = (rect: DOMRect | null | undefined) => {
              if (!popup || !rect) return;
              const margin = 8;
              const height = popup.offsetHeight || 0;
              const below = rect.bottom + 6;
              const top = below + height > window.innerHeight - margin ? rect.top - height - 6 : below;
              popup.style.left = `${Math.max(margin, rect.left)}px`;
              popup.style.top = `${Math.max(margin, top)}px`;
            };

            return {
              onStart: (props) => {
                component = new ReactRenderer(SlashMenu, { props, editor: props.editor });
                popup = document.createElement("div");
                popup.style.position = "fixed";
                popup.style.zIndex = "60";
                popup.appendChild(component.element);
                document.body.appendChild(popup);
                place(props.clientRect?.());
              },
              onUpdate: (props) => {
                component?.updateProps(props);
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
        }),
      ];
    },
  });
}
