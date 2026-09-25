import {
  PackageVersionSpec,
  formatPackageVersionSpec,
  parsePackageVersionSpec,
  splitPackageRef,
} from '@packmind/types';

export type ParsedPackageSlug = {
  spaceSlug?: string;
  packageSlug: string;
  /**
   * The version typed after the slug, or undefined when none was.
   *
   * Undefined is not the wildcard: `install @space/ops` asks for the newest
   * release and records the version it gets, while `install @space/ops:*`
   * asks to follow the package wherever it goes.
   */
  versionSpec?: PackageVersionSpec;
};

export type FullParsedPackageSlug = {
  spaceSlug: string;
  packageSlug: string;
  versionSpec?: PackageVersionSpec;
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

export function parsePackageSlug(ref: string): ParsedPackageSlug {
  const { slug, rawSpec } = splitPackageRef(ref);
  const slugs = slug.split('/');

  let versionSpec: PackageVersionSpec | undefined;
  if (rawSpec !== null) {
    const parsed = parsePackageVersionSpec(rawSpec);
    if (!parsed) {
      throw new Error(
        `Invalid version "${rawSpec}" for ${slug}. Use an exact version like 1.2.3, or "*" to follow the package as it changes.`,
      );
    }
    versionSpec = parsed;
  }

  if (slugs.length === 1) {
    return { packageSlug: slugs[0], versionSpec };
  }

  if (slugs.length == 2) {
    return {
      spaceSlug: slugs[0].startsWith('@') ? slugs[0].slice(1) : slugs[0],
      packageSlug: slugs[1],
      versionSpec,
    };
  }

  throw new Error(`Invalid package syntax: ${slugs}`);
}

/** The slug alone — never the version, which travels beside it, not in it. */
export function displayableParsedPackageSlug(
  parsedPackageSlug: ParsedPackageSlug,
) {
  if (isFullParsedPackageSlug(parsedPackageSlug)) {
    return `@${parsedPackageSlug.spaceSlug}/${parsedPackageSlug.packageSlug}`;
  }
  return parsedPackageSlug.packageSlug;
}

/** The slug with its version, as a user would type it back. */
export function displayableParsedPackageRef(
  parsedPackageSlug: ParsedPackageSlug,
) {
  const slug = displayableParsedPackageSlug(parsedPackageSlug);
  return parsedPackageSlug.versionSpec
    ? `${slug}:${formatPackageVersionSpec(parsedPackageSlug.versionSpec)}`
    : slug;
}
