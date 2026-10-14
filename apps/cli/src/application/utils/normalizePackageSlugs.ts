import { ISpaceService } from '../../domain/services/ISpaceService';

export async function normalizePackageSlugs(
  slugs: string[],
  spaceService: ISpaceService,
): Promise<string[]> {
  const hasUnprefixed = slugs.some((s) => !s.startsWith('@'));
  if (!hasUnprefixed) return slugs;

  const spaces = await spaceService.getSpaces();

  if (spaces.length > 1) {
    throw new Error(
      `Your organization has multiple spaces. Please specify the space for each package using the @space/package format (e.g. @${spaces[0].slug}/my-package).`,
    );
  }

  const defaultSpace = await spaceService.getDefaultSpace();
  return slugs.map((slug) =>
    slug.startsWith('@') ? slug : `@${defaultSpace.slug}/${slug}`,
  );
}

export type NormalizedConfigPackages = {
  slugs: string[];
  versions: Record<string, string>;
  /** Whether any slug was respelled, i.e. packmind.json would need rewriting. */
  hasChanges: boolean;
};

/**
 * packmind.json's packages in `@space/package` form, with the version each one
 * records. The versions travel beside the slugs rather than inside them, so
 * normalizing a slug never loses what the repo pinned it to. Writes nothing.
 */
export async function normalizeConfigPackages(
  packages: Record<string, string>,
  spaceService: ISpaceService,
): Promise<NormalizedConfigPackages> {
  const originalSlugs = Object.keys(packages);
  if (originalSlugs.length === 0) {
    return { slugs: [], versions: {}, hasChanges: false };
  }

  const normalizedSlugs = await normalizePackageSlugs(
    originalSlugs,
    spaceService,
  );
  const versions: Record<string, string> = {};
  for (let i = 0; i < normalizedSlugs.length; i++) {
    versions[normalizedSlugs[i]] = packages[originalSlugs[i]];
  }

  return {
    slugs: normalizedSlugs,
    versions,
    hasChanges: normalizedSlugs.some((slug, i) => slug !== originalSlugs[i]),
  };
}
