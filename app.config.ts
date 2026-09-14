import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  tsr: {
    appDirectory: "src",
    routesDirectory: "src/routes",
    generatedRouteTree: "src/routeTree.gen.ts",
    quoteStyle: "single",
    semicolons: true,
  },
  vite: {
    plugins: [tsConfigPaths()],
  },
  server: {
    preset: "cloudflare-pages",
  },
});
