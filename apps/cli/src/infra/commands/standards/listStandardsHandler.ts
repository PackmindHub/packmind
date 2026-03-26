import { Space } from '@packmind/types';
import { ListStandardsResult } from '../../../domain/useCases/IListStandardsUseCase';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  formatSlug,
  formatLabel,
  formatHeader,
  logConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder, UrlBuilder } from '../../utils/urlBuilderUtils';

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

function displayGroupedStandards(
  standards: Standard[],
  spaces: Space[],
  buildUrl: UrlBuilder,
): void {
  const { groups, orphaned } = groupStandardsBySpace(standards, spaces);

  for (const { space, items } of groups) {
    logConsole(`Space "${space.name}":\n`);
    for (const standard of [...items].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    )) {
      logConsole(`  ${formatSlug(standard.slug)}`);
      logConsole(`  ${formatLabel('Name:')}  ${standard.name}`);
      if (standard.description) {
        const descriptionLines = standard.description
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const firstLine = descriptionLines[0];
        if (firstLine) {
          const truncated =
            firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
          logConsole(`  ${formatLabel('Desc:')}  ${truncated}`);
        }
      }
      const url = buildUrl(space.slug, standard.id);
      if (url) {
        logConsole(`  ${formatLabel('Link:')}  ${url}`);
      }
      logConsole('');
    }
  }

  for (const standard of [...orphaned].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  )) {
    logConsole(`  ${formatSlug(standard.slug)}`);
    logConsole(`  ${formatLabel('Name:')}  ${standard.name}`);
    logConsole('');
  }
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
    logConsole('Fetching standards...\n');

    const spaces = await packmindCliHexa.getSpaces();
    const matchedSpace = resolveSpaceFromArgs(args.space, spaces);

    if (args.space && !matchedSpace) {
      logErrorConsole(`Space "@${args.space}" not found.`);
      exit(1);
      return;
    }

    const standards = await packmindCliHexa.listStandards(
      matchedSpace ? { spaceId: matchedSpace.id } : {},
    );

    if (standards.length === 0) {
      logConsole(
        matchedSpace
          ? `No standards found in space "@${matchedSpace.slug}".`
          : 'No standards found.',
      );
      exit(0);
      return;
    }

    logConsole(formatHeader(`📋 Standards (${standards.length})\n`));

    const buildUrl = resolveUrlBuilder((id) => `standards/${id}/summary`);
    displayGroupedStandards(standards, spaces, buildUrl);

    exit(0);
  } catch (err) {
    logErrorConsole('Failed to list standards:');
    logErrorConsole(err instanceof Error ? err.message : String(err));
    exit(1);
  }
}
