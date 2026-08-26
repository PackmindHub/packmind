import { defineConfig } from 'vite';
import { defaultExclude } from 'vitest/config';
import { reactRouter } from '@react-router/dev/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import Checker from 'vite-plugin-checker';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'path';

const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));

// Glob patterns for the whole frontend spec set. Set on the `shared` project
// (not the root `test` config) because `extends: true` concatenates array
// options — see the note next to `test.include` below.
const INCLUDE_GLOBS = [
  'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
];

// Specs that leak module/global state WITHOUT calling `vi.mock`/`vi.doMock`,
// so the content scan below cannot detect them. They must be listed by hand.
// Right now this is only the clipboard-global leak in the CopiableText* specs
// and the proprietary-edition-only specs that don't exist in the OSS tree (on
// OSS these entries simply match nothing — harmless; under
// `PACKMIND_EDITION=proprietary` they are quarantined even if a future edit
// drops their `vi.mock` calls). Everything that mocks a module is picked up
// automatically — see `MODULE_MOCKING_SPECS`.
const ALWAYS_ISOLATE = [
  'src/shared/components/inputs/CopiableTextField.spec.tsx',
  'src/shared/components/inputs/CopiableTextarea.spec.tsx',
  'src/domain/change-proposals/api/gateways/ChangeProposalsGatewayApi.spec.ts',
  'src/domain/change-proposals/api/queries/ChangeProposalsQueries.spec.tsx',
  'src/domain/deployments/components/redesign/DeploymentsOverviewRedesign.spec.tsx',
  'src/domain/marketplaces/components/MarketplaceDetailLayout.spec.tsx',
];

// Any spec that calls `vi.mock`/`vi.doMock` cannot share a module registry with
// its neighbours: under `isolate: false` the shared registry may already hold
// the real (unmocked) module by the time the spec's hoisted mock runs — or a
// neighbour's mock lingers into this spec — so mocks silently fail to apply.
// The symptoms are order-dependent and drift run-to-run (`… is not a function`,
// `useAuthService must be used within AuthProvider`, `No QueryClient set`),
// which is exactly why a hand-maintained leaky list kept going stale. Instead,
// scan the spec files once at config-eval time and route every module-mocking
// spec into the isolated project automatically. This is deterministic and
// self-maintaining: a spec that adds or drops `vi.mock` moves projects on its
// own, no list to update.
const SPEC_FILENAME_RE = /\.(test|spec)\.(js|mjs|cjs|ts|mts|cts|jsx|tsx)$/;
const MODULE_MOCK_RE = /\bvi\s*\.\s*(mock|doMock)\b/;

function collectModuleMockingSpecs(dir: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      found.push(...collectModuleMockingSpecs(absolute));
    } else if (entry.isFile() && SPEC_FILENAME_RE.test(entry.name)) {
      let content = '';
      try {
        content = fs.readFileSync(absolute, 'utf8');
      } catch {
        continue;
      }
      if (MODULE_MOCK_RE.test(content)) {
        found.push(
          path.relative(CONFIG_DIR, absolute).split(path.sep).join('/'),
        );
      }
    }
  }
  return found;
}

const MODULE_MOCKING_SPECS = collectModuleMockingSpecs(
  path.join(CONFIG_DIR, 'src'),
);

// The isolated project's include list: every module-mocking spec plus the
// hand-listed non-mock leaks. Everything else stays in the fast shared project.
const LEAKY_SPECS = Array.from(
  new Set([...ALWAYS_ISOLATE, ...MODULE_MOCKING_SPECS]),
).sort((a, b) => a.localeCompare(b));

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
      // project would end up matching every spec instead of just the leaky set.
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
      // Specs that mock modules (or leak a global) can't share a registry, so
      // they run in a dedicated `isolated` project; everything else runs in the
      // fast `shared` project. Membership is computed above (LEAKY_SPECS) from a
      // content scan for `vi.mock`/`vi.doMock` plus the ALWAYS_ISOLATE list, so
      // it stays in sync automatically as specs add or drop module mocking.
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
