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
