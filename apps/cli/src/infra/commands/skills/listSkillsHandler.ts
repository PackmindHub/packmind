import { Space } from '@packmind/types';
import { IListSkillsResult } from '../../../domain/useCases/IListSkillsUseCase';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSpaceFromArgs } from '../../utils/spaceFilterUtils';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';

type Skill = IListSkillsResult[number];

function groupSkillsBySpace(
  skills: Skill[],
  spaces: Space[],
): Array<{ space: Space; items: Skill[] }> {
  const spaceMap = new Map<string, Space>(
    spaces.map((s) => [s.id as string, s]),
  );
  const groupsMap = new Map<string, { space: Space; items: Skill[] }>();

  for (const skill of skills) {
    const space = spaceMap.get(skill.spaceId);
    if (!space) {
      continue;
    }
    let group = groupsMap.get(space.id as string);
    if (!group) {
      group = { space, items: [] };
      groupsMap.set(space.id as string, group);
    }
    group.items.push(skill);
  }

  return [...groupsMap.values()].sort((a, b) =>
    a.space.name.localeCompare(b.space.name),
  );
}

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
    const groups = groupSkillsBySpace(skills, spaces);

    packmindCliHexa.output.listScopedArtefacts(
      `📋 Skills (${skills.length})`,
      groups.map(({ space, items }) => ({
        title: `Space: ${space.name}`,
        artefacts: [...items]
          .sort((a, b) => a.slug.localeCompare(b.slug))
          .map((skill) => ({
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
