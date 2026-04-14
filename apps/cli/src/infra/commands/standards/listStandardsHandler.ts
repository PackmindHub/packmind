import { Space } from '@packmind/types';
import { ListStandardsResult } from '../../../domain/useCases/IListStandardsUseCase';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';

type Standard = ListStandardsResult[number];

function groupStandardsBySpace(
  standards: Standard[],
  spaces: Space[],
): {
  groups: Array<{ space: Space; items: Standard[] }>;
  orphaned: Standard[];
} {
  const spaceMap = new Map<string, Space>(
    spaces.map((s) => [s.id as string, s]),
  );
  const groupsMap = new Map<string, { space: Space; items: Standard[] }>();
  const orphaned: Standard[] = [];

  for (const standard of standards) {
    const space = spaceMap.get(standard.spaceId);
    if (!space) {
      orphaned.push(standard);
      continue;
    }
    let group = groupsMap.get(space.id as string);
    if (!group) {
      group = { space, items: [] };
      groupsMap.set(space.id as string, group);
    }
    group.items.push(standard);
  }

  const groups = [...groupsMap.values()].sort((a, b) =>
    a.space.name.localeCompare(b.space.name),
  );
  return { groups, orphaned };
}

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

    const { groups } = groupStandardsBySpace(standards, spaces);
    const buildUrl = resolveUrlBuilder((id) => `standards/${id}/summary`);

    const scopedArtefacts = groups.map(({ space, items }) => ({
      title: `Space: ${space.name}`,
      artefacts: [...items]
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map((s) => ({
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
