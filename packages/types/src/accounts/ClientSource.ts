/**
 * Identifies the source of an API request based on the authentication method used.
 * - 'ui': Request authenticated via session cookie (browser-based)
 * - 'cli': Request authenticated via API Key (CLI or programmatic access)
 */
export type ClientSource = 'ui' | 'cli';
