import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 5000, host: "0.0.0.0" },
  plugins: [reactRefresh()],
  publicDir: "public",
});
