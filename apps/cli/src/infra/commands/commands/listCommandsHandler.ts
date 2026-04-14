import { Space } from '@packmind/types';
import { ListCommandsResult } from '../../../domain/useCases/IListCommandsUseCase';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
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

    const commands = await packmindCliHexa.output.withLoader(
      'Fetching commands',
      () =>
        packmindCliHexa.listCommands(
          matchedSpace ? { spaceId: matchedSpace.id } : {},
        ),
    );

    if (commands.length === 0) {
      packmindCliHexa.output.notifyInfo(
        matchedSpace
          ? `No commands found in space "@${matchedSpace.slug}".`
          : 'No commands found.',
      );
      exit(0);
      return;
    }

    const { groups } = groupCommandsBySpace(commands, spaces);
    const buildUrl = resolveUrlBuilder((id) => `commands/${id}`);

    packmindCliHexa.output.listScopedArtefacts(
      `📋 Commands (${commands.length})`,
      groups.map(({ space, cmds }) => ({
        title: `Space: ${space.name}`,
        artefacts: cmds.map((cmd) => ({
          title: cmd.name,
          slug: cmd.slug,
          url: buildUrl(space.slug, cmd.id),
        })),
      })),
    );
    exit(0);
  } catch (err) {
    packmindCliHexa.output.notifyError('Failed to list commands:', {
      content: err instanceof Error ? err.message : String(err),
    });
    exit(1);
  }
}
