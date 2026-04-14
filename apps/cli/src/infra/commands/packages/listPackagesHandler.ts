import { Package, Space } from '@packmind/types';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';

export type ListPackagesArgs = { space?: string };

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
    const allSpaces = await packmindCliHexa.output.withLoader(
      'Fetching spaces',
      () => packmindCliHexa.getSpaces(),
    );

    if (!allSpaces || allSpaces.length === 0) {
      throw new Error('Unable to list organization spaces.');
    }

    const matchedSpace = resolveSpaceFromArgs(args.space, allSpaces);

    if (args.space && !matchedSpace) {
      const availableSpaces = allSpaces.map((s) => ` - @${s.slug}`).join('\n');
      packmindCliHexa.output.notifyError(`Space "@${args.space}" not found.`, {
        content: `Available spaces:\n${availableSpaces}`,
      });
      exit(1);
      return;
    }

    const packages = await packmindCliHexa.output.withLoader(
      'Fetching packages',
      () =>
        packmindCliHexa.listPackages(
          matchedSpace ? { spaceId: matchedSpace.id } : {},
        ),
    );
    const spaces = matchedSpace ? [matchedSpace] : allSpaces;

    if (packages.length === 0) {
      packmindCliHexa.output.notifyInfo(
        matchedSpace
          ? `No packages found in space "@${matchedSpace.slug}".`
          : 'No packages found.',
      );
      exit(0);
      return;
    }

    const buildUrl = resolveUrlBuilder((id) => `packages/${id}`);
    const groups = groupPackagesBySpace(packages, spaces);

    const scopedArtefacts = groups.map(({ space, pkgs }) => ({
      title: `Space: ${space.name}`,
      artefacts: [...pkgs]
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map((pkg) => ({
          title: pkg.name,
          slug: `@${space.slug}/${pkg.slug}`,
          description: pkg.description,
          url: buildUrl(space.slug, pkg.id as string),
        })),
    }));

    const firstSlug =
      scopedArtefacts[0]?.artefacts[0]?.slug ?? `@${packages[0].slug}`;

    packmindCliHexa.output.listScopedArtefacts(
      `📦 Packages (${packages.length})`,
      scopedArtefacts,
      {
        content: 'How to install a package:',
        exampleCommand: `packmind-cli install ${firstSlug}`,
      },
    );
    exit(0);
  } catch (err) {
    packmindCliHexa.output.notifyError('Failed to list packages:', {
      content: err instanceof Error ? err.message : String(err),
    });
    exit(1);
  }
}
