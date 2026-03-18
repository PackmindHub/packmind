import { Space } from '@packmind/types';
import { IListSkillsResult } from '../../../domain/useCases/IListSkillsUseCase';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  formatSlug,
  formatLabel,
  formatHeader,
  logConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';
import { loadApiKey, decodeApiKey } from '../../utils/credentials';

type Skill = IListSkillsResult[number];
type UrlBuilder = (spaceSlug: string, skillSlug: string) => string | null;

function buildSkillUrl(
  host: string,
  orgSlug: string,
  spaceSlug: string,
  skillSlug: string,
): string {
  return `${host}/org/${orgSlug}/space/${spaceSlug}/skills/${skillSlug}/files`;
}

function resolveUrlBuilder(): UrlBuilder {
  const apiKey = loadApiKey();
  if (!apiKey) return () => null;
  const decoded = decodeApiKey(apiKey);
  const orgSlug = decoded?.jwt?.organization?.slug;
  if (!decoded?.host || !orgSlug) return () => null;
  return (spaceSlug, skillSlug) =>
    buildSkillUrl(decoded.host, orgSlug, spaceSlug, skillSlug);
}

function groupSkillsBySpace(
  skills: Skill[],
  spaces: Space[],
): { groups: Array<{ space: Space; items: Skill[] }>; orphaned: Skill[] } {
  const spaceMap = new Map<string, Space>(
    spaces.map((s) => [s.id as string, s]),
  );
  const groupsMap = new Map<string, { space: Space; items: Skill[] }>();
  const orphaned: Skill[] = [];

  for (const skill of skills) {
    const space = spaceMap.get(skill.spaceId);
    if (!space) {
      orphaned.push(skill);
      continue;
    }
    let group = groupsMap.get(space.id as string);
    if (!group) {
      group = { space, items: [] };
      groupsMap.set(space.id as string, group);
    }
    group.items.push(skill);
  }

  const groups = [...groupsMap.values()].sort((a, b) =>
    a.space.name.localeCompare(b.space.name),
  );
  return { groups, orphaned };
}

function displayGroupedSkills(
  skills: Skill[],
  spaces: Space[],
  buildUrl: UrlBuilder,
): void {
  const { groups, orphaned } = groupSkillsBySpace(skills, spaces);

  for (const { space, items } of groups) {
    logConsole(`Space "${space.name}":\n`);
    for (const skill of [...items].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    )) {
      logConsole(`  ${formatSlug(skill.slug)}`);
      logConsole(`  ${formatLabel('Name:')}  ${skill.name}`);
      if (skill.description) {
        const descriptionLines = skill.description
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
      const url = buildUrl(space.slug, skill.slug);
      if (url) {
        logConsole(`  ${formatLabel('Link:')}  ${url}`);
      }
      logConsole('');
    }
  }

  for (const skill of [...orphaned].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  )) {
    logConsole(`  ${formatSlug(skill.slug)}`);
    logConsole(`  ${formatLabel('Name:')}  ${skill.name}`);
    logConsole('');
  }
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
    logConsole('Fetching skills...\n');

    const spaceFilter = args.space?.startsWith('@')
      ? args.space.slice(1)
      : args.space;

    let matchedSpace: Space | null = null;
    const spaces = await packmindCliHexa.getSpaces();

    if (spaceFilter) {
      matchedSpace = spaces.find((s) => s.slug === spaceFilter) ?? null;
      if (!matchedSpace) {
        logErrorConsole(`Space "${spaceFilter}" not found.`);
        exit(1);
        return;
      }
    }

    const skills = await packmindCliHexa.listSkills(
      matchedSpace ? { spaceId: matchedSpace.id } : {},
    );

    if (skills.length === 0) {
      logConsole(
        spaceFilter
          ? `No skills found in space "${spaceFilter}".`
          : 'No skills found.',
      );
      exit(0);
      return;
    }

    logConsole(formatHeader(`📋 Skills (${skills.length})\n`));

    const buildUrl = resolveUrlBuilder();
    displayGroupedSkills(skills, spaces, buildUrl);

    exit(0);
  } catch (err) {
    logErrorConsole('Failed to list skills:');
    logErrorConsole(err instanceof Error ? err.message : String(err));
    exit(1);
  }
}
