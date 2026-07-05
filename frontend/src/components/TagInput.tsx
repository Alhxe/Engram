import { useState } from "react";
import { Plus, X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/** Inline tag chips with a ghost "+ tag" affordance, no boxed input. */
export default function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const add = () => {
    const value = input.trim().replace(/,+$/, "").trim();
    if (value && !tags.includes(value)) {
      onChange([...tags, value]);
    }
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Escape") {
      setInput("");
      setEditing(false);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group flex items-center gap-1 rounded-full border border-line2 bg-elev py-0.5 pl-2 pr-1.5 text-xs text-mid"
        >
          <span className="text-accent2">#</span>
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== tag))}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-dim opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
            title="Remove"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </span>
      ))}
      {editing ? (
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add();
            setEditing(false);
          }}
          placeholder={placeholder}
          className="w-36 rounded-full bg-elev px-2.5 py-0.5 text-xs text-ink outline-none placeholder:text-dim"
        />
      ) : (
        <span className="reveal">
          <span className="reveal-inner">
            {tags.length === 0 ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-line2 px-2 py-0.5 text-xs text-dim transition hover:border-accent/50 hover:text-mid"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                {placeholder}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title={placeholder}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-line2 text-dim transition hover:border-accent/50 hover:text-mid"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </span>
        </span>
      )}
    </div>
  );
}
