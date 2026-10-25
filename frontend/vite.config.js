import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "");
  return {
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss({ optimize: false })],
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: env.VITE_API_PROXY_TARGET || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  };
});
