import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';
import { groupArtefactBySpaces } from '../../utils/groupArtefactsBySpaces';

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

    const groupedCommands = groupArtefactBySpaces(commands, spaces);
    const buildUrl = resolveUrlBuilder((id) => `commands/${id}`);

    packmindCliHexa.output.listScopedArtefacts(
      `📋 Commands (${commands.length})`,
      groupedCommands.map(({ space, artefacts }) => ({
        title: `Space: ${space.name}`,
        artefacts: artefacts.map((cmd) => ({
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
