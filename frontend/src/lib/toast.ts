export type ToastKind = "error" | "success" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  // New array reference so useSyncExternalStore detects the change.
  toasts = [...toasts];
  listeners.forEach((l) => l());
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts() {
  return toasts;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((l) => l());
}

export function pushToast(message: string, kind: ToastKind = "info") {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  listeners.forEach((l) => l());
  window.setTimeout(() => dismissToast(id), kind === "error" ? 6000 : 3500);
  return id;
}

export const toast = {
  error: (message: string) => pushToast(message, "error"),
  success: (message: string) => pushToast(message, "success"),
  info: (message: string) => pushToast(message, "info"),
};
