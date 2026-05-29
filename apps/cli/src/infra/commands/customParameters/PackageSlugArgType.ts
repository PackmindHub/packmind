import { Type } from 'cmd-ts';

export type ParsedPackageSlug = {
  spaceSlug?: string;
  packageSlug: string;
};

export type FullParsedPackageSlug = {
  spaceSlug: string;
  packageSlug: string;
};

export function isFullParsedPackageSlug(
  tbd: unknown,
): tbd is FullParsedPackageSlug {
  const asFullParsedPackageSlug = tbd as FullParsedPackageSlug;
  return (
    asFullParsedPackageSlug.spaceSlug !== undefined &&
    asFullParsedPackageSlug.packageSlug !== undefined
  );
}

export function parsePackageSlug(slug: string): ParsedPackageSlug {
  const slugs = slug.split('/');

  if (slugs.length === 1) {
    return { packageSlug: slugs[0] };
  }

  if (slugs.length == 2) {
    return {
      spaceSlug: slugs[0].startsWith('@') ? slugs[0].slice(1) : slugs[0],
      packageSlug: slugs[1],
    };
  }

  throw new Error(`Invalid package syntax: ${slugs}`);
}

export const PackageSlugArgType: Type<string, ParsedPackageSlug> = {
  from: async (input) => parsePackageSlug(input),
};
