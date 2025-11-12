import { type RouteConfig } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';

/**
 * flatRoutes() automatically scans app/routes/ directory and includes:
 * - File-based routes (manually created route files in app/routes/)
 * - Plugin routes (auto-generated with plugin- prefix by vite-plugin-plugin-routes.ts)
 *
 * Plugin routes are generated with a plugin- prefix (e.g., plugin-org.$orgSlug.feature.tsx)
 * and are gitignored, keeping auto-generated files out of the source tree.
 */
export default flatRoutes() satisfies RouteConfig;
