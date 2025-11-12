import type { RouteConfig } from '@react-router/dev/routes';
import { route } from '@react-router/dev/routes';

/**
 * RouteConfig is actually an array type, but TypeScript sees it as Promise.
 * After awaiting flatRoutes(), we get the actual array.
 */
type RouteConfigArray = Awaited<RouteConfig>;

/**
 * Merges file-based routes with plugin routes, ensuring plugin routes are
 * properly nested under their parent layout routes (e.g., protected layout).
 *
 * This function:
 * 1. Finds parent routes (layout routes) in file-based routes
 * 2. Explicitly nests plugin routes as children of their parent routes
 * 3. Returns the merged route tree with proper nesting
 *
 * @param fileBasedRoutes - Routes discovered from file system via flatRoutes() (already awaited)
 * @param pluginRoutes - Routes loaded from plugin bundles (already awaited)
 * @returns Merged RouteConfig with plugin routes properly nested
 */
export function mergeRoutes(
  fileBasedRoutes: RouteConfigArray,
  pluginRoutes: RouteConfigArray,
): RouteConfigArray {
  // If no plugin routes, return file-based routes as-is
  if (pluginRoutes.length === 0) {
    return fileBasedRoutes;
  }

  // Helper to extract path from a route
  const getRoutePath = (route: RouteConfigArray[number]): string | null => {
    if (typeof route === 'object' && route !== null) {
      return 'path' in route ? (route.path as string) : null;
    }
    return null;
  };

  // Helper to extract file from a route
  const getRouteFile = (route: RouteConfigArray[number]): string | null => {
    if (typeof route === 'object' && route !== null) {
      return 'file' in route ? (route.file as string) : null;
    }
    return null;
  };

  // Helper to check if a path is a child of another path
  const isChildOf = (childPath: string, parentPath: string): boolean => {
    // Normalize paths
    const normalizedChild = childPath.replace(/^\/+/, '').replace(/\/+$/, '');
    const normalizedParent = parentPath.replace(/^\/+/, '').replace(/\/+$/, '');

    // Check if child path starts with parent path
    if (!normalizedChild.startsWith(normalizedParent)) {
      return false;
    }

    // Ensure it's a direct child (not just a prefix match)
    const remaining = normalizedChild.slice(normalizedParent.length);
    return remaining !== '' && remaining.startsWith('/');
  };

  // Helper to find parent route for a plugin route
  const findParentRoute = (
    pluginRoute: RouteConfigArray[number],
    fileBasedRoutes: RouteConfigArray,
  ): { parent: RouteConfigArray[number]; index: number } | null => {
    const pluginPath = getRoutePath(pluginRoute);
    if (!pluginPath) return null;

    // Look for the best matching parent route (most specific)
    let bestMatch: {
      parent: RouteConfigArray[number];
      index: number;
      specificity: number;
    } | null = null;

    for (let i = 0; i < fileBasedRoutes.length; i++) {
      const route = fileBasedRoutes[i];
      const routePath = getRoutePath(route);

      if (!routePath) continue;

      // Check if this route is a parent of the plugin route
      if (isChildOf(pluginPath, routePath)) {
        // Calculate specificity (longer path = more specific parent)
        const specificity = routePath.split('/').length;

        if (!bestMatch || specificity > bestMatch.specificity) {
          bestMatch = { parent: route, index: i, specificity };
        }
      }
    }

    return bestMatch
      ? { parent: bestMatch.parent, index: bestMatch.index }
      : null;
  };

  // Create a map to track which routes have been modified (to avoid duplicates)
  const modifiedRoutes = new Set<number>();
  const mergedRoutes: RouteConfigArray = [...fileBasedRoutes];
  const pluginRoutesByParent = new Map<number, RouteConfigArray>();

  // Group plugin routes by their parent
  for (const pluginRoute of pluginRoutes) {
    const parentMatch = findParentRoute(pluginRoute, mergedRoutes);

    if (parentMatch) {
      // Group by parent index
      if (!pluginRoutesByParent.has(parentMatch.index)) {
        pluginRoutesByParent.set(parentMatch.index, []);
      }
      const parentRoutes = pluginRoutesByParent.get(parentMatch.index);
      if (parentRoutes) {
        parentRoutes.push(pluginRoute);
      }
      modifiedRoutes.add(parentMatch.index);
    }
  }

  // Modify parent routes to include plugin routes as children
  // Process in reverse order to maintain indices
  const sortedIndices = Array.from(modifiedRoutes).sort((a, b) => b - a);

  for (const parentIndex of sortedIndices) {
    const parent = mergedRoutes[parentIndex];
    const children = pluginRoutesByParent.get(parentIndex);
    if (!children) continue;

    if (typeof parent === 'object' && parent !== null) {
      const parentPath = getRoutePath(parent);
      const parentFile = getRouteFile(parent);

      if (parentPath && parentFile) {
        // Get existing children if any
        const existingChildren =
          'children' in parent && Array.isArray(parent.children)
            ? (parent.children as RouteConfigArray)
            : [];

        // Create new route with children using route() helper
        const parentWithChildren = route(parentPath, parentFile, [
          ...existingChildren,
          ...children,
        ]);

        // Replace the parent route
        mergedRoutes[parentIndex] = parentWithChildren;
      }
    }
  }

  // Add plugin routes that don't have a parent as top-level routes
  for (const pluginRoute of pluginRoutes) {
    const parentMatch = findParentRoute(pluginRoute, mergedRoutes);
    if (!parentMatch) {
      mergedRoutes.push(pluginRoute);
    }
  }

  return mergedRoutes;
}
