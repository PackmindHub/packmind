import { type RouteConfig } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';

// Co-located specs live next to the route modules they cover, but flatRoutes
// globs everything under app/routes and would otherwise register them as real
// routes. That pulls the whole test toolchain (@testing-library/*, aria-query,
// jest-dom) into the production client build as reachable route chunks.
export default flatRoutes({
  ignoredRouteFiles: ['**/*.spec.*', '**/*.test.*', '**/__tests__/**'],
}) satisfies RouteConfig;
