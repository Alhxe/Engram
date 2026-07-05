import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { CornerDownLeft, FileText, Plus } from "lucide-react";

export interface MentionItem {
  id?: string;
  title: string;
  isNew?: boolean;
  query?: string;
}

export interface MentionListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
  items: MentionItem[];
  command: (item: MentionItem) => void;
  labels: { empty: string; create: string };
}

/** Keyboard-navigable page picker shown while typing "@" in the editor. */
const MentionList = forwardRef<MentionListRef, Props>(({ items, command, labels }, ref) => {
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

  if (items.length === 0) {
    return (
      <div className="w-64 rounded-xl border border-line2 bg-elev p-3 text-[13px] text-dim shadow-2xl shadow-black/50">
        {labels.empty}
      </div>
    );
  }

  return (
    <div className="max-h-72 w-72 overflow-y-auto rounded-xl border border-line2 bg-elev p-1 shadow-2xl shadow-black/50">
      {items.map((item, index) => (
        <button
          key={item.id ?? `new-${item.query}`}
          onMouseDown={(e) => {
            e.preventDefault();
            command(item);
          }}
          onMouseEnter={() => setSelected(index)}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
            index === selected ? "bg-accent/20 text-ink" : "text-mid hover:bg-card"
          }`}
        >
          {item.isNew ? (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/20 text-accent2">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {labels.create} <span className="font-medium text-ink">“{item.query}”</span>
              </span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.title}</span>
            </>
          )}
          {index === selected && (
            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-dim" strokeWidth={2} />
          )}
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = "MentionList";
export default MentionList;
