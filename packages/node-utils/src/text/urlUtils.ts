/**
 * Removes trailing slash from a URL if present
 * @param url The URL to normalize
 * @returns URL without trailing slash
 */
export function removeTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
