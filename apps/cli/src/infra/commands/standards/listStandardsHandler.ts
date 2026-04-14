import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';
import { groupArtefactBySpaces } from '../../utils/groupArtefactsBySpaces';

export type ListStandardsArgs = { space?: string };

export type ListStandardsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

export async function listStandardsHandler(
  args: ListStandardsArgs,
  deps: ListStandardsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    const spaces = await packmindCliHexa.output.withLoader(
      'Fetching spaces',
      () => packmindCliHexa.getSpaces(),
    );

    const matchedSpace = resolveSpaceFromArgs(args.space, spaces);

    if (args.space && !matchedSpace) {
      const availableSpaces = spaces
        .map((space) => ` - @${space.slug}`)
        .join('\n');
      packmindCliHexa.output.notifyError(`Space "@${args.space}" not found.`, {
        content: `Available spaces:\n${availableSpaces}`,
      });
      exit(1);
      return;
    }

    const standards = await packmindCliHexa.output.withLoader(
      'Fetching standards',
      () =>
        packmindCliHexa.listStandards(
          matchedSpace ? { spaceId: matchedSpace.id } : {},
        ),
    );

    if (standards.length === 0) {
      packmindCliHexa.output.notifyInfo(
        matchedSpace
          ? `No standards found in space "@${matchedSpace.slug}".`
          : 'No standards found.',
      );
      exit(0);
      return;
    }

    const groupedStandards = groupArtefactBySpaces(standards, spaces);
    const buildUrl = resolveUrlBuilder((id) => `standards/${id}/summary`);

    const scopedArtefacts = groupedStandards.map(({ space, artefacts }) => ({
      title: `Space: ${space.name}`,
      artefacts: artefacts.map((s) => ({
        title: s.name,
        slug: s.slug,
        url: buildUrl(space.slug, s.id),
      })),
    }));

    packmindCliHexa.output.listScopedArtefacts(
      `📋 Standards (${standards.length})`,
      scopedArtefacts,
    );
    exit(0);
  } catch (err) {
    packmindCliHexa.output.notifyError('Failed to list standards:', {
      content: err instanceof Error ? err.message : String(err),
    });
    exit(1);
  }
}
