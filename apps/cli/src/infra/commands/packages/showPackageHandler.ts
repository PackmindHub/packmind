import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';
import { parsePackageSlug } from '../../utils/packageSlugUtils';

export type ShowPackageArgs = {
  slug: string;
};

export type ShowPackageHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

/**
 * Validates the slug against available spaces and packages, then returns
 * the fully-qualified @space/package slug ready for API use.
 *
 * When no space is specified, auto-resolves if the package exists in exactly
 * one space. Throws if the package exists in multiple spaces (ambiguous) or none.
 */
async function resolveFullSlug(
  slug: string,
  packmindCliHexa: PackmindCliHexa,
): Promise<string> {
  const [allPackages, allSpaces] = await Promise.all([
    packmindCliHexa.listPackages({}),
    packmindCliHexa.getSpaces(),
  ]);

  const parsed = parsePackageSlug(slug);

  if (parsed) {
    const { spaceSlug, pkgSlug } = parsed;

    const matchedSpace = allSpaces.find((s) => s.slug === spaceSlug);
    if (!matchedSpace) {
      throw new Error(`Space '@${spaceSlug}' not found.`);
    }

    const matchedPackage = allPackages.find(
      (p) => p.slug === pkgSlug && p.spaceId === matchedSpace.id,
    );
    if (!matchedPackage) {
      throw new Error(
        `Package '${pkgSlug}' not found in space '@${spaceSlug}'.`,
      );
    }

    return `@${spaceSlug}/${pkgSlug}`;
  }

  // No space specified — find all spaces that have this package
  const matches = allSpaces.filter((space) =>
    allPackages.some((p) => p.slug === slug && p.spaceId === space.id),
  );

  if (matches.length === 0) {
    throw new Error(`Package '${slug}' not found in any space.`);
  }

  if (matches.length > 1) {
    const example = `@${matches[0].slug}/${slug}`;
    throw new Error(
      `Package '${slug}' exists in multiple spaces (${matches.map((s) => `@${s.slug}`).join(', ')}). Please specify the space using the @space/package format (e.g. ${example}).`,
    );
  }

  return `@${matches[0].slug}/${slug}`;
}

export async function showPackageHandler(
  args: ShowPackageArgs,
  deps: ShowPackageHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logInfoConsole(`Fetching package details for '${args.slug}'...`);

    const fullSlug = await resolveFullSlug(args.slug, packmindCliHexa);
    const pkg = await packmindCliHexa.getPackageBySlug({ slug: fullSlug });

    logConsole(`\n${pkg.name} (${fullSlug}):\n`);

    if (pkg.description) {
      logConsole(`${pkg.description}\n`);
    }

    if (pkg.standards && pkg.standards.length > 0) {
      logConsole('Standards:');
      pkg.standards.forEach((standard) => {
        if (standard.summary) {
          logConsole(`  - ${standard.name}: ${standard.summary}`);
        } else {
          logConsole(`  - ${standard.name}`);
        }
      });
      logConsole('');
    }

    if (pkg.recipes && pkg.recipes.length > 0) {
      logConsole('Commands:');
      pkg.recipes.forEach((recipe) => {
        if (recipe.summary) {
          logConsole(`  - ${recipe.name}: ${recipe.summary}`);
        } else {
          logConsole(`  - ${recipe.name}`);
        }
      });
      logConsole('');
    }

    exit(0);
  } catch (err) {
    logErrorConsole('Failed to fetch package details:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
  }
}
