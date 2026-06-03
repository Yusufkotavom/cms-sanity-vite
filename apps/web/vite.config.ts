import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./@"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("@uiw/react-markdown-preview") ||
            id.includes("micromark") ||
            id.includes("remark-") ||
            id.includes("rehype-") ||
            id.includes("unified")
          ) {
            return "markdown-preview";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("@dnd-kit")) {
            return "dnd";
          }

          if (id.includes("@tanstack/react-table")) {
            return "table";
          }
        },
      },
    },
  },
});
