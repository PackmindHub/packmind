import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';
import { IGetPackageSummaryResult } from '../../../domain/useCases/IGetPackageSummaryUseCase';
import {
  displayableParsedPackageSlug,
  isFullParsedPackageSlug,
  ParsedPackageSlug,
} from '../../../domain/entities/PackageSlug';

export type ShowPackageArgs = {
  slug: ParsedPackageSlug;
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
  slug: ParsedPackageSlug,
  packmindCliHexa: PackmindCliHexa,
): Promise<{ pkg: IGetPackageSummaryResult; fullSlug: string }> {
  const allSpaces = await packmindCliHexa.getSpaces();

  if (isFullParsedPackageSlug(slug)) {
    const { spaceSlug, packageSlug } = slug;

    const matchedSpace = allSpaces.find((s) => s.slug === spaceSlug);
    if (!matchedSpace) {
      throw new Error(`Space '@${spaceSlug}' not found.`);
    }

    let pkg: IGetPackageSummaryResult;
    try {
      pkg = await packmindCliHexa.getPackageBySlug({
        slug: packageSlug,
        spaceId: matchedSpace.id,
      });
    } catch (err) {
      if (isNotFoundError(err)) {
        throw new Error(
          `Package '${packageSlug}' not found in space '@${spaceSlug}'.`,
        );
      }
      throw err;
    }

    return { pkg, fullSlug: `@${spaceSlug}/${packageSlug}` };
  }

  // Unqualified slug — probe each space in parallel
  const results = await Promise.allSettled(
    allSpaces.map(async (space) => ({
      pkg: await packmindCliHexa.getPackageBySlug({
        slug: slug.packageSlug,
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
    throw new Error(`Package '${slug.packageSlug}' not found in any space.`);
  }

  if (matches.length > 1) {
    const example = `@${matches[0].spaceSlug}/${slug.packageSlug}`;
    throw new Error(
      `Package '${slug.packageSlug}' exists in multiple spaces (${matches.map((m) => `@${m.spaceSlug}`).join(', ')}). Please specify the space using the @space/package format (e.g. ${example}).`,
    );
  }

  return {
    pkg: matches[0].pkg,
    fullSlug: `@${matches[0].spaceSlug}/${slug.packageSlug}`,
  };
}

export async function showPackageHandler(
  args: ShowPackageArgs,
  deps: ShowPackageHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logInfoConsole(
      `Fetching package details for '${displayableParsedPackageSlug(args.slug)}'...`,
    );

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

    if (pkg.skills && pkg.skills.length > 0) {
      logConsole('Skills:');
      pkg.skills.forEach((skill) => {
        if (skill.summary) {
          logConsole(`  - ${skill.name}: ${skill.summary}`);
        } else {
          logConsole(`  - ${skill.name}`);
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
