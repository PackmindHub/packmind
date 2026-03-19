export type ParsedPackageSlug = { spaceSlug: string; pkgSlug: string };

export function parsePackageSlug(slug: string): ParsedPackageSlug | null {
  if (!slug.startsWith('@')) return null;
  const slash = slug.indexOf('/', 1);
  if (slash === -1) return null;
  return { spaceSlug: slug.slice(1, slash), pkgSlug: slug.slice(slash + 1) };
}
