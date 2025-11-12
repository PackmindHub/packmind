/* eslint-disable @nx/enforce-module-boundaries */
// This file runs at build time in Node.js, so it can import from node-utils
import type { Plugin } from 'vite';
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  unlinkSync,
} from 'fs';
import { join, resolve, dirname, relative } from 'path';
import type { PluginManifest } from '@packmind/node-utils';

/**
 * Vite plugin to generate plugin route files.
 *
 * Plugin routes are generated in app/routes/ with a plugin- prefix (e.g., plugin-org.$orgSlug.feature.tsx)
 * to keep them clearly identifiable as auto-generated. These files are gitignored.
 * flatRoutes() automatically discovers all route files in app/routes/, including plugin routes.
 */
export function pluginRoutes(): Plugin {
  // Generate plugin routes directly in app/routes/ with a plugin- prefix
  // This ensures flatRoutes() discovers them, and the prefix makes them clearly auto-generated
  const ROUTES_DIR = resolve(__dirname, 'app/routes');
  let pluginDir: string;

  function resolvePluginDirectory(): string {
    const envDir = process.env['PACKMIND_PLUGINS_DIR'];
    if (envDir) {
      return resolve(envDir);
    }
    // Resolve from monorepo root (two levels up from apps/frontend)
    const monorepoRoot = resolve(__dirname, '../..');
    // Check plugins/ first (development), then dist/plugins/ (production)
    const pluginsDir = resolve(monorepoRoot, 'plugins');
    const distPluginsDir = resolve(monorepoRoot, 'dist/plugins');

    if (existsSync(pluginsDir) && statSync(pluginsDir).isDirectory()) {
      return pluginsDir;
    }
    if (existsSync(distPluginsDir) && statSync(distPluginsDir).isDirectory()) {
      return distPluginsDir;
    }
    // Default to plugins/ even if it doesn't exist yet
    return pluginsDir;
  }

  function routePathToFilePath(routePath: string): string {
    // Convert route path like "/org/:orgSlug/my-feature" to file path like "org.$orgSlug.my-feature.tsx"
    const pathParts = routePath
      .replace(/^\/+/, '') // Remove leading slashes
      .split('/')
      .map((part) => {
        if (part.startsWith(':')) {
          // Convert :param to $param (React Router v7 convention)
          return `$${part.slice(1)}`;
        }
        if (part === '*') {
          return 'splat';
        }
        return part;
      });
    return pathParts.join('.') + '.tsx';
  }

  function generatePluginRoutes() {
    // Clean existing auto-generated plugin route files
    if (existsSync(ROUTES_DIR)) {
      const existingFiles = readdirSync(ROUTES_DIR, {
        recursive: true,
        withFileTypes: true,
      });
      for (const file of existingFiles) {
        if (
          file.isFile() &&
          (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))
        ) {
          const filePath = join(file.parentPath || ROUTES_DIR, file.name);
          try {
            const content = readFileSync(filePath, 'utf-8');
            // Only delete auto-generated plugin route files (identified by the comment)
            if (content.includes('Auto-generated route file for plugin:')) {
              unlinkSync(filePath);
            }
          } catch {
            // Ignore errors
          }
        }
      }
    }

    pluginDir = resolvePluginDirectory();

    if (!existsSync(pluginDir) || !statSync(pluginDir).isDirectory()) {
      return;
    }

    const entries = readdirSync(pluginDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const pluginPath = join(pluginDir, entry.name);
      const manifestPath = join(pluginPath, 'manifest.json');

      if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) {
        continue;
      }

      let manifest: PluginManifest;
      try {
        const manifestContent = readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
      } catch (error) {
        console.error(`Failed to parse manifest.json in ${pluginPath}:`, error);
        continue;
      }

      if (!manifest.frontend || !manifest.frontend.routes) {
        continue;
      }

      const bundlePath = join(pluginPath, manifest.frontend.bundle);
      if (!existsSync(bundlePath) || !statSync(bundlePath).isFile()) {
        console.warn(
          `Frontend bundle not found for plugin ${manifest.name}: ${bundlePath}`,
        );
        continue;
      }

      // Generate route file for each route
      for (const routeConfig of manifest.frontend.routes) {
        const fileName = routePathToFilePath(routeConfig.path);
        // Use the correct filename (no prefix) so the route path matches the manifest
        // The file will be gitignored via the pattern in .gitignore
        const routeFilePath = join(ROUTES_DIR, fileName);

        // Ensure parent directory exists
        const routeFileDir = dirname(routeFilePath);
        if (!existsSync(routeFileDir)) {
          mkdirSync(routeFileDir, { recursive: true });
        }

        // Calculate relative path from route file to bundle
        const relativeBundlePath = relative(routeFileDir, bundlePath);

        const routeFileContent = `/**
 * Auto-generated route file for plugin: ${manifest.id}
 * Route path: ${routeConfig.path}
 * 
 * DO NOT EDIT - This file is generated by vite-plugin-plugin-routes.ts
 * It is located in app/routes/ with a plugin- prefix and automatically discovered by flatRoutes().
 */

/* eslint-disable @nx/enforce-module-boundaries */
// This file imports from external plugin bundles, which is intentional

import { lazy } from 'react';
import type { LoaderFunctionArgs } from 'react-router';

// Dynamically import component from plugin bundle
const ${routeConfig.component} = lazy(() => 
  // @ts-expect-error - Plugin bundle is external and doesn't have type declarations
  import(/* @vite-ignore */ '${relativeBundlePath}').then(module => ({ 
    default: module.${routeConfig.component} 
  }))
);

${
  routeConfig.loader
    ? `// Loader function that imports from plugin bundle
export async function clientLoader(args: LoaderFunctionArgs) {
  // @ts-expect-error - Plugin bundle is external and doesn't have type declarations
  const module = await import(/* @vite-ignore */ '${relativeBundlePath}');
  return module.${routeConfig.loader}(args);
}
`
    : ''
}

export default ${routeConfig.component};
`;

        writeFileSync(routeFilePath, routeFileContent);
      }
    }
  }

  return {
    name: 'plugin-routes',
    enforce: 'pre', // Run before other plugins (especially reactRouter)
    buildStart() {
      // Generate plugin route files at build start
      generatePluginRoutes();
    },
    configureServer(server) {
      // Also generate in dev mode when server starts
      generatePluginRoutes();
      // Watch plugin directory for changes (if it exists)
      pluginDir = resolvePluginDirectory();
      if (pluginDir && existsSync(pluginDir)) {
        server.watcher.add(pluginDir);
      }
    },
  };
}
