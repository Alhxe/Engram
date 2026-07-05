import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Dev only: proxy API calls to the backend so the browser stays same-origin
    // (no CORS locally). In production set VITE_API_BASE_URL to the backend URL.
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});