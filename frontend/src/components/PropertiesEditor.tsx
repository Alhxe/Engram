import { useState } from "react";
import { AtSign, Calendar, CheckSquare, GitBranch, Hash, Link as LinkIcon, List, ListChecks, Plus, Star, Type, X } from "lucide-react";
import { useDeleteProperty, useNode, useUpsertProperty } from "@/lib/queries";
import type { NodeResponse, PropertyType } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { PropertyValueInput } from "./PropertyValue";

const TYPES: PropertyType[] = [
  "TEXT", "NUMBER", "DATE", "SELECT", "MULTISELECT", "CHECKBOX", "URL", "EMAIL", "RATING", "RELATION",
];

const TYPE_ICON: Record<PropertyType, typeof Type> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  SELECT: List,
  CHECKBOX: CheckSquare,
  URL: LinkIcon,
  EMAIL: AtSign,
  MULTISELECT: ListChecks,
  RATING: Star,
  RELATION: GitBranch,
};

export default function PropertiesEditor({ node }: { node: NodeResponse }) {
  const { t } = useI18n();
  const upsert = useUpsertProperty(node.id);
  const remove = useDeleteProperty(node.id);
  // Allowed SELECT options are declared on the parent's collection schema.
  const { data: parent } = useNode(node.parentId ?? undefined);
  const optionsFor = (name: string) => parent?.schema?.find((f) => f.name === name)?.options ?? null;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PropertyType>("TEXT");

  const addProperty = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    upsert.mutate({ name, type: newType, value: newType === "CHECKBOX" ? "false" : null });
    setNewName("");
    setAdding(false);
  };

  return (
    <div>
      {node.properties.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {node.properties.map((property) => {
            const Icon = TYPE_ICON[property.type];
            return (
              <div
                key={property.name}
                className="group grid grid-cols-[10rem_1fr_auto] items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition hover:bg-card"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-dim">
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{property.name}</span>
                </span>
                <PropertyValueInput
                  property={property}
                  options={optionsFor(property.name)}
                  onChange={(value) => upsert.mutate({ name: property.name, type: property.type, value })}
                />
                <button
                  className="text-dim opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                  onClick={() => remove.mutate(property.name)}
                  title={t("common.delete")}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {adding ? (
        <form onSubmit={addProperty} className="fade-up mt-2 flex items-center gap-2 px-1.5">
          <input
            className="w-40 rounded-md border border-line2 bg-card px-2 py-1 text-[13px] text-ink outline-none placeholder:text-dim focus:border-accent/60"
            placeholder={t("props.name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as PropertyType)}
            className="rounded-md border border-line2 bg-card px-2 py-1 text-[13px] text-mid outline-none"
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`ptype.${type}`)}
              </option>
            ))}
          </select>
          <button type="submit" className="text-[13px] font-medium text-accent2 hover:underline">
            {t("common.add")}
          </button>
        </form>
      ) : (
        <span className="reveal">
          <span className="reveal-inner">
            <button
              onClick={() => setAdding(true)}
              className="mt-1.5 flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-mid"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("props.add")}
            </button>
          </span>
        </span>
      )}
    </div>
  );
}
