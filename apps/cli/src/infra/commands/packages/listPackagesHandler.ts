import { Package, Space } from '@packmind/types';
import {
  formatCommand,
  formatLabel,
  formatSlug,
  logConsole,
  logErrorConsole,
  logInfoConsole,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder, UrlBuilder } from '../../utils/urlBuilderUtils';

export type ListPackagesArgs = { space?: string };

function logPackageEntry(
  pkg: Package,
  fullSlug: string,
  spaceSlug: string,
  buildUrl: UrlBuilder,
): void {
  logConsole(`- ${formatSlug(fullSlug)}`);
  logConsole(`    ${formatLabel('Name:')} ${pkg.name}`);
  const url = buildUrl(spaceSlug, pkg.id as string);
  if (url) {
    logConsole(`    ${formatLabel('Link:')} ${url}`);
  }
  if (pkg.description) {
    const lines = pkg.description
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const [first, ...rest] = lines;
    logConsole(`    ${formatLabel('Description:')} ${first}`);
    rest.forEach((l) => logConsole(`                 ${l}`));
  }
}

function groupPackagesBySpace(
  packages: Package[],
  spaces: Space[],
): Array<{ space: Space; pkgs: Package[] }> {
  const spaceMap = new Map<string, Space>(
    spaces.map((s) => [s.id as string, s]),
  );
  const groupsMap = new Map<string, { space: Space; pkgs: Package[] }>();

  for (const pkg of packages) {
    const space = spaceMap.get(pkg.spaceId as string);
    if (!space) {
      continue;
    }
    let group = groupsMap.get(space.id as string);
    if (!group) {
      group = { space, pkgs: [] };
      groupsMap.set(space.id as string, group);
    }
    group.pkgs.push(pkg);
  }

  return [...groupsMap.values()].sort((a, b) =>
    a.space.name.localeCompare(b.space.name),
  );
}

function displayGroupedPackages(
  packages: Package[],
  spaces: Space[],
  buildUrl: UrlBuilder,
): string {
  const groups = groupPackagesBySpace(packages, spaces);
  let firstSlug: string | null = null;

  for (const { space, pkgs } of groups) {
    logConsole(`Space "${space.name}":\n`);
    for (const pkg of [...pkgs].sort((a, b) => a.slug.localeCompare(b.slug))) {
      const fullSlug = `@${space.slug}/${pkg.slug}`;
      firstSlug ??= fullSlug;
      logPackageEntry(pkg, fullSlug, space.slug, buildUrl);
      logConsole('');
    }
  }

  return firstSlug ?? formatSlug(packages[0].slug);
}

export type ListHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

export async function listPackagesHandler(
  args: ListPackagesArgs,
  deps: ListHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logInfoConsole('Fetching available packages...');

    const allSpaces = await packmindCliHexa.getSpaces();

    if (!allSpaces || allSpaces.length === 0) {
      throw new Error('Unable to list organization spaces.');
    }

    const matchedSpace = resolveSpaceFromArgs(args.space, allSpaces);

    if (args.space && !matchedSpace) {
      logErrorConsole(`Space "@${args.space}" not found.`);
      logInfoConsole(
        `Available spaces: ${allSpaces.map((s) => `@${s.slug}`).join(', ')}`,
      );
      exit(1);
      return;
    }

    const packages = await packmindCliHexa.listPackages(
      matchedSpace ? { spaceId: matchedSpace.id } : {},
    );
    const spaces = matchedSpace ? [matchedSpace] : allSpaces;

    if (packages.length === 0) {
      logConsole(
        matchedSpace
          ? `No packages found in space "@${matchedSpace.slug}".`
          : 'No packages found.',
      );
      exit(0);
      return;
    }

    const buildUrl = resolveUrlBuilder((id) => `packages/${id}`);

    logConsole('\nAvailable packages:\n');

    const exampleSlug = displayGroupedPackages(packages, spaces, buildUrl);
    logConsole('How to install a package:\n');
    logConsole(`  ${formatCommand(`packmind-cli install ${exampleSlug}`)}`);
    exit(0);
  } catch (err) {
    logErrorConsole('Failed to list packages:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
  }
}
