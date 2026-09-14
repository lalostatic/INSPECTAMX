import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tanstackStart({
      tsr: {
        appDirectory: 'src',
        routesDirectory: 'src/routes',
        generatedRouteTree: 'src/routeTree.gen.ts',
        quoteStyle: 'single',
        semicolons: true,
      },
      server: {
        preset: 'cloudflare-pages',
      },
    }),
    tsConfigPaths(),
  ],
});
