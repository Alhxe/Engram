import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, X } from "lucide-react";
import { api } from "@/lib/api";
import type { PropertyDto } from "@/lib/types";

function useRelationIndex() {
  return useQuery({
    queryKey: ["nodes", "relation-index"],
    queryFn: () => api.nodes.list({ size: 200 }),
    staleTime: 30_000,
  });
}

function RelationInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { data } = useRelationIndex();
  const pages = data?.content ?? [];
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-ink outline-none transition hover:border-line2 focus:border-accent/60 focus:bg-card"
    >
      <option value="">—</option>
      {pages.map((p) => (
        <option key={p.id} value={p.id}>{p.title || "—"}</option>
      ))}
    </select>
  );
}

function RelationDisplay({ value }: { value: string }) {
  const { data } = useRelationIndex();
  const page = (data?.content ?? []).find((p) => p.id === value);
  if (!page) return <span className="text-dim">—</span>;
  return (
    <Link to={`/nodes/${page.id}`} className="text-accent2 hover:underline">
      {page.title || "—"}
    </Link>
  );
}

const base =
  "rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-ink outline-none transition hover:border-line2 focus:border-accent/60 focus:bg-card";

function Rating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="text-dim transition hover:text-amber-400"
        >
          <Star
            className={`h-4 w-4 ${n <= value ? "text-amber-400" : ""}`}
            strokeWidth={1.75}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </span>
  );
}

function MultiSelect({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options?: string[] | null;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput("");
  };
  // Closed option set: render the allowed values as toggle chips.
  if (options && options.length > 0) {
    const toggle = (v: string) =>
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    return (
      <span className="flex flex-wrap items-center gap-1">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`rounded-full px-2 py-0.5 text-xs transition ${
                on ? "bg-accent/20 text-accent2" : "bg-elev text-dim hover:text-mid"
              }`}
            >
              {o}
            </button>
          );
        })}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {value.map((v) => (
        <span key={v} className="group flex items-center gap-1 rounded-full bg-elev px-2 py-0.5 text-xs text-mid">
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            className="text-dim opacity-0 transition group-hover:opacity-100 hover:text-red-400"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="+"
        className="w-16 bg-transparent px-1 py-0.5 text-xs text-ink outline-none placeholder:text-dim"
      />
    </span>
  );
}

export function PropertyValueInput({
  property,
  onChange,
  options,
}: {
  property: PropertyDto;
  onChange: (value: string | null) => void;
  options?: string[] | null;
}) {
  if (property.type === "SELECT" && options && options.length > 0) {
    return (
      <select className={`${base} min-w-[8rem]`} value={property.value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  switch (property.type) {
    case "NUMBER":
      return (
        <input type="number" className={`${base} w-28`} value={property.value ?? ""}
          onChange={(e) => onChange(e.target.value || null)} />
      );
    case "DATE":
      return (
        <input type="date" className={`${base} w-40 [color-scheme:dark]`} value={property.value ?? ""}
          onChange={(e) => onChange(e.target.value || null)} />
      );
    case "CHECKBOX":
      return (
        <input type="checkbox" className="ml-2 h-4 w-4 accent-[#6d7ef2]"
          checked={property.value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")} />
      );
    case "URL":
      return (
        <input type="url" className={`${base} min-w-[10rem]`} placeholder="https://…" value={property.value ?? ""}
          onChange={(e) => onChange(e.target.value || null)} />
      );
    case "EMAIL":
      return (
        <input type="email" className={`${base} min-w-[10rem]`} placeholder="name@example.com" value={property.value ?? ""}
          onChange={(e) => onChange(e.target.value || null)} />
      );
    case "RATING":
      return <Rating value={Number(property.value) || 0} onChange={(v) => onChange(v ? String(v) : null)} />;
    case "MULTISELECT":
      return (
        <MultiSelect
          value={property.value ? property.value.split(",").map((s) => s.trim()).filter(Boolean) : []}
          onChange={(v) => onChange(v.length ? v.join(", ") : null)}
          options={options}
        />
      );
    case "RELATION":
      return <RelationInput value={property.value} onChange={onChange} />;
    default:
      return (
        <input type="text" className={`${base} min-w-[8rem]`} value={property.value ?? ""}
          onChange={(e) => onChange(e.target.value || null)} />
      );
  }
}

export function PropertyValueDisplay({ property }: { property: PropertyDto | undefined }) {
  if (!property || property.value == null || property.value === "") {
    return <span className="text-dim">—</span>;
  }
  switch (property.type) {
    case "CHECKBOX":
      return <span className="text-mid">{property.value === "true" ? "✓" : "—"}</span>;
    case "SELECT":
      return <span className="rounded-md bg-elev px-1.5 py-0.5 text-xs text-mid">{property.value}</span>;
    case "URL":
      return (
        <a href={property.value} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
          {property.value.replace(/^https?:\/\//, "").slice(0, 40)}
        </a>
      );
    case "EMAIL":
      return <a href={`mailto:${property.value}`} className="text-accent2 hover:underline">{property.value}</a>;
    case "RATING": {
      const n = Number(property.value) || 0;
      return (
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "text-amber-400" : "text-line2"}`} strokeWidth={1.75} fill={i <= n ? "currentColor" : "none"} />
          ))}
        </span>
      );
    }
    case "MULTISELECT":
      return (
        <span className="flex flex-wrap gap-1">
          {property.value.split(",").map((s) => s.trim()).filter(Boolean).map((v) => (
            <span key={v} className="rounded-md bg-elev px-1.5 py-0.5 text-xs text-mid">{v}</span>
          ))}
        </span>
      );
    case "RELATION":
      return <RelationDisplay value={property.value} />;
    default:
      return <span className="text-mid">{property.value}</span>;
  }
}
