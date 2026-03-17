import { Package, Space } from '@packmind/types';
import { formatSlug, formatLabel } from '../../utils/consoleLogger';
import { loadApiKey, decodeApiKey } from '../../utils/credentials';
import { InstallHandlerDependencies } from '../installPackagesHandler';

function buildPackageUrl(
  host: string,
  orgSlug: string,
  spaceSlug: string,
  packageId: string,
): string {
  return `${host}/org/${orgSlug}/space/${spaceSlug}/packages/${packageId}`;
}

export type ListPackagesArgs = Record<string, never>;

type UrlBuilder = (spaceSlug: string, id: string) => string | null;

function resolveUrlBuilder(): UrlBuilder {
  const apiKey = loadApiKey();
  if (!apiKey) return () => null;
  const decoded = decodeApiKey(apiKey);
  const orgSlug = decoded?.jwt?.organization?.slug;
  if (!decoded?.host || !orgSlug) return () => null;
  return (spaceSlug, id) =>
    buildPackageUrl(decoded.host, orgSlug, spaceSlug, id);
}

function logPackageEntry(
  pkg: Package,
  fullSlug: string,
  spaceSlug: string,
  buildUrl: UrlBuilder,
  log: (msg: string) => void,
): void {
  log(`- ${formatSlug(fullSlug)}`);
  log(`    ${formatLabel('Name:')} ${pkg.name}`);
  const url = buildUrl(spaceSlug, pkg.id as string);
  if (url) {
    log(`    ${formatLabel('Link:')} ${url}`);
  }
  if (pkg.description) {
    const lines = pkg.description
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const [first, ...rest] = lines;
    log(`    ${formatLabel('Description:')} ${first}`);
    rest.forEach((l) => log(`                 ${l}`));
  }
}

function groupPackagesBySpace(
  packages: Package[],
  spaces: Space[],
): { groups: Array<{ space: Space; pkgs: Package[] }>; orphaned: Package[] } {
  const spaceMap = new Map<string, Space>(
    spaces.map((s) => [s.id as string, s]),
  );
  const groupsMap = new Map<string, { space: Space; pkgs: Package[] }>();
  const orphaned: Package[] = [];

  for (const pkg of packages) {
    const space = spaceMap.get(pkg.spaceId as string);
    if (!space) {
      orphaned.push(pkg);
      continue;
    }
    let group = groupsMap.get(space.id as string);
    if (!group) {
      group = { space, pkgs: [] };
      groupsMap.set(space.id as string, group);
    }
    group.pkgs.push(pkg);
  }

  const groups = [...groupsMap.values()].sort((a, b) =>
    a.space.name.localeCompare(b.space.name),
  );
  return { groups, orphaned };
}

function displayGroupedPackages(
  packages: Package[],
  spaces: Space[],
  buildUrl: UrlBuilder,
  log: (msg: string) => void,
): string {
  const { groups, orphaned } = groupPackagesBySpace(packages, spaces);
  let firstSlug: string | null = null;

  for (const { space, pkgs } of groups) {
    log(`Space "${space.name}":\n`);
    for (const pkg of [...pkgs].sort((a, b) => a.slug.localeCompare(b.slug))) {
      const fullSlug = `@${space.slug}/${pkg.slug}`;
      firstSlug ??= fullSlug;
      logPackageEntry(pkg, fullSlug, space.slug, buildUrl, log);
      log('');
    }
  }

  for (const pkg of [...orphaned].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  )) {
    firstSlug ??= pkg.slug;
    logPackageEntry(pkg, pkg.slug, 'global', buildUrl, log);
    log('');
  }

  return firstSlug ?? formatSlug(packages[0].slug);
}

function displayFlatPackages(
  packages: Package[],
  buildUrl: UrlBuilder,
  log: (msg: string) => void,
): string {
  const sorted = [...packages].sort((a, b) => a.slug.localeCompare(b.slug));
  sorted.forEach((pkg, index) => {
    logPackageEntry(pkg, formatSlug(pkg.slug), 'global', buildUrl, log);
    if (index < sorted.length - 1) {
      log('');
    }
  });
  return formatSlug(sorted[0].slug);
}

export async function listPackagesHandler(
  _args: ListPackagesArgs,
  deps: InstallHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

  try {
    log('Fetching available packages...\n');
    const [packages, spaces] = await Promise.all([
      packmindCliHexa.listPackages({}),
      packmindCliHexa.getSpaces().catch(() => null),
    ]);

    if (packages.length === 0) {
      log('No packages found.');
      exit(0);
      return;
    }

    const buildUrl = resolveUrlBuilder();

    log('Available packages:\n');

    let exampleSlug: string;
    if (spaces && spaces.length > 0) {
      exampleSlug = displayGroupedPackages(packages, spaces, buildUrl, log);
      log('How to install a package:\n');
    } else {
      exampleSlug = displayFlatPackages(packages, buildUrl, log);
      log('\nHow to install a package:\n');
    }

    log(`  $ packmind-cli install ${exampleSlug}`);
    exit(0);
  } catch (err) {
    error('\n❌ Failed to list packages:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}
