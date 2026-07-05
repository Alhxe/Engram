import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wand2, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { PropertyType, SchemaField } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { Button, Input, Select } from "./ui";

// Types that a model can reliably produce from free text.
const FILL_TYPES: PropertyType[] = ["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX", "URL", "EMAIL"];

/**
 * "Fill with AI": pick a property and an instruction; the model reads every
 * sub-page and writes a value to that property on each. Universal — works on
 * any collection (extract an email, classify, one-line summary, …).
 */
export default function BulkFill({ parentId, schema }: { parentId: string; schema: SchemaField[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(schema[0]?.name ?? "");
  const [type, setType] = useState<PropertyType>(schema[0]?.type ?? "TEXT");
  const [instruction, setInstruction] = useState("");

  const fill = useMutation({
    mutationFn: () => api.ai.fill({ parentId, name: name.trim(), type, instruction: instruction.trim() }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["nodes"] });
      toast.success(t("fill.done").replace("{filled}", String(res.filled)).replace("{total}", String(res.total)));
      setOpen(false);
      setInstruction("");
    },
  });

  const pickName = (value: string) => {
    setName(value);
    const match = schema.find((f) => f.name === value);
    if (match) setType(match.type);
  };

  const canRun = name.trim().length > 0 && instruction.trim().length > 0 && !fill.isPending;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-mid"
      >
        <Wand2 className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("fill.button")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="fade-up w-full max-w-md rounded-2xl border border-line2 bg-panel p-5 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Wand2 className="h-4 w-4 text-accent2" strokeWidth={1.75} /> {t("fill.title")}
              </h3>
              <button onClick={() => setOpen(false)} className="text-dim transition hover:text-ink">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-dim">{t("fill.hint")}</p>

            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dim">
              {t("props.name")}
            </label>
            <div className="mb-3 flex gap-2">
              <Input
                list="fill-schema-names"
                value={name}
                onChange={(e) => pickName(e.target.value)}
                placeholder={t("fill.namePlaceholder")}
              />
              <datalist id="fill-schema-names">
                {schema.map((f) => (
                  <option key={f.name} value={f.name} />
                ))}
              </datalist>
              <Select value={type} onChange={(e) => setType(e.target.value as PropertyType)}>
                {FILL_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`ptype.${tp}`)}
                  </option>
                ))}
              </Select>
            </div>

            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dim">
              {t("fill.instruction")}
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={t("fill.instructionPlaceholder")}
              rows={3}
              className="mb-4 w-full resize-none rounded-lg border border-line2 bg-card px-3 py-2 text-sm text-ink outline-none transition placeholder:text-dim focus:border-accent/60"
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("common.close")}
              </Button>
              <Button onClick={() => fill.mutate()} disabled={!canRun}>
                <Wand2 className="h-4 w-4" strokeWidth={1.75} />
                {fill.isPending ? t("fill.working") : t("fill.run")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
