import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, FileText, Globe, LayoutTemplate, Link2, MoreHorizontal, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { exportMarkdown, exportPdf } from "@/lib/export";
import { useI18n } from "@/i18n/I18nContext";
import type { NodeResponse } from "@/lib/types";
import DuplicatesDialog from "./DuplicatesDialog";

export default function PageMenu({
  node,
  title,
  content,
  onDelete,
}: {
  node: NodeResponse;
  title: string;
  content: string;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const setTemplate = useMutation({
    mutationFn: (v: boolean) => api.nodes.setTemplate(node.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["node", node.id] });
    },
  });
  const setShared = useMutation({
    mutationFn: (v: boolean) => api.nodes.setShared(node.id, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["node", node.id] }),
  });
  const [copied, setCopied] = useState(false);

  const shareUrl = node.shareToken ? `${window.location.origin}/p/${node.shareToken}` : "";
  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-mid transition hover:bg-card hover:text-ink";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
        title={t("page.more")}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="fade-up absolute right-0 top-9 z-30 w-52 rounded-xl border border-line2 bg-panel p-1 shadow-2xl shadow-black/50">
          {node.hasChildren && (
            <>
              <button
                className={item}
                onClick={() => {
                  setOpen(false);
                  navigate(`/ask?scope=${node.id}`);
                }}
              >
                <Sparkles className="h-4 w-4 text-dim" strokeWidth={1.75} />
                {t("page.askHere")}
              </button>
              <div className="my-1 h-px bg-line" />
            </>
          )}
          <button
            className={item}
            onClick={() => {
              setTemplate.mutate(!node.template);
              setOpen(false);
            }}
          >
            <LayoutTemplate className="h-4 w-4 text-dim" strokeWidth={1.75} />
            {node.template ? t("page.unTemplate") : t("page.asTemplate")}
          </button>
          {node.shareToken ? (
            <>
              <button className={item} onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                ) : (
                  <Link2 className="h-4 w-4 text-dim" strokeWidth={1.75} />
                )}
                {copied ? t("share.copied") : t("share.copy")}
              </button>
              <button className={item} onClick={() => { setShared.mutate(false); setOpen(false); }}>
                <Globe className="h-4 w-4 text-dim" strokeWidth={1.75} />
                {t("share.stop")}
              </button>
            </>
          ) : (
            <button className={item} onClick={() => setShared.mutate(true)}>
              <Globe className="h-4 w-4 text-dim" strokeWidth={1.75} />
              {t("share.start")}
            </button>
          )}
          <div className="my-1 h-px bg-line" />
          <button
            className={item}
            onClick={() => {
              exportMarkdown(title, content);
              setOpen(false);
            }}
          >
            <FileText className="h-4 w-4 text-dim" strokeWidth={1.75} />
            {t("page.exportMd")}
          </button>
          <button
            className={item}
            onClick={() => {
              exportPdf(title, content);
              setOpen(false);
            }}
          >
            <Download className="h-4 w-4 text-dim" strokeWidth={1.75} />
            {t("page.exportPdf")}
          </button>
          <div className="my-1 h-px bg-line" />
          <button className={item} onClick={() => { setOpen(false); setDupOpen(true); }}>
            <Copy className="h-4 w-4 text-dim" strokeWidth={1.75} />
            {t("dup.find")}
          </button>
          <button
            className={`${item} hover:bg-red-500/10 hover:text-red-400`}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            {t("common.delete")}
          </button>
        </div>
      )}
      {dupOpen && <DuplicatesDialog nodeId={node.id} onClose={() => setDupOpen(false)} />}
    </div>
  );
}
