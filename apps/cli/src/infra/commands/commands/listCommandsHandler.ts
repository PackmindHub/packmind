import { Space } from '@packmind/types';
import { ListCommandsResult } from '../../../domain/useCases/IListCommandsUseCase';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';

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
    const spaceFilter = args.space?.startsWith('@')
      ? args.space.slice(1)
      : args.space;

    let matchedSpace: Space | null = null;
    const spaces = await packmindCliHexa.output.withLoader(
      'Loading spaces ...',
      () => packmindCliHexa.getSpaces(),
    );

    if (spaceFilter) {
      matchedSpace = spaces.find((s) => s.slug === spaceFilter) ?? null;
      if (!matchedSpace) {
        packmindCliHexa.output.notifyError(
          `Space "${spaceFilter}" not found.`,
          {
            content: `Available spaces:\n${spaces.map((space) => ` - ${space.name} (@${space.slug})`).join('\n')}`,
            exampleCommand: `packmind-cli commands list --space @${spaces[0].slug}`,
          },
        );
        exit(1);
        return;
      }
    }

    const commands = await packmindCliHexa.output.withLoader(
      'Loading commands...',
      () =>
        packmindCliHexa.listCommands(
          matchedSpace ? { spaceId: matchedSpace.id } : {},
        ),
    );

    if (commands.length === 0) {
      packmindCliHexa.output.notifyWarning(
        spaceFilter
          ? `No commands found in space "${spaceFilter}".`
          : 'No commands found.',
      );
      exit(0);
      return;
    }

    const buildUrl = resolveUrlBuilder((id) => `commands/${id}`);

    if (spaceFilter && matchedSpace) {
      packmindCliHexa.output.listArtefacts(
        `📋 Commands (${commands.length})`,
        commands.map((command) => {
          return {
            ...command,
            title: command.name,
            url: buildUrl(matchedSpace.slug, command.id),
          };
        }),
      );
    } else {
      const { groups } = groupCommandsBySpace(commands, spaces);

      packmindCliHexa.output.listScopedArtefacts(
        `📋 Commands (${commands.length})`,
        groups.map(({ space, cmds }) => {
          return {
            title: `Space "${space.name}" (@${space.slug})`,
            artefacts: cmds.map((cmd) => ({
              ...cmd,
              title: cmd.name,
              url: buildUrl(space.slug, cmd.id),
            })),
          };
        }),
      );
    }

    exit(0);
  } catch (err) {
    packmindCliHexa.output.notifyError('Failed to list commands:', {
      content: err instanceof Error ? err.message : String(err),
    });
    exit(1);
  }
}
