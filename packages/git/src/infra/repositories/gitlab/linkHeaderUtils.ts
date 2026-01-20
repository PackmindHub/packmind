/**
 * Extracts the URL with rel="next" from an HTTP Link header.
 * Link header format (RFC 8288): <url>; rel="next", <url>; rel="prev"
 */
export function extractNextPageUrl(linkHeader: string): string | null {
  const links = linkHeader.split(',');
  for (const link of links) {
    if (link.includes('rel="next"')) {
      const urlStart = link.indexOf('<') + 1;
      const urlEnd = link.indexOf('>');
      if (urlStart > 0 && urlEnd > urlStart) {
        return link.substring(urlStart, urlEnd);
      }
    }
  }
  return null;
}
