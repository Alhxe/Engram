import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface SlashItem {
  key: string;
  title: string;
  icon: LucideIcon;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (editor: any, range: any) => void;
}

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

const SlashMenu = forwardRef<SlashMenuRef, Props>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        if (items[selected]) command(items[selected]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <div className="max-h-72 w-60 overflow-y-auto rounded-xl border border-line2 bg-elev p-1 shadow-2xl shadow-black/50">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onMouseDown={(e) => {
              e.preventDefault();
              command(item);
            }}
            onMouseEnter={() => setSelected(index)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
              index === selected ? "bg-accent/20 text-ink" : "text-mid hover:bg-card"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-card text-dim">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            {item.title}
          </button>
        );
      })}
    </div>
  );
});

SlashMenu.displayName = "SlashMenu";
export default SlashMenu;
