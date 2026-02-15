import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "web",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        // Disable response buffering for SSE streaming
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            if (proxyRes.headers["content-type"]?.includes("text/event-stream")) {
              // Prevent any buffering/compression on SSE responses
              res.setHeader("X-Accel-Buffering", "no");
              res.setHeader("Cache-Control", "no-cache, no-transform");
            }
          });
        }
      }
    }
  },
  build: {
    outDir: "../public",
    emptyOutDir: true
  }
});
