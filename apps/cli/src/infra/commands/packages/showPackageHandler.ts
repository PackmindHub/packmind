import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';
import { parsePackageSlug } from '../../utils/packageSlugUtils';
import { IGetPackageSummaryResult } from '../../../domain/useCases/IGetPackageSummaryUseCase';

export type ShowPackageArgs = {
  slug: string;
};

export type ShowPackageHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

/**
 * Resolves the slug to a package summary and its fully-qualified display slug.
 *
 * For qualified slugs (@space/pkg): validates the space exists, then fetches the
 * package from that specific space.
 *
 * For unqualified slugs: probes each space in parallel via getPackageBySlug.
 * Auto-resolves when the package exists in exactly one space. Throws if ambiguous
 * (multiple spaces) or not found.
 */
function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('does not exist');
}

async function resolvePackage(
  slug: string,
  packmindCliHexa: PackmindCliHexa,
): Promise<{ pkg: IGetPackageSummaryResult; fullSlug: string }> {
  const allSpaces = await packmindCliHexa.getSpaces();

  const parsed = parsePackageSlug(slug);

  if (parsed) {
    const { spaceSlug, pkgSlug } = parsed;

    const matchedSpace = allSpaces.find((s) => s.slug === spaceSlug);
    if (!matchedSpace) {
      throw new Error(`Space '@${spaceSlug}' not found.`);
    }

    let pkg: IGetPackageSummaryResult;
    try {
      pkg = await packmindCliHexa.getPackageBySlug({
        slug: pkgSlug,
        spaceId: matchedSpace.id,
      });
    } catch (err) {
      if (isNotFoundError(err)) {
        throw new Error(
          `Package '${pkgSlug}' not found in space '@${spaceSlug}'.`,
        );
      }
      throw err;
    }

    return { pkg, fullSlug: `@${spaceSlug}/${pkgSlug}` };
  }

  // Unqualified slug — probe each space in parallel
  const results = await Promise.allSettled(
    allSpaces.map(async (space) => ({
      pkg: await packmindCliHexa.getPackageBySlug({
        slug,
        spaceId: space.id,
      }),
      spaceSlug: space.slug,
    })),
  );

  const matches = results
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<{
        pkg: IGetPackageSummaryResult;
        spaceSlug: string;
      }> => r.status === 'fulfilled',
    )
    .map((r) => r.value);

  if (matches.length === 0) {
    const realError = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .find((r) => !isNotFoundError(r.reason));
    if (realError) {
      throw realError.reason;
    }
    throw new Error(`Package '${slug}' not found in any space.`);
  }

  if (matches.length > 1) {
    const example = `@${matches[0].spaceSlug}/${slug}`;
    throw new Error(
      `Package '${slug}' exists in multiple spaces (${matches.map((m) => `@${m.spaceSlug}`).join(', ')}). Please specify the space using the @space/package format (e.g. ${example}).`,
    );
  }

  return {
    pkg: matches[0].pkg,
    fullSlug: `@${matches[0].spaceSlug}/${slug}`,
  };
}

export async function showPackageHandler(
  args: ShowPackageArgs,
  deps: ShowPackageHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logInfoConsole(`Fetching package details for '${args.slug}'...`);

    const { pkg, fullSlug } = await resolvePackage(args.slug, packmindCliHexa);

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
