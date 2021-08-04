import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 5000 },
  plugins: [reactRefresh()],
  publicDir: "public",
});
