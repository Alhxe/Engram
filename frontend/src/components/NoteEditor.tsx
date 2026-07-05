import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ResizableImage } from "./editor/resizableImage";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import { FontSize } from "./editor/fontSize";
import { Callout } from "./editor/callout";
import { PageEmbed } from "./editor/pageEmbed";

const lowlight = createLowlight();
lowlight.register({ javascript, typescript, python, java, json, bash, xml, css, sql });

const TEXT_COLORS: { label: string; value: string | null }[] = [
  { label: "default", value: null },
  { label: "red", value: "#f87171" },
  { label: "amber", value: "#fbbf24" },
  { label: "green", value: "#34d399" },
  { label: "blue", value: "#60a5fa" },
  { label: "violet", value: "#a78bfa" },
];
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  AlertTriangle,
  CheckCircle2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  Italic,
  Layers,
  List,
  Highlighter,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Table as TableIcon,
  Trash2,
  Type,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { fileToScaledDataUrl } from "@/lib/image";
import { useI18n } from "@/i18n/I18nContext";
import { createPageLink } from "./editor/pageLink";
import { createSlashCommand } from "./editor/slashCommand";
import type { SlashItem } from "./editor/SlashMenu";
import type { MentionItem } from "./editor/MentionList";

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  nodeId: string;
  onFocusChange?: (focused: boolean) => void;
}

function Btn({
  icon: Icon,
  title,
  onClick,
  active,
  danger,
}: {
  icon: typeof Bold;
  title: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
        active
          ? "bg-accent text-white"
          : danger
            ? "text-mid hover:bg-red-500/15 hover:text-red-400"
            : "text-mid hover:bg-line2 hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

const SIZES: { label: string; value: string | null }[] = [
  { label: "S", value: "0.85em" },
  { label: "M", value: null },
  { label: "L", value: "1.3em" },
  { label: "XL", value: "1.7em" },
];

function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  const { t } = useI18n();
  const sep = <span className="mx-1 h-4 w-px bg-line2" />;
  const inTable = editor.isActive("table");
  const currentSize = (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "";

  const applySize = (value: string | null) => {
    if (value) editor.chain().focus().setFontSize(value).run();
    else editor.chain().focus().unsetFontSize().run();
  };

  // Alignment targets the selected image when there is one, otherwise the text block.
  const onImage = editor.isActive("image");
  const setAlign = (a: "left" | "center" | "right" | "justify") => {
    if (onImage && a !== "justify") editor.chain().focus().updateAttributes("image", { align: a }).run();
    else editor.chain().focus().setTextAlign(a).run();
  };
  const alignActive = (a: string) =>
    onImage ? editor.getAttributes("image").align === a : editor.isActive({ textAlign: a });

  return (
    <div className="inline-flex flex-col gap-1 rounded-xl border border-line2 bg-elev/95 px-1.5 py-1 shadow-xl shadow-black/40 backdrop-blur">
      <div className="flex flex-wrap items-center gap-0.5">
        <Btn icon={Bold} title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <Btn icon={Italic} title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Btn icon={UnderlineIcon} title={t("editor.underline")} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <Btn icon={Highlighter} title={t("editor.highlight")} active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#facc15" }).run()} />
        <span className="mx-0.5 flex items-center gap-0.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.label}
              type="button"
              title={t("editor.color")}
              onMouseDown={(e) => {
                e.preventDefault();
                if (c.value) editor.chain().focus().setColor(c.value).run();
                else editor.chain().focus().unsetColor().run();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-line2"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-line2"
                style={{ background: c.value ?? "transparent" }}
              />
            </button>
          ))}
        </span>
        {sep}
        <Btn icon={Heading1} title={t("editor.h1")} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <Btn icon={Heading2} title={t("editor.h2")} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <div className="mx-0.5 flex items-center rounded-md bg-card p-0.5" title={t("editor.size")}>
          {SIZES.map((s) => {
            const isActive = s.value ? currentSize === s.value : currentSize === "";
            return (
              <button
                key={s.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySize(s.value);
                }}
                className={`h-6 w-6 rounded text-[11px] font-semibold transition ${
                  isActive ? "bg-accent text-white" : "text-dim hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {sep}
        <Btn icon={AlignLeft} title={t("editor.alignLeft")} active={alignActive("left")} onClick={() => setAlign("left")} />
        <Btn icon={AlignCenter} title={t("editor.alignCenter")} active={alignActive("center")} onClick={() => setAlign("center")} />
        <Btn icon={AlignRight} title={t("editor.alignRight")} active={alignActive("right")} onClick={() => setAlign("right")} />
        <Btn icon={AlignJustify} title={t("editor.alignJustify")} active={alignActive("justify")} onClick={() => setAlign("justify")} />
        {sep}
        <Btn icon={List} title={t("editor.bullet")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Btn icon={ListOrdered} title={t("editor.numbered")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <Btn icon={ListChecks} title={t("editor.todo")} active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} />
        {sep}
        <Btn icon={Quote} title={t("editor.quote")} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <Btn icon={Code} title={t("editor.code")} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <Btn icon={ImagePlus} title={t("editor.image")} onClick={onPickImage} />
        <Btn icon={TableIcon} title={t("editor.table")} active={inTable} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
      </div>

      {inTable && (
        <div className="flex flex-wrap items-center gap-0.5 border-t border-line2 pt-1">
          <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-dim">{t("editor.table")}</span>
          {sep}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }} className="rounded-md px-2 py-1 text-xs text-mid transition hover:bg-line2 hover:text-ink">+ {t("editor.tableRow")}</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }} className="rounded-md px-2 py-1 text-xs text-mid transition hover:bg-line2 hover:text-ink">+ {t("editor.tableCol")}</button>
          {sep}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }} className="rounded-md px-2 py-1 text-xs text-mid transition hover:bg-line2 hover:text-ink">− {t("editor.tableRow")}</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }} className="rounded-md px-2 py-1 text-xs text-mid transition hover:bg-line2 hover:text-ink">− {t("editor.tableCol")}</button>
          {sep}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeaderRow().run(); }} className="rounded-md px-2 py-1 text-xs text-mid transition hover:bg-line2 hover:text-ink">{t("editor.tableHeader")}</button>
          <Btn icon={Trash2} title={t("editor.tableDelete")} danger onClick={() => editor.chain().focus().deleteTable().run()} />
        </div>
      )}
    </div>
  );
}

export default function NoteEditor({ content, onChange, nodeId, onFocusChange }: NoteEditorProps) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [focused, setFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allPages } = useQuery({
    queryKey: ["nodes", "mention-index"],
    queryFn: () => api.nodes.list({ size: 200 }),
  });
  const pagesRef = useRef<{ id: string; title: string }[]>([]);
  useEffect(() => {
    pagesRef.current = (allPages?.content ?? []).map((n) => ({ id: n.id, title: n.title }));
  }, [allPages]);

  const editorRef = useRef<Editor | null>(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const insertImageFiles = (files: File[]) => {
    files
      .filter((f) => f.type.startsWith("image/"))
      .forEach(async (file) => {
        try {
          const src = await fileToScaledDataUrl(file);
          editorRef.current?.chain().focus().setImage({ src }).run();
        } catch {
          /* ignore unreadable image */
        }
      });
  };

  const slashItems: SlashItem[] = [
    { key: "text", title: t("slash.text"), icon: Type, run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
    { key: "h1", title: t("editor.h1"), icon: Heading1, run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run() },
    { key: "h2", title: t("editor.h2"), icon: Heading2, run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run() },
    { key: "h3", title: t("slash.h3"), icon: Heading3, run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run() },
    { key: "bullet", title: t("editor.bullet"), icon: List, run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
    { key: "numbered", title: t("editor.numbered"), icon: ListOrdered, run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
    { key: "todo", title: t("editor.todo"), icon: ListChecks, run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
    { key: "quote", title: t("editor.quote"), icon: Quote, run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
    { key: "code", title: t("editor.code"), icon: Code, run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
    { key: "callout-info", title: t("slash.calloutInfo"), icon: Info, run: (e, r) => e.chain().focus().deleteRange(r).wrapIn("callout", { variant: "info" }).run() },
    { key: "callout-warn", title: t("slash.calloutWarn"), icon: AlertTriangle, run: (e, r) => e.chain().focus().deleteRange(r).wrapIn("callout", { variant: "warn" }).run() },
    { key: "callout-success", title: t("slash.calloutSuccess"), icon: CheckCircle2, run: (e, r) => e.chain().focus().deleteRange(r).wrapIn("callout", { variant: "success" }).run() },
    { key: "embed", title: t("slash.embed"), icon: Layers, run: (e, r) => e.chain().focus().deleteRange(r).insertContent({ type: "pageEmbed", attrs: { pageId: null } }).run() },
    { key: "table", title: t("editor.table"), icon: TableIcon, run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { key: "divider", title: t("slash.divider"), icon: Minus, run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
    { key: "image", title: t("editor.image"), icon: ImagePlus, run: (e, r) => { e.chain().focus().deleteRange(r).run(); fileInputRef.current?.click(); } },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Callout,
      PageEmbed.configure({ currentId: nodeId }),
      CodeBlockLowlight.configure({ lowlight }),
      Highlight.configure({ multicolor: true }),
      Color,
      createSlashCommand(slashItems),
      Placeholder.configure({
        showOnlyCurrent: false,
        placeholder: ({ node }) =>
          node.type.name === "heading" ? t("editor.headingPlaceholder") : t("editor.placeholder"),
      }),
      ResizableImage.configure({ allowBase64: true, HTMLAttributes: { class: "editor-image" } }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      createPageLink({
        getItems: (query) => {
          const q = query.trim().toLowerCase();
          const pool = pagesRef.current.filter((p) => p.id !== nodeId);
          const matches: MentionItem[] = pool
            .filter((p) => (q ? p.title.toLowerCase().includes(q) : true))
            .slice(0, 8)
            .map((p) => ({ id: p.id, title: p.title || t("common.untitled") }));
          const exact = pool.some((p) => p.title.trim().toLowerCase() === q);
          if (q && !exact) matches.push({ isNew: true, title: query.trim(), query: query.trim() });
          return matches;
        },
        createPage: async (title) => {
          const node = await api.nodes.create({ title });
          qc.invalidateQueries({ queryKey: ["nodes"] });
          qc.invalidateQueries({ queryKey: ["children"] });
          return { id: node.id, title: node.title };
        },
        onLinked: (targetId) => {
          if (targetId === nodeId) return;
          api.links
            .create({ sourceId: nodeId, targetId })
            .then(() => qc.invalidateQueries({ queryKey: ["backlinks"] }))
            .catch(() => {});
        },
        labels: { empty: t("editor.mentionEmpty"), create: t("editor.mentionCreate") },
      }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: () => {
      setFocused(true);
      onFocusChange?.(true);
    },
    onBlur: () => {
      setFocused(false);
      onFocusChange?.(false);
    },
    editorProps: {
      attributes: {
        class: "tiptap min-h-[260px] text-[15px] leading-relaxed outline-none",
      },
      handleClickOn: (_view, _pos, node) => {
        if (node.type.name === "mention" && node.attrs.id) {
          navigateRef.current(`/nodes/${node.attrs.id}`);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        insertImageFiles(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        insertImageFiles(files);
        return true;
      },
    },
  });
  editorRef.current = editor;

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, lang]);

  if (!editor) return null;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          insertImageFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <div
        className={`z-10 overflow-hidden transition-all duration-150 md:sticky md:top-14 ${
          focused ? "mb-2 max-h-60 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <Toolbar editor={editor} onPickImage={() => fileInputRef.current?.click()} />
      </div>

      <div
        className={`-mx-3 rounded-lg px-3 py-2 transition-colors ${
          focused ? "bg-panel/50 ring-1 ring-line" : ""
        }`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
