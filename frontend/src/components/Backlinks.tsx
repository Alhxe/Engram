import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BacklinkResponse } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";

/** A themed combobox for a link's relationship verb: type freely, or pick a
 *  localized suggestion. Native <datalist> was unstyled/dark, so this is custom. */
function VerbInput({
  value,
  verbs,
  placeholder,
  onCommit,
}: {
  value: string | null;
  verbs: string[];
  placeholder: string;
  onCommit: (v: string | null) => void;
}) {
  const [text, setText] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const q = text.trim().toLowerCase();
  const matches = verbs.filter((v) => v.toLowerCase().includes(q));

  const commit = (v: string) => {
    const next = v.trim();
    if (next !== (value ?? "")) onCommit(next || null);
  };

  return (
    <span className="relative">
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); commit(text); }}
        className="w-32 rounded-md border border-line2 bg-card px-2 py-0.5 text-[11px] text-mid outline-none focus:border-accent/60"
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-lg border border-line2 bg-elev p-1 shadow-xl shadow-black/30">
          {matches.map((v) => (
            <button
              key={v}
              onMouseDown={(e) => { e.preventDefault(); setText(v); commit(v); setOpen(false); }}
              className="block w-full truncate rounded px-2 py-1 text-left text-[12px] text-mid transition hover:bg-card hover:text-ink"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/** Inbound links, each with an editable relationship verb (typed links). */
export default function Backlinks({ nodeId, backlinks }: { nodeId: string; backlinks: BacklinkResponse[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const verbs = t("rel.verbs").split(",").map((s) => s.trim()).filter(Boolean);

  const setType = useMutation({
    mutationFn: ({ linkId, relType }: { linkId: string; relType: string | null }) =>
      api.links.setType(linkId, relType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backlinks", nodeId] }),
  });

  if (backlinks.length === 0) {
    return <p className="text-sm text-dim">{t("node.noBacklinks")}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {backlinks.map((link) => (
        <li key={link.linkId} className="flex flex-wrap items-center gap-2">
          <Link to={`/nodes/${link.nodeId}`} className="text-sm text-accent2 transition hover:underline">
            {link.title || t("common.untitled")}
          </Link>
          <VerbInput
            value={link.relType}
            verbs={verbs}
            placeholder={t("rel.verb")}
            onCommit={(relType) => setType.mutate({ linkId: link.linkId, relType })}
          />
        </li>
      ))}
    </ul>
  );
}
