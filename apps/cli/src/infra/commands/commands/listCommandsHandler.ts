import { Space } from '@packmind/types';
import { ListCommandsResult } from '../../../domain/useCases/IListCommandsUseCase';
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

type Command = ListCommandsResult[number];

function groupCommandsBySpace(
  commands: Command[],
  spaces: Space[],
): { groups: Array<{ space: Space; cmds: Command[] }>; orphaned: Command[] } {
  const spaceMap = new Map<string, Space>(
    spaces.map((s) => [s.id as string, s]),
  );
  const groupsMap = new Map<string, { space: Space; cmds: Command[] }>();
  const orphaned: Command[] = [];

  for (const cmd of commands) {
    const space = spaceMap.get(cmd.spaceId as string);
    if (!space) {
      orphaned.push(cmd);
      continue;
    }
    let group = groupsMap.get(space.id as string);
    if (!group) {
      group = { space, cmds: [] };
      groupsMap.set(space.id as string, group);
    }
    group.cmds.push(cmd);
  }

  const groups = [...groupsMap.values()].sort((a, b) =>
    a.space.name.localeCompare(b.space.name),
  );
  return { groups, orphaned };
}

function displayGroupedCommands(
  commands: Command[],
  spaces: Space[],
  buildUrl: UrlBuilder,
): void {
  const { groups, orphaned } = groupCommandsBySpace(commands, spaces);

  for (const { space, cmds } of groups) {
    logConsole(`Space "${space.name}":\n`);
    for (const cmd of [...cmds].sort((a, b) => a.slug.localeCompare(b.slug))) {
      logConsole(`  ${formatSlug(cmd.slug)}`);
      logConsole(`  ${formatLabel('Name:')}  ${cmd.name}`);
      const url = buildUrl(space.slug, cmd.id as string);
      if (url) {
        logConsole(`  ${formatLabel('Link:')}  ${url}`);
      }
      logConsole('');
    }
  }

  for (const cmd of [...orphaned].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  )) {
    logConsole(`  ${formatSlug(cmd.slug)}`);
    logConsole(`  ${formatLabel('Name:')}  ${cmd.name}`);
    logConsole('');
  }
}

export type ListCommandsArgs = { space?: string };

export type ListCommandsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

export async function listCommandsHandler(
  args: ListCommandsArgs,
  deps: ListCommandsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logConsole('Fetching commands...\n');

    const spaces = await packmindCliHexa.getSpaces();
    const matchedSpace = resolveSpaceFromArgs(args.space, spaces);

    if (args.space && !matchedSpace) {
      const slug = args.space.startsWith('@')
        ? args.space.slice(1)
        : args.space;
      logErrorConsole(`Space "${slug}" not found.`);
      exit(1);
      return;
    }

    const commands = await packmindCliHexa.listCommands(
      matchedSpace ? { spaceId: matchedSpace.id } : {},
    );

    if (commands.length === 0) {
      logConsole(
        matchedSpace
          ? `No commands found in space "${matchedSpace.slug}".`
          : 'No commands found.',
      );
      exit(0);
      return;
    }

    logConsole(formatHeader(`📋 Commands (${commands.length})\n`));

    const buildUrl = resolveUrlBuilder((id) => `commands/${id}`);
    displayGroupedCommands(commands, spaces, buildUrl);

    exit(0);
  } catch (err) {
    logErrorConsole('Failed to list commands:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
  }
}
