import { Package, Space, SummarizedArtifact } from '@packmind/types';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';

export type ShowPackageArgs = {
  slug: string;
};

export type ShowPackageHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

type ResolvedPackageRef = {
  spaceSlug: string;
  pkgSlug: string;
};

/**
 * Parses a slug into its space and package parts.
 * `@global/backend` → `{ spaceSlug: 'global', pkgSlug: 'backend' }`
 * `backend` → needs space resolution
 */
function parseSlug(slug: string): ResolvedPackageRef | null {
  if (!slug.startsWith('@')) return null;
  const slash = slug.indexOf('/', 1);
  if (slash === -1) return null;
  return { spaceSlug: slug.slice(1, slash), pkgSlug: slug.slice(slash + 1) };
}

/**
 * Resolves the space and package slugs, fetching spaces/packages as needed.
 * Returns { spaceSlug, pkgSlug, matchedSpace, matchedPackage }.
 */
async function resolvePackage(
  slug: string,
  packmindCliHexa: PackmindCliHexa,
): Promise<{ spaceSlug: string; pkgSlug: string; matchedPackage: Package }> {
  const [allPackages, allSpaces] = await Promise.all([
    packmindCliHexa.listPackages({}),
    packmindCliHexa.getSpaces(),
  ]);

  const parsed = parseSlug(slug);

  let spaceSlug: string;
  let pkgSlug: string;
  let matchedSpace: Space;

  if (parsed) {
    spaceSlug = parsed.spaceSlug;
    pkgSlug = parsed.pkgSlug;

    const found = allSpaces.find((s) => s.slug === spaceSlug);
    if (!found) {
      throw new Error(`Space '${spaceSlug}' not found.`);
    }
    matchedSpace = found;
  } else {
    pkgSlug = slug;

    if (allSpaces.length > 1) {
      const example = `@${allSpaces[0].slug}/${slug}`;
      throw new Error(
        `Your organization has multiple spaces. Please specify the space using the @space/package format (e.g. ${example}).`,
      );
    }

    matchedSpace = allSpaces[0];
    spaceSlug = matchedSpace.slug;
  }

  const matchedPackage = allPackages.find(
    (p) => p.slug === pkgSlug && p.spaceId === matchedSpace.id,
  );

  if (!matchedPackage) {
    throw new Error(`Package '${pkgSlug}' not found in space '${spaceSlug}'.`);
  }

  return { spaceSlug, pkgSlug, matchedPackage };
}

export async function showPackageHandler(
  args: ShowPackageArgs,
  deps: ShowPackageHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logInfoConsole(`Fetching package details for '${args.slug}'...`);

    const { spaceSlug, pkgSlug } = await resolvePackage(
      args.slug,
      packmindCliHexa,
    );

    const fullSlug = `@${spaceSlug}/${pkgSlug}`;
    const pkg = await packmindCliHexa.getPackageBySlug({ slug: pkgSlug });

    logConsole(`\n${pkg.name} (${fullSlug}):\n`);

    if (pkg.description) {
      logConsole(`${pkg.description}\n`);
    }

    if (pkg.standards && pkg.standards.length > 0) {
      logConsole('Standards:');
      pkg.standards.forEach((standard: SummarizedArtifact) => {
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
      pkg.recipes.forEach((recipe: SummarizedArtifact) => {
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
