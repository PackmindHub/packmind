import { type RouteConfig } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';
import { loadPluginRoutes } from '../src/plugins/loadPluginRoutes';
import { mergeRoutes } from '../src/shared/utils/mergeRoutes';

/**
 * Combines file-based routes with plugin routes.
 *
 * - File-based routes: Automatically discovered from app/routes/ via flatRoutes()
 * - Plugin routes: Loaded from plugin bundles via loadPluginRoutes()
 *
 * Plugin routes are merged with file-based routes using mergeRoutes(), which
 * ensures plugin routes are properly nested under their parent layout routes
 * (e.g., the protected layout for /org/:orgSlug/... routes).
 */
export default (async function routes(): Promise<RouteConfig> {
  const fileBasedRoutes = await flatRoutes();
  const pluginRoutes = await loadPluginRoutes();
  return mergeRoutes(fileBasedRoutes, pluginRoutes);
})();
