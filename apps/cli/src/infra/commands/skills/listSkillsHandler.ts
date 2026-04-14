import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';
import { groupArtefactBySpaces } from '../../utils/groupArtefactsBySpaces';

export type ListSkillsArgs = { space?: string };

export type ListSkillsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

export async function listSkillsHandler(
  args: ListSkillsArgs,
  deps: ListSkillsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    const spaces = await packmindCliHexa.output.withLoader(
      'Fetching spaces',
      () => packmindCliHexa.getSpaces(),
    );

    const matchedSpace = resolveSpaceFromArgs(args.space, spaces);

    if (args.space && !matchedSpace) {
      const availableSpaces = spaces.map((s) => ` - @${s.slug}`).join('\n');
      packmindCliHexa.output.notifyError(`Space "@${args.space}" not found.`, {
        content: `Available spaces:\n${availableSpaces}`,
      });
      exit(1);
      return;
    }

    const skills = await packmindCliHexa.output.withLoader(
      'Fetching skills',
      () =>
        packmindCliHexa.listSkills(
          matchedSpace ? { spaceId: matchedSpace.id } : {},
        ),
    );

    if (skills.length === 0) {
      packmindCliHexa.output.notifyInfo(
        matchedSpace
          ? `No skills found in space "@${matchedSpace.slug}".`
          : 'No skills found.',
      );
      exit(0);
      return;
    }

    const buildUrl = resolveUrlBuilder((slug) => `skills/${slug}/files`);
    const groups = groupArtefactBySpaces(skills, spaces);

    packmindCliHexa.output.listScopedArtefacts(
      `📋 Skills (${skills.length})`,
      groups.map(({ space, artefacts }) => ({
        title: `Space: ${space.name}`,
        artefacts: artefacts.map((skill) => ({
          title: skill.name,
          slug: skill.slug,
          description: skill.description ?? undefined,
          url: buildUrl(space.slug, skill.slug),
        })),
      })),
    );

    exit(0);
  } catch (err) {
    packmindCliHexa.output.notifyError('Failed to list skills:', {
      content: err instanceof Error ? err.message : String(err),
    });
    exit(1);
  }
}
