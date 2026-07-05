import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Columns3, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import type { PropertyType, SchemaField } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import InfoHint from "./InfoHint";

const TYPES: PropertyType[] = [
  "TEXT", "NUMBER", "DATE", "SELECT", "MULTISELECT", "CHECKBOX", "URL", "EMAIL", "RATING", "RELATION",
];

/** Defines the properties every child of a collection page should have. */
export default function SchemaEditor({ nodeId, schema }: { nodeId: string; schema: SchemaField[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("TEXT");
  const [options, setOptions] = useState("");
  const hasOptions = type === "SELECT" || type === "MULTISELECT";

  const save = useMutation({
    mutationFn: (fields: SchemaField[]) => api.nodes.setSchema(nodeId, fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["node", nodeId] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
    },
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || schema.some((f) => f.name === n)) return;
    const opts = hasOptions ? options.split(",").map((s) => s.trim()).filter(Boolean) : [];
    save.mutate([...schema, { name: n, type, options: opts.length ? opts : null }]);
    setName("");
    setType("TEXT");
    setOptions("");
  };

  const remove = (fieldName: string) => save.mutate(schema.filter((f) => f.name !== fieldName));

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-mid"
        >
          <Columns3 className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t("schema.columns")}
          {schema.length > 0 && <span className="rounded-full bg-elev px-1.5 text-[11px]">{schema.length}</span>}
        </button>
        <InfoHint text={t("help.schema")} />
      </div>

      {open && (
        <div className="fade-up mt-2 rounded-xl border border-line bg-card/60 p-3">
          <p className="mb-2 text-xs text-dim">{t("schema.hint")}</p>
          {schema.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {schema.map((f) => (
                <span key={f.name} className="group flex items-center gap-1 rounded-full border border-line2 bg-elev px-2 py-0.5 text-xs text-mid">
                  {f.name}
                  <span className="text-dim">· {t(`ptype.${f.type}`)}</span>
                  {f.options && f.options.length > 0 && (
                    <span className="text-dim">({f.options.length})</span>
                  )}
                  <button
                    onClick={() => remove(f.name)}
                    className="text-dim opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={add} className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("props.name")}
              className="w-40 rounded-md border border-line2 bg-card px-2 py-1 text-[13px] text-ink outline-none focus:border-accent/60"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PropertyType)}
              className="rounded-md border border-line2 bg-card px-2 py-1 text-[13px] text-mid outline-none"
            >
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>{t(`ptype.${ty}`)}</option>
              ))}
            </select>
            {hasOptions && (
              <input
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder={t("schema.options")}
                className="w-44 rounded-md border border-line2 bg-card px-2 py-1 text-[13px] text-ink outline-none focus:border-accent/60"
              />
            )}
            <button type="submit" className="flex items-center gap-1 text-[13px] font-medium text-accent2 hover:underline">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("common.add")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
