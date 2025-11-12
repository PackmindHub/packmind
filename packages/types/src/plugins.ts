/**
 * Plugin system types shared between plugins and the main application.
 * These types define the contract for how plugins can inject content into the app.
 */

/**
 * Navigation item that can be added to the sidebar by plugins.
 */
export interface PluginNavigationItem {
  /**
   * Route path (supports :orgSlug substitution, e.g., "/org/:orgSlug/plugin-feature")
   */
  path: string;
  /**
   * Display label for the navigation item
   */
  label: string;
  /**
   * Optional icon - can be a React element or string identifier
   * Note: Icons are typically React elements created at runtime
   */
  icon?: unknown;
  /**
   * Whether the route should match exactly
   */
  exact?: boolean;
}

/**
 * Content that can be injected into a named outlet.
 */
export interface PluginOutletContent {
  /**
   * React component for complex content (e.g., dashboard widgets)
   * Note: Components are loaded dynamically at runtime
   */
  component?: unknown;
  /**
   * Data for hooks (e.g., navigation items array)
   */
  data?: unknown;
}

/**
 * Map of outlet names to their content arrays.
 * Plugins export this structure via getPluginOutlets().
 */
export type PluginOutlets = Record<string, PluginOutletContent[]>;
