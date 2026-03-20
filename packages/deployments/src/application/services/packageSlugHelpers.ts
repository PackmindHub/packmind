/**
 * Parses a package slug to extract optional space prefix.
 * Format: "@space-slug/package-slug" or "package-slug"
 */
export function parsePackageSlug(slug: string): {
  spaceSlug: string | null;
  packageSlug: string;
} {
  if (slug.startsWith('@')) {
    const slashIndex = slug.indexOf('/', 1);
    if (slashIndex !== -1) {
      return {
        spaceSlug: slug.slice(1, slashIndex),
        packageSlug: slug.slice(slashIndex + 1),
      };
    }
  }
  return { spaceSlug: null, packageSlug: slug };
}
