export function parsePackageSlug(
  slug: string,
): { spaceSlug: string; pkgSlug: string } | null {
  if (!slug.startsWith('@')) return null;
  const slash = slug.indexOf('/', 1);
  if (slash === -1) return null;
  return { spaceSlug: slug.slice(1, slash), pkgSlug: slug.slice(slash + 1) };
}
