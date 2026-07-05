import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Undo2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useDeleteProperty, useUpsertProperty } from "@/lib/queries";
import type { PropertyDto } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";

// Grace period after the user LEAVES the editor before the AI runs. Long enough
// that an accidental click-away (then coming back) doesn't trigger it.
const GRACE_MS = 8000;
const MIN_CHARS = 40;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Autonomously suggests + applies tags/properties a few seconds after the user
 * stops editing. Everything it adds is shown with an Undo, so it is never a
 * surprise you can't take back.
 */
export default function AiAutoSuggest({
  nodeId,
  title,
  content,
  tags,
  properties,
  editing,
  onSetTags,
}: {
  nodeId: string;
  title: string;
  content: string;
  tags: string[];
  properties: PropertyDto[];
  editing: boolean;
  onSetTags: (tags: string[]) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const upsert = useUpsertProperty(nodeId);
  const removeProp = useDeleteProperty(nodeId);

  const { data: settings } = useQuery({ queryKey: ["ai", "settings"], queryFn: () => api.ai.settings() });
  const connected = settings?.providers.some((p) => p.connected) ?? false;

  const [applied, setApplied] = useState<{ tags: string[]; props: string[] } | null>(null);

  // Live refs so the delayed job reads current state without re-triggering.
  const tagsRef = useRef(tags);
  tagsRef.current = tags;
  const propNamesRef = useRef(properties.map((p) => p.name));
  propNamesRef.current = properties.map((p) => p.name);
  const onSetTagsRef = useRef(onSetTags);
  onSetTagsRef.current = onSetTags;
  const contentRef = useRef(content);
  contentRef.current = content;
  const titleRef = useRef(title);
  titleRef.current = title;
  const lastHashRef = useRef("");
  const runningRef = useRef(false);

  useEffect(() => {
    // Only after the user has LEFT the editor. Refocusing cancels the timer.
    if (!connected || editing) return;
    const text = stripHtml(contentRef.current);
    if (text.length < MIN_CHARS) return;
    const hash = `${titleRef.current}\n${text}`;
    if (hash === lastHashRef.current) return;

    const timer = setTimeout(async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastHashRef.current = hash;
      try {
        const res = await api.ai.suggest(nodeId);
        const currentTags = tagsRef.current;
        const newTags = res.tags
          .map((s) => s.name)
          .filter((n, i, arr) => arr.indexOf(n) === i && !currentTags.includes(n));
        const currentProps = propNamesRef.current;
        const newProps = res.properties.filter((s) => !currentProps.includes(s.name));

        if (newTags.length) onSetTagsRef.current([...currentTags, ...newTags]);
        for (const p of newProps) upsert.mutate({ name: p.name, type: p.type, value: p.value });

        if (newTags.length || newProps.length) {
          setApplied({ tags: newTags, props: newProps.map((p) => p.name) });
        }
      } catch {
        // Not configured / provider error: stay silent — this is a background nicety.
      } finally {
        runningRef.current = false;
      }
    }, GRACE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, connected, nodeId]);

  if (!applied || (applied.tags.length === 0 && applied.props.length === 0)) return null;

  const undo = () => {
    onSetTagsRef.current(tagsRef.current.filter((x) => !applied.tags.includes(x)));
    applied.props.forEach((name) => removeProp.mutate(name));
    qc.invalidateQueries({ queryKey: ["node", nodeId] });
    setApplied(null);
  };

  const parts: string[] = [];
  if (applied.tags.length) parts.push(`${applied.tags.length} ${t("aiauto.tags")}`);
  if (applied.props.length) parts.push(`${applied.props.length} ${t("aiauto.props")}`);

  return (
    <div className="fade-up mt-2 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[13px]">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent2" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 text-mid">
        {t("aiauto.added")} <span className="text-ink">{parts.join(" · ")}</span>
        {applied.tags.length > 0 && (
          <span className="ml-1 text-dim">({applied.tags.map((x) => `#${x}`).join(" ")})</span>
        )}
      </span>
      <button onClick={undo} className="flex items-center gap-1 text-dim transition hover:text-ink" title={t("aiauto.undo")}>
        <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("aiauto.undo")}
      </button>
      <button onClick={() => setApplied(null)} className="text-dim transition hover:text-ink" title={t("common.close")}>
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
