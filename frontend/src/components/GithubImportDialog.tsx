import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useImportRepo } from "@/lib/queries";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "./ui";

export default function GithubImportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [repo, setRepo] = useState("");
  const importRepo = useImportRepo();

  const submit = () => {
    if (!repo.trim()) return;
    importRepo.mutate(repo.trim(), {
      onSuccess: (node) => {
        onClose();
        navigate(`/nodes/${node.id}`);
      },
    });
  };

  const error = importRepo.error instanceof ApiError ? importRepo.error.message : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fade-up w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <GitBranch className="h-4 w-4 text-accent2" strokeWidth={1.75} /> {t("github.add")}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            autoFocus
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder={t("github.placeholder")}
            className="w-full rounded-xl border border-line2 bg-card px-3 py-2.5 text-sm text-ink outline-none placeholder:text-dim focus:border-accent/60"
          />
          <p className="mt-2 text-xs text-dim">{t("github.hint")}</p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={importRepo.isPending || !repo.trim()}>
              {importRepo.isPending ? t("github.importing") : t("github.import")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
