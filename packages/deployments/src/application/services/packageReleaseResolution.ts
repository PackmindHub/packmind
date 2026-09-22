import {
  CommandId,
  CommandVersionId,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  PackageReleaseEntry,
  SkillId,
  SkillVersionId,
  StandardId,
  StandardVersionId,
  comparePackageReleaseVersions,
  parsePackageReleaseVersion,
} from '@packmind/types';
import { PackageReleaseVersionIds } from '../../domain/repositories/IPackageReleaseRepository';

export type ComponentFamily = 'recipe' | 'standard' | 'skill';

/** One component of a package, resolved to its latest version. */
export type ResolvedComponentVersion = {
  family: ComponentFamily;
  componentId: string;
  name: string;
  versionId: string;
  versionNumber: number;
};

export type ResolvedComponentVersions = {
  resolved: ResolvedComponentVersion[];
  /** Components that have no version at all, by family and id. */
  unresolved: { family: ComponentFamily; componentId: string }[];
};

export type ComponentVersionPorts = {
  commandsPort: ICommandsPort;
  standardsPort: IStandardsPort;
  skillsPort: ISkillsPort;
};

/**
 * Resolves every component of a package to its latest version. Reports what it
 * could not resolve rather than throwing — the cut refuses on an unresolved
 * component, the readiness read omits it.
 *
 * One batched call per family, in parallel: this runs on every package page
 * open through the readiness read, not only when a release is cut.
 */
export const resolveLatestComponentVersions = async (
  components: {
    recipeIds: CommandId[];
    standardIds: StandardId[];
    skillIds: SkillId[];
  },
  ports: ComponentVersionPorts,
): Promise<ResolvedComponentVersions> => {
  const [commandVersions, standardVersions, skillVersions] = await Promise.all([
    ports.commandsPort.getLatestCommandVersions(components.recipeIds),
    ports.standardsPort.getLatestStandardVersions(components.standardIds),
    ports.skillsPort.getLatestSkillVersions(components.skillIds),
  ]);

  const latestByCommandId = new Map(
    commandVersions.map((version) => [version.recipeId, version]),
  );
  const latestByStandardId = new Map(
    standardVersions.map((version) => [version.standardId, version]),
  );
  const latestBySkillId = new Map(
    skillVersions.map((version) => [version.skillId, version]),
  );

  const resolved: ResolvedComponentVersion[] = [];
  const unresolved: { family: ComponentFamily; componentId: string }[] = [];

  // Walked family by family, in the order the callers assert on.
  const collect = <Id extends string>(
    family: ComponentFamily,
    componentIds: Id[],
    latestById: Map<Id, { id: string; name: string; version: number }>,
  ) => {
    for (const componentId of componentIds) {
      const latestVersion = latestById.get(componentId);
      if (latestVersion) {
        resolved.push({
          family,
          componentId,
          name: latestVersion.name,
          versionId: latestVersion.id,
          versionNumber: latestVersion.version,
        });
      } else {
        unresolved.push({ family, componentId });
      }
    }
  };

  collect('recipe', components.recipeIds, latestByCommandId);
  collect('standard', components.standardIds, latestByStandardId);
  collect('skill', components.skillIds, latestBySkillId);

  return { resolved, unresolved };
};

/** The greatest release version by parsed triple, or '0.0.0' for none. */
export const currentVersionOf = (releases: PackageReleaseEntry[]): string => {
  const NEVER_RELEASED = '0.0.0';
  let current = NEVER_RELEASED;
  let currentParsed = parsePackageReleaseVersion(NEVER_RELEASED);

  for (const release of releases) {
    const parsed = parsePackageReleaseVersion(release.version);
    if (!parsed) {
      continue;
    }
    if (
      !currentParsed ||
      comparePackageReleaseVersions(parsed, currentParsed) > 0
    ) {
      current = release.version;
      currentParsed = parsed;
    }
  }

  return current;
};

/** Projects a resolution down to the three id arrays a write takes. */
export const toPackageReleaseVersionIds = (
  resolved: ResolvedComponentVersion[],
): PackageReleaseVersionIds => {
  const recipeVersionIds: CommandVersionId[] = [];
  const standardVersionIds: StandardVersionId[] = [];
  const skillVersionIds: SkillVersionId[] = [];

  for (const component of resolved) {
    if (component.family === 'recipe') {
      recipeVersionIds.push(component.versionId as CommandVersionId);
    } else if (component.family === 'standard') {
      standardVersionIds.push(component.versionId as StandardVersionId);
    } else if (component.family === 'skill') {
      skillVersionIds.push(component.versionId as SkillVersionId);
    }
  }

  return { recipeVersionIds, standardVersionIds, skillVersionIds };
};
