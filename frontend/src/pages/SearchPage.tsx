import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Hash, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import type { NodeKind, SearchHit } from "@/lib/types";
import { EmptyState, KindBadge } from "@/components/ui";

const KINDS: NodeKind[] = ["NOTE", "MINDMAP_BRANCH", "SNIPPET", "BOOKMARK"];

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function MatchBadges({ hit }: { hit: SearchHit }) {
  const { t } = useI18n();
  const reasons: string[] = [];
  if (hit.titleMatch) reasons.push(t("search.inTitle"));
  if (hit.snippet) reasons.push(t("search.inContent"));
  if (hit.tagMatch) reasons.push(t("search.inTag"));
  if (hit.propertyMatch) reasons.push(t("search.inProperty"));
  if (reasons.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {reasons.map((r) => (
        <span key={r} className="rounded bg-elev px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-dim">
          {r}
        </span>
      ))}
    </span>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { t } = useI18n();

  const [input, setInput] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const query = useDebounced(input.trim(), 250);

  // Keep the URL's ?q= in sync so the sidebar search lands here.
  useEffect(() => {
    if (query) setParams({ q: query }, { replace: true });
  }, [query, setParams]);

  const active = tagFilter ? true : query.length > 0;

  const { data, isFetching, error } = useQuery({
    queryKey: ["search", query, kind, tagFilter],
    queryFn: () =>
      api.search({
        query: tagFilter ? "" : query,
        kinds: kind ? [kind as NodeKind] : undefined,
        tags: tagFilter ? [tagFilter] : undefined,
      }),
    enabled: active,
  });

  const pages = data?.pages.content ?? [];
  const tags = data?.tags ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink">{t("search.heading")}</h1>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-dim" strokeWidth={2} />
        <input
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setTagFilter(null);
          }}
          placeholder={t("search.placeholder")}
          className="w-full rounded-xl border border-line2 bg-card py-3 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-dim focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setKind("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            kind === "" ? "bg-accent text-white" : "border border-line2 text-mid hover:bg-elev"
          }`}
        >
          {t("search.all")}
        </button>
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(kind === k ? "" : k)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              kind === k ? "bg-accent text-white" : "border border-line2 text-mid hover:bg-elev"
            }`}
          >
            {t(`kind.${k}`)}
          </button>
        ))}
      </div>

      {isFetching && <p className="text-sm text-dim">{t("search.searching")}</p>}
      {error != null && <p className="text-sm text-red-400">{t("search.failed")}</p>}

      {/* Matching tags — click to see everything carrying that tag */}
      {!tagFilter && tags.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dim">{t("search.tagsSection")}</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setTagFilter(tag.name)}
                className="flex items-center gap-1.5 rounded-full border border-line2 bg-card px-3 py-1 text-sm text-mid transition hover:border-accent/50 hover:text-ink"
              >
                <Hash className="h-3.5 w-3.5 text-accent2" strokeWidth={2} />
                {tag.name}
                <span className="rounded-full bg-elev px-1.5 text-[11px] text-dim">{tag.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tagFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
          <Hash className="h-4 w-4 text-accent2" strokeWidth={2} />
          <span className="text-mid">
            {t("search.pagesWithTag")} <span className="font-medium text-ink">{tagFilter}</span>
          </span>
          <button onClick={() => setTagFilter(null)} className="ml-auto text-dim transition hover:text-ink" title={t("search.clear")}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {active && !isFetching && pages.length === 0 && tags.length === 0 && (
        <EmptyState>{t("search.noMatches")}</EmptyState>
      )}

      <ul className="divide-y divide-line">
        {pages.map((hit) => (
          <li key={hit.nodeId}>
            <Link to={`/nodes/${hit.nodeId}`} className="group block rounded-lg px-3 py-4 transition hover:bg-card">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold text-ink transition group-hover:text-accent2">
                  {hit.title || t("common.untitled")}
                </span>
                <KindBadge kind={hit.kind} />
                <MatchBadges hit={hit} />
              </div>
              {hit.snippet && (
                <p className="mt-1.5 text-sm leading-relaxed text-mid" dangerouslySetInnerHTML={{ __html: hit.snippet }} />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
