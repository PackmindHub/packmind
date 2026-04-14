import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';
import { groupArtefactBySpaces } from '../../utils/groupArtefactsBySpaces';

export type ListPackagesArgs = { space?: string };

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
    const groups = groupArtefactBySpaces(packages, spaces);

    const scopedArtefacts = groups.map(({ space, artefacts }) => ({
      title: `Space: ${space.name}`,
      artefacts: artefacts.map((pkg) => ({
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
