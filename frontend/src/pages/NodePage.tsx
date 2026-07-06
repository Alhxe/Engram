import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ClipboardCheck, GitBranch, GraduationCap, History, Link2, Maximize2, Minimize2, Network, Paperclip, Plus, Printer, Sparkles, Star } from "lucide-react";
import {
  useBacklinks,
  useBreadcrumb,
  useCreateNode,
  useDeleteNode,
  useNode,
  useNodes,
  useSetFavorite,
  useUpdateNode,
} from "@/lib/queries";
import { api } from "@/lib/api";
import type { NodeResponse, PageLayout } from "@/lib/types";
import NoteEditor from "@/components/NoteEditor";
import Attachments from "@/components/Attachments";
import PropertiesEditor from "@/components/PropertiesEditor";
import CollectionView, { type ViewMode } from "@/components/CollectionView";
import TagInput from "@/components/TagInput";
import AiAutoSuggest from "@/components/AiAutoSuggest";
import UnlinkedMentions from "@/components/UnlinkedMentions";
import PageHistory from "@/components/PageHistory";
import AiSummary from "@/components/AiSummary";
import SchemaEditor from "@/components/SchemaEditor";
import BulkFill from "@/components/BulkFill";
import TableOfContents from "@/components/TableOfContents";
import PathProgress from "@/components/PathProgress";
import FlashcardGenerator from "@/components/FlashcardGenerator";
import FlashcardView from "@/components/FlashcardView";
import Backlinks from "@/components/Backlinks";
import LinkSuggestions from "@/components/LinkSuggestions";
import PropertyBacklinks from "@/components/PropertyBacklinks";
import SmartCollection from "@/components/SmartCollection";
import PageMenu from "@/components/PageMenu";
import EditWithAi from "@/components/EditWithAi";
import { useI18n } from "@/i18n/I18nContext";
import { LAYOUT_ICON } from "@/components/ui";

// React Flow lives here — only load it when the Connections panel is opened.
const LocalGraph = lazy(() => import("@/components/LocalGraph"));

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const LAYOUTS: PageLayout[] = ["DOCUMENT", "MINDMAP", "TABLE", "BOARD", "CALENDAR", "CHART"];
const LAYOUT_MODE: Record<Exclude<PageLayout, "DOCUMENT">, ViewMode> = {
  MINDMAP: "map",
  TABLE: "table",
  BOARD: "board",
  CALENDAR: "calendar",
  CHART: "chart",
};

export default function NodePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data: node, isLoading } = useNode(id);
  const { data: crumbs } = useBreadcrumb(id);
  const { data: childrenPage } = useNodes(id);
  const { data: backlinks } = useBacklinks(id);
  const updateNode = useUpdateNode(id!);
  const deleteNode = useDeleteNode();
  const createNode = useCreateNode();
  const setFavorite = useSetFavorite(id!);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [layout, setLayout] = useState<PageLayout>("DOCUMENT");
  const [dirty, setDirty] = useState(false);
  const [wide, setWide] = useState(() => localStorage.getItem("engram.wide") === "1");
  const [editorFocused, setEditorFocused] = useState(false);
  const [openMeta, setOpenMeta] = useState<string | null>(null);
  const [aiEditOpen, setAiEditOpen] = useState(false);

  const toggleWide = () =>
    setWide((w) => {
      const next = !w;
      localStorage.setItem("engram.wide", next ? "1" : "0");
      return next;
    });

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content ?? "");
      setTags(node.tags);
      setLayout(node.layout);
      setDirty(false);
    }
  }, [node]);

  useEffect(() => {
    if (!dirty || !node) return;
    const timer = setTimeout(async () => {
      await updateNode.mutateAsync({
        title: title.trim() || t("common.untitled"),
        content,
        kind: node.kind,
        layout,
        parentId: node.parentId,
        tags,
      });
      setDirty(false);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, content, tags, layout]);

  // Auto-trash an untouched journal entry when you leave it, so empty days
  // don't pile up. A journal entry is a child of the "Journal" page; "empty"
  // means no text and no sub-pages. Soft delete — recoverable from Trash.
  const isEmptyJournal =
    (crumbs ?? []).some((c) => c.id !== id && c.title.trim().toLowerCase() === "journal") &&
    stripHtml(content).length === 0 &&
    !(node?.hasChildren ?? false) &&
    (childrenPage?.content.length ?? 0) === 0;

  const emptyJournalRef = useRef(false);
  useEffect(() => {
    emptyJournalRef.current = isEmptyJournal;
  }, [isEmptyJournal]);

  const deleteRef = useRef(deleteNode);
  deleteRef.current = deleteNode;
  useEffect(() => {
    const leavingId = id;
    return () => {
      if (emptyJournalRef.current && leavingId) deleteRef.current.mutate(leavingId);
    };
  }, [id]);

  if (isLoading || !node) {
    return <p className="p-8 text-sm text-dim">{t("common.loading")}</p>;
  }

  const edit = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setDirty(true);
  };

  const addSubPage = () => {
    createNode.mutate(
      { title: t("common.untitled"), content: "", parentId: node.id },
      { onSuccess: (child) => navigate(`/nodes/${child.id}`) },
    );
  };

  const remove = () => {
    const parent = node.parentId;
    deleteNode.mutate(node.id, { onSuccess: () => navigate(parent ? `/nodes/${parent}` : "/") });
  };

  const status = updateNode.isPending ? t("common.saving") : dirty ? "" : t("common.saved");
  const isDoc = layout === "DOCUMENT";
  const children = childrenPage?.content ?? [];
  // Cap the reading measure: prose stays comfortable, "wide" is generous but not edge-to-edge.
  const widthClass = wide ? "max-w-7xl" : isDoc ? "max-w-3xl" : "max-w-5xl";

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar: breadcrumb + save state + page-type switcher + actions */}
      <header className="z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-app/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5 md:sticky md:top-0">
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-[13px] text-dim">
          <Link to="/" className="shrink-0 transition hover:text-ink">
            {t("nav.home")}
          </Link>
          {crumbs?.map((crumb, index) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-dim/50" strokeWidth={2} />
              {index === crumbs.length - 1 ? (
                <span className="truncate text-mid">{crumb.title || t("common.untitled")}</span>
              ) : (
                <Link to={`/nodes/${crumb.id}`} className="truncate transition hover:text-ink">
                  {crumb.title || t("common.untitled")}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <span className="hidden shrink-0 text-xs text-dim sm:inline">{status}</span>

        <div className="flex shrink-0 items-center rounded-lg border border-line bg-card p-0.5">
          {LAYOUTS.map((l) => {
            const Icon = LAYOUT_ICON[l];
            return (
              <button
                key={l}
                title={t(`layout.${l}`)}
                onClick={() => edit(setLayout)(l)}
                className={`flex h-7 w-8 items-center justify-center rounded-md transition ${
                  layout === l ? "bg-elev text-ink shadow-sm" : "text-dim hover:text-mid"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </button>
            );
          })}
        </div>

        {isDoc && (
          <button
            onClick={() => setAiEditOpen(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-accent"
            title={t("aiEdit.button")}
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        <button
          onClick={() => setFavorite.mutate(!node.favorite)}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
            node.favorite ? "text-amber-400 hover:bg-elev" : "text-dim hover:bg-elev hover:text-ink"
          }`}
          title={node.favorite ? t("page.unfavorite") : t("page.favorite")}
        >
          <Star className="h-4 w-4" strokeWidth={1.75} fill={node.favorite ? "currentColor" : "none"} />
        </button>

        <button
          onClick={toggleWide}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
          title={wide ? t("page.widthNormal") : t("page.widthFull")}
        >
          {wide ? <Minimize2 className="h-4 w-4" strokeWidth={1.75} /> : <Maximize2 className="h-4 w-4" strokeWidth={1.75} />}
        </button>

        <PageMenu node={node} title={title} content={content} onDelete={remove} />
      </header>

      {aiEditOpen && (
        <EditWithAi
          nodeId={node.id}
          onApply={(html) => edit(setContent)(html)}
          onClose={() => setAiEditOpen(false)}
        />
      )}

      <div className={`mx-auto w-full flex-1 px-4 pb-16 pt-8 sm:px-8 sm:pt-10 ${widthClass}`}>
        <div className="group/head page-head">
          <input
            value={title}
            onChange={(e) => edit(setTitle)(e.target.value)}
            placeholder={t("common.untitled")}
            className="w-full bg-transparent pb-1 text-[2.1rem] font-bold leading-[1.25] tracking-tight text-ink outline-none placeholder:text-dim/50"
          />

          <div className="mt-2">
            <TagInput tags={tags} onChange={edit(setTags)} placeholder={t("node.addTag")} />
          </div>

          <PropertiesEditor node={node} />
        </div>

        {tags.includes("ruta") && <PathProgress nodeId={node.id} />}

        {isDoc && (
          <AiAutoSuggest
            nodeId={node.id}
            title={title}
            content={content}
            tags={tags}
            properties={node.properties}
            editing={editorFocused}
            onSetTags={edit(setTags)}
          />
        )}

        {isDoc && tags.includes("flashcard") ? (
          <FlashcardView
            node={node}
            content={content}
            onChange={edit(setContent)}
            onFocusChange={setEditorFocused}
          />
        ) : isDoc ? (
          <>
            <TableOfContents content={content} />
            <div className="mt-3 border-t border-line pt-4">
              <NoteEditor
                content={content}
                onChange={edit(setContent)}
                nodeId={node.id}
                onFocusChange={setEditorFocused}
              />
            </div>

            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
                  {t("page.subPages")}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/ask?scope=${node.id}`)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2"
                    title={t("ask.aboutPage")}
                  >
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> {t("nav.ask")}
                  </button>
                  <button
                    onClick={() => navigate(`/review?scope=${node.id}`)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2"
                    title={t("review.scopeHint")}
                  >
                    <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} /> {t("nav.review")}
                  </button>
                  <button
                    onClick={() => navigate(`/exam?scope=${node.id}`)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2"
                    title={t("exam.title")}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={2} /> {t("exam.button")}
                  </button>
                  <button
                    onClick={() => navigate(`/guide?scope=${node.id}`)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-accent2"
                    title={t("guide.title")}
                  >
                    <Printer className="h-3.5 w-3.5" strokeWidth={2} /> {t("guide.button")}
                  </button>
                  <FlashcardGenerator pageId={node.id} />
                  <button
                    onClick={addSubPage}
                    disabled={createNode.isPending}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dim transition hover:bg-card hover:text-mid disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("page.newSubPage")}
                  </button>
                </div>
              </div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <SchemaEditor nodeId={node.id} schema={node.schema} />
                {children.length > 0 && <BulkFill parentId={node.id} schema={node.schema} />}
              </div>
              <CollectionView children={children} parentId={node.id} defaultMode="list" onAdd={addSubPage} schema={node.schema} />
              {children.length > 0 && <AiSummary parentId={node.id} />}
            </section>
          </>
        ) : (
          <section className="mt-6">
            <div className="mb-2"><SchemaEditor nodeId={node.id} schema={node.schema} /></div>
            <CollectionView
              children={children}
              parentId={node.id}
              lockedMode={LAYOUT_MODE[layout as Exclude<PageLayout, "DOCUMENT">]}
              onAdd={addSubPage}
              schema={node.schema}
              tall
            />
            {children.length > 0 && <AiSummary parentId={node.id} />}
          </section>
        )}

        <SmartCollection node={node} />

        <div className="mt-8 border-t border-line pt-4">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "attachments", icon: Paperclip, cls: "text-amber-400/80", label: t("attachments.title") },
              { key: "connections", icon: Network, cls: "text-violet-400/80", label: t("graph.connections") },
              { key: "mentions", icon: Link2, cls: "text-sky-400/80", label: t("mentions.title") },
              { key: "history", icon: History, cls: "text-zinc-400/80", label: t("history.title") },
              { key: "backlinks", icon: Link2, cls: "text-emerald-400/80", label: t("node.backlinks"), badge: backlinks?.length },
              { key: "propRefs", icon: GitBranch, cls: "text-rose-400/80", label: t("propRefs.title") },
            ].map((p) => {
              const Icon = p.icon;
              const active = openMeta === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setOpenMeta(active ? null : p.key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition ${
                    active ? "border-line2 bg-elev text-ink" : "border-line text-dim hover:bg-card hover:text-mid"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${p.cls}`} strokeWidth={1.75} />
                  {p.label}
                  {"badge" in p && p.badge ? (
                    <span className="rounded-full bg-card px-1 text-[10px] text-mid">{p.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {openMeta && (
            <div className="fade-up mt-4">
              {openMeta === "attachments" && <Attachments nodeId={node.id} />}
              {openMeta === "connections" && (
                <>
                  <LinkSuggestions nodeId={node.id} />
                  <Suspense fallback={<div className="h-[300px] rounded-xl border border-line bg-panel" />}>
                    <LocalGraph nodeId={node.id} />
                  </Suspense>
                </>
              )}
              {openMeta === "mentions" && <UnlinkedMentions nodeId={node.id} />}
              {openMeta === "history" && <PageHistory nodeId={node.id} />}
              {openMeta === "backlinks" && <Backlinks nodeId={node.id} backlinks={backlinks ?? []} />}
              {openMeta === "propRefs" && <PropertyBacklinks nodeId={node.id} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
