import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, FileText, Plus, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useCreateNode } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { LAYOUT_ICON } from "./ui";
import type { PageLayout } from "@/lib/types";

interface Item {
  key: string;
  label: string;
  hint?: string;
  icon: typeof FileText;
  run: () => void;
}

export default function CommandPalette() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const createNode = useCreateNode();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["nodes", "palette"],
    queryFn: () => api.nodes.list({ size: 200 }),
    enabled: open,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const close = () => setOpen(false);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions: Item[] = [
      {
        key: "new",
        label: t("palette.newPage"),
        icon: Plus,
        run: () => createNode.mutate({ title: t("common.untitled"), content: "" }, {
          onSuccess: (node) => navigate(`/nodes/${node.id}`),
        }),
      },
      {
        key: "ask",
        label: query ? `${t("palette.ask")}: “${query}”` : t("palette.ask"),
        icon: Sparkles,
        run: () => navigate("/ask"),
      },
      {
        key: "search",
        label: query ? `${t("palette.search")}: “${query}”` : t("palette.search"),
        icon: Search,
        run: () => navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search"),
      },
    ];

    const pages = (data?.content ?? [])
      .filter((n) => (q ? (n.title || "").toLowerCase().includes(q) : true))
      .slice(0, 8)
      .map((n): Item => {
        const Icon = LAYOUT_ICON[(n.layout ?? "DOCUMENT") as PageLayout];
        return {
          key: n.id,
          label: n.title || t("common.untitled"),
          hint: t("palette.page"),
          icon: Icon,
          run: () => navigate(`/nodes/${n.id}`),
        };
      });

    return [...pages, ...actions.filter((a) => (q ? a.label.toLowerCase().includes(q) || a.key.includes(q) : true))];
  }, [query, data, t, navigate, createNode]);

  useEffect(() => setSelected(0), [query]);

  const choose = (item: Item) => {
    item.run();
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s + items.length - 1) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selected]) choose(items[selected]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={close}>
      <div
        className="fade-up w-full max-w-lg overflow-hidden rounded-2xl border border-line2 bg-panel shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-dim" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("palette.placeholder")}
            className="w-full bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-dim"
          />
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && <p className="px-3 py-4 text-sm text-dim">{t("palette.empty")}</p>}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onMouseEnter={() => setSelected(i)}
                onClick={() => choose(item)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                  i === selected ? "bg-elev text-ink" : "text-mid hover:bg-card"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="text-[11px] text-dim">{item.hint}</span>}
                {i === selected && <CornerDownLeft className="h-3.5 w-3.5 text-dim" strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
