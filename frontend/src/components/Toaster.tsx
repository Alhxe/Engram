import { useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { dismissToast, getToasts, subscribeToasts, type ToastKind } from "@/lib/toast";

const ICON: Record<ToastKind, typeof Info> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const ACCENT: Record<ToastKind, string> = {
  error: "text-red-400",
  success: "text-emerald-400",
  info: "text-accent2",
};

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICON[toast.kind];
        return (
          <div
            key={toast.id}
            className="fade-up pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line2 bg-elev/95 px-3.5 py-3 shadow-xl shadow-black/30 backdrop-blur"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ACCENT[toast.kind]}`} strokeWidth={2} />
            <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 text-dim transition hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
