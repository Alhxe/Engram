import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import Toaster from "./components/Toaster";
import { I18nProvider } from "./i18n/I18nContext";
import { ApiError } from "./lib/api";
import { toast } from "./lib/toast";
import { applyTheme, getTheme } from "./lib/theme";
import "./index.css";
import "@xyflow/react/dist/style.css";

// Surface API failures as a toast. A 401 already drops the session and reloads,
// so there is nothing useful to show for it.
function reportError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return;
  const message = error instanceof Error && error.message ? error.message : "Something went wrong";
  toast.error(message);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: reportError }),
  mutationCache: new MutationCache({ onError: reportError }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

applyTheme(getTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <App />
          <Toaster />
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// Register the service worker in production so Engram is installable as a PWA.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
