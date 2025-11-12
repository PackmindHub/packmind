import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import Checker from 'vite-plugin-checker';
import path from 'path';
import { pluginRoutes } from './vite-plugin-plugin-routes';

export default defineConfig(() => {
  // Determine edition mode
  const isOssMode = process.env.PACKMIND_EDITION === 'oss';

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

  if (process.env.MCP_HOSTNAME && process.env.MCP_PORT) {
    proxy['/mcp'] = {
      target: `http://${process.env.MCP_HOSTNAME}:${process.env.MCP_PORT}`,
      changeOrigin: true,
      ws: true,
    };
  }

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/frontend',
    assetsInclude: ['**/*.svg', '**/*.png'],
    define: {
      __PACKMIND_EDITION__: JSON.stringify(
        process.env.PACKMIND_EDITION || 'proprietary',
      ),
    },
    resolve: {
      alias: resolveAliases,
    },
    server: {
      port: 4200,
      host: 'localhost',
      allowedHosts: ['frontend'],
      proxy,
    },
    preview: {
      port: 4200,
      host: 'localhost',
    },
    plugins: [
      pluginRoutes(), // Load plugin routes at build time and write to routes.plugins.ts
      reactRouter(),
      nxViteTsPaths(),
      nxCopyAssetsPlugin(['*.md']),
      Checker({ typescript: true }),
    ],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    build: {
      outDir: '../../dist/apps/frontend',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Group public authentication routes together
            if (id.includes('app/routes/_public')) {
              return 'routes-public-auth';
            }

            // Group organization analytics and deployments
            if (
              id.includes('app/routes/org.$orgSlug._protected.analytics') ||
              id.includes('app/routes/org.$orgSlug._protected.deployments') ||
              id.includes(
                'app/routes/org.$orgSlug._protected.account-settings',
              ) ||
              id.includes('app/routes/org.$orgSlug._protected.error-demo')
            ) {
              return 'routes-org-analytics';
            }

            // Group organization settings routes
            if (id.includes('app/routes/org.$orgSlug._protected.settings')) {
              return 'routes-org-settings';
            }

            // Group organization artifacts (dashboard, recipes and standards)
            if (
              id.includes('app/routes/org.$orgSlug._protected._index') ||
              id.includes('_space-protected.recipes') ||
              id.includes('_space-protected.standards')
            ) {
              return 'routes-org-artifacts';
            }
          },
        },
      },
    },
    test: {
      watch: false,
      globals: true,
      environment: 'jsdom',
      include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/apps/frontend',
        provider: 'v8' as const,
      },
    },
  };
});
