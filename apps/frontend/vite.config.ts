import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import Checker from 'vite-plugin-checker';
import path from 'path';

export default defineConfig(() => {
  // Determine edition mode (defaults to OSS if not explicitly set to 'proprietary')
  const isOssMode = process.env.PACKMIND_EDITION !== 'proprietary';

  // Configure resolve aliases based on edition
  const resolveAliases = isOssMode
    ? {
        '@packmind/proprietary/frontend': path.resolve(
          __dirname,
          'src/domain/editions/stubs',
        ),
      }
    : {
        '@packmind/proprietary/frontend': path.resolve(__dirname, 'src'),
      };

  const proxy: Record<
    string,
    { target: string; changeOrigin: boolean; ws?: boolean }
  > = {};

  if (process.env.API_HOSTNAME && process.env.API_PORT) {
    proxy['/api'] = {
      target: `http://${process.env.API_HOSTNAME}:${process.env.API_PORT}`,
      changeOrigin: true,
    };
  }

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/frontend',
    assetsInclude: ['**/*.svg', '**/*.png'],
    define: {
      __PACKMIND_EDITION__: JSON.stringify(
        process.env.PACKMIND_EDITION || 'oss',
      ),
    },
    resolve: {
      alias: resolveAliases,
      dedupe: ['react', 'react-dom', 'react-router'],
    },
    server: {
      port: 4200,
      host: process.env.NX_WATCHER ? '0.0.0.0' : 'localhost',
      allowedHosts: ['frontend', '.ts.net'],
      proxy,
      // VITE_HMR_HOST: set to your tunnel hostname (e.g. *.ts.net) when serving
      // dev through TLS-terminating reverse proxy — without it, the browser
      // tries to open wss://<host>:4200 directly and the WebSocket never opens,
      // leaving the bundle stale and hiding code fixes.
      hmr: process.env.VITE_HMR_HOST
        ? {
            host: process.env.VITE_HMR_HOST,
            protocol: 'wss',
            clientPort: 443,
          }
        : process.env.NX_WATCHER
          ? {
              // In Docker, the browser connects via localhost:4200 (port mapping)
              // but the server binds to 0.0.0.0:4200 inside the container.
              // Explicit clientPort ensures the HMR WebSocket connects correctly.
              clientPort: 4200,
            }
          : true,
      watch: {
        usePolling: !!process.env.NX_WATCHER,
        interval: 1000,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/tmp/**',
          '**/.react-router/**',
          '**/tsconfig.base.effective.json',
          '**/*.tsbuildinfo',
        ],
      },
    },
    preview: {
      port: 4200,
      host: 'localhost',
    },
    plugins: [
      // The React Router dev plugin injects a Fast Refresh preamble that only a
      // real browser document can satisfy, so under Vitest every component
      // suite dies with "can't detect preamble". Tests do not need the plugin:
      // `jsx: "react-jsx"` lets esbuild handle the JSX transform on its own.
      !process.env.VITEST && reactRouter(),
      nxViteTsPaths(),
      nxCopyAssetsPlugin(['*.md']),
      // enableBuild: false keeps the checker to the dev-server overlay. Its build
      // path spawns a bare `tsc --noEmit` from the workspace root — which has no
      // tsconfig.json, so tsc prints its usage and exits 1 — then calls
      // process.exit() on that code. Nx loads this config inside project-graph
      // workers, so with NODE_ENV=production that killed the worker and any nx
      // command failed with "Failed to process project graph". CI type-checks the
      // frontend through the dedicated `frontend:typecheck` target instead.
      Checker({ typescript: true, enableBuild: false }),
    ],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    build: {
      outDir: '../../dist/apps/frontend',
      emptyOutDir: true,
      reportCompressedSize: true,
    },
    test: {
      watch: false,
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      include: [
        'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        'app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      ],
      // Carried over from the retired jest.config.ts. Vitest defaults to 5s,
      // which is not enough for the heavier component suites under full-suite
      // parallelism — the shortfall showed up as an intermittent timeout.
      testTimeout: 15000,
      // Vitest's default `isolate: true` recycles the worker for every spec, so
      // each file re-evaluates the whole module graph — Chakra plus the
      // `@packmind/ui` barrel, which nearly every spec pulls in. That
      // re-evaluation, not the tests, dominated the suite's wall clock; sharing
      // the worker collapses it to once per worker and roughly triples the
      // speed. Turning isolation off also disables Vitest's per-file module
      // reset, so `src/test-setup.ts` restores that by hand — keep the two
      // together, `isolate: false` alone lets mocks leak between specs.
      isolate: false,
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/apps/frontend',
        provider: 'v8' as const,
      },
    },
  };
});
