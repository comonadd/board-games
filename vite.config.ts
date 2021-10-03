import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import path from "path";

const SRC = path.resolve(__dirname, "app");

export default defineConfig({
  server: {
    port: 8000,
    host: "0.0.0.0",
    watch: {
      usePolling: true,
    },
  },
  plugins: [reactRefresh()],
  publicDir: "public",
  resolve: {
    alias: {
      "~": SRC,
    },
  },
});
