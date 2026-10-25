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
      "/api": "https://addis-hiwot-sacco.onrender.com",
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  };
});
