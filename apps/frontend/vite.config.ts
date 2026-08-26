import { defineConfig } from 'vite';
import { defaultExclude } from 'vitest/config';
import { reactRouter } from '@react-router/dev/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import Checker from 'vite-plugin-checker';
import path from 'path';

// Glob patterns for the whole frontend spec set. Set on the `shared` project
// (not the root `test` config) because `extends: true` concatenates array
// options — see the note next to `test.include` below.
const INCLUDE_GLOBS = [
  'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
];

// Specs that leak module or global state and therefore cannot share a module
// registry with their neighbours. They run in the dedicated `isolated` Vitest
// project (`isolate: true`); everything else runs in the fast `shared` project
// (`isolate: false`). Root causes: the shared axios instance in
// `src/services/api/ApiService.ts` (the gateway specs), the clipboard global
// (the CopiableText* specs) and several component specs that rely on a fresh
// module registry. Shrink this list as the underlying leaks get fixed — each
// entry removed rejoins the fast project.
const LEAKY_SPECS = [
  'src/services/api/ApiService.test.ts',
  'src/domain/accounts/api/gateways/AuthGatewayApi.test.ts',
  'src/domain/accounts/api/gateways/OrganizationGatewayApi.test.ts',
  'src/domain/accounts/api/gateways/UserGatewayApi.test.ts',
  'src/domain/git/api/gateways/GitProviderGatewayApi.spec.ts',
  'src/domain/skills/api/gateways/SkillsGatewayApi.test.ts',
  'src/shared/components/inputs/CopiableTextField.spec.tsx',
  'src/shared/components/inputs/CopiableTextarea.spec.tsx',
  'src/domain/git/components/ConnectionDrawer/ManageReposPanel.spec.tsx',
  'src/domain/git/components/ManageGitProvider/__tests__/GitProviderAdvancedPanel.spec.tsx',
  'src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.test.tsx',
  // Surfaced as leaky once the suite drifted past the issue's original
  // profiling snapshot; they fail under a shared registry and pass isolated.
  'src/domain/accounts/components/DeployWithCliModal.spec.tsx',
  'src/domain/deployments/components/MembershipChips/MembershipChips.test.tsx',
];

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
      // NOTE: `include` is intentionally set per-project below, not here.
      // `extends: true` *concatenates* array options, so a root `include`
      // would be appended to each project's `include` and the `isolated`
      // project would end up matching every spec instead of just LEAKY_SPECS.
      // Carried over from the retired jest.config.ts. Vitest defaults to 5s,
      // which is not enough for the heavier component suites under full-suite
      // parallelism — the shortfall showed up as an intermittent timeout.
      testTimeout: 15000,
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/apps/frontend',
        provider: 'v8' as const,
      },
      // Vitest's default `isolate: true` gives each spec a fresh module
      // registry, so Chakra + `@packmind/ui` (~1.3s to import, ~830ms of it
      // Chakra alone) get re-evaluated once per file instead of once per
      // worker. Roughly half the specs pay that cost, which dominates the
      // suite's wall clock. Sharing the registry (`isolate: false`) collapses
      // those imports to one per worker and cuts the run ~2.5-3x.
      //
      // A handful of specs leak module/global state (a shared axios instance
      // in `ApiService`, the clipboard global, a few component specs), so they
      // stay in a dedicated `isolated` project; everything else runs in the
      // fast `shared` project. Removing a file from LEAKY_SPECS (e.g. once the
      // ApiService singleton is fixed) moves it into the fast project.
      projects: [
        {
          extends: true,
          test: {
            name: 'shared',
            isolate: false,
            include: INCLUDE_GLOBS,
            exclude: [...defaultExclude, ...LEAKY_SPECS],
          },
        },
        {
          extends: true,
          test: {
            name: 'isolated',
            isolate: true,
            include: LEAKY_SPECS,
          },
        },
      ],
    },
  };
});
