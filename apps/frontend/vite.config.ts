import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import Checker from 'vite-plugin-checker';
import path from 'path';

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
      // Resolve external dependencies from plugin bundles to main app's node_modules
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    optimizeDeps: {
      // Include plugin bundle dependencies in optimization
      include: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    server: {
      port: 4200,
      host: 'localhost',
      allowedHosts: ['frontend'],
      proxy,
      fs: {
        // Allow serving files from plugins directory and packages (for assets)
        allow: ['..', '../../packages'],
      },
    },
    preview: {
      port: 4200,
      host: 'localhost',
    },
    plugins: [
      // Plugin to serve plugin bundles from plugins/ directory
      // This MUST run BEFORE React Router to intercept /plugins/* requests
      {
        name: 'serve-plugins',
        enforce: 'pre', // Run before other plugins
        configureServer(server) {
          const fs = require('fs');
          // Add middleware that handles /plugins/* requests
          server.middlewares.use('/plugins', (req, res, next) => {
            // If the request has query parameters (like ?import), let Vite handle it
            // Vite needs to process these to resolve external dependencies
            if (req.url?.includes('?')) {
              return next();
            }

            // For direct file requests without query params, serve the file
            const urlPath = req.url || '';
            const pluginsDir = path.resolve(__dirname, '../../plugins');
            const filePath = path.join(pluginsDir, urlPath);
            try {
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const fileContent = fs.readFileSync(filePath);
                const ext = path.extname(filePath);
                const contentType =
                  ext === '.mjs'
                    ? 'application/javascript; charset=utf-8'
                    : ext === '.json'
                      ? 'application/json; charset=utf-8'
                      : 'text/plain; charset=utf-8';
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'no-cache');
                res.end(fileContent);
                return; // Don't call next() - we handled the request
              }
            } catch (err) {
              // Log error but continue to next middleware
              console.warn(
                '[serve-plugins] Error serving file:',
                filePath,
                err,
              );
            }
            next();
          });
        },
        // Configure Vite to process plugin bundles and resolve external dependencies
        resolveId(id) {
          if (id.startsWith('/plugins/')) {
            // Resolve plugin bundle paths to actual file system paths
            const pluginsDir = path.resolve(__dirname, '../../plugins');
            const relativePath = id.replace('/plugins/', '');
            const filePath = path.join(pluginsDir, relativePath);
            try {
              const fs = require('fs');
              if (fs.existsSync(filePath)) {
                return filePath;
              }
            } catch {
              // Ignore errors
            }
          }
          return null;
        },
        // Transform plugin bundles to resolve external dependencies
        load(id) {
          if (id.includes('/plugins/') && id.endsWith('.mjs')) {
            // Read the bundle file
            const fs = require('fs');
            try {
              const code = fs.readFileSync(id, 'utf-8');
              // Transform bare module specifiers to use Vite's resolution
              // This allows external dependencies like 'react-router' to be resolved
              const transformedCode = code.replace(
                /import\s+([^"']+)\s+from\s+["'](react-router|react|react-dom|@packmind\/ui|@packmind\/types)["']/g,
                (match, imports, moduleName) => {
                  // Keep the import but let Vite resolve it
                  return match;
                },
              );
              return transformedCode;
            } catch {
              return null;
            }
          }
          return null;
        },
      },
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
