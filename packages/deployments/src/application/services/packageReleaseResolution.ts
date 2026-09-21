import {
  CommandId,
  CommandVersionId,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  PackageRelease,
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
 * Resolves every component of a package to its latest version, caching per
 * component id. Reports what it could not resolve rather than throwing —
 * the cut refuses on an unresolved component, the readiness read omits it.
 */
export const resolveLatestComponentVersions = async (
  components: {
    recipeIds: CommandId[];
    standardIds: StandardId[];
    skillIds: SkillId[];
  },
  ports: ComponentVersionPorts,
): Promise<ResolvedComponentVersions> => {
  const resolved: ResolvedComponentVersion[] = [];
  const unresolved: { family: ComponentFamily; componentId: string }[] = [];

  const commandVersionCache = new Map<
    CommandId,
    ResolvedComponentVersion | null
  >();
  const standardVersionCache = new Map<
    StandardId,
    ResolvedComponentVersion | null
  >();
  const skillVersionCache = new Map<SkillId, ResolvedComponentVersion | null>();

  // Resolve recipes
  for (const recipeId of components.recipeIds) {
    if (!commandVersionCache.has(recipeId)) {
      const versions = await ports.commandsPort.listCommandVersions(recipeId);
      if (versions.length > 0) {
        const latestVersion = [...versions].sort(
          (a, b) => b.version - a.version,
        )[0];
        commandVersionCache.set(recipeId, {
          family: 'recipe',
          componentId: recipeId,
          name: latestVersion.name,
          versionId: latestVersion.id,
          versionNumber: latestVersion.version,
        });
      } else {
        commandVersionCache.set(recipeId, null);
      }
    }

    const resolved_ver = commandVersionCache.get(recipeId);
    if (resolved_ver) {
      resolved.push(resolved_ver);
    } else {
      unresolved.push({ family: 'recipe', componentId: recipeId });
    }
  }

  // Resolve standards
  for (const standardId of components.standardIds) {
    if (!standardVersionCache.has(standardId)) {
      const latestVersion =
        await ports.standardsPort.getLatestStandardVersion(standardId);
      if (latestVersion) {
        standardVersionCache.set(standardId, {
          family: 'standard',
          componentId: standardId,
          name: latestVersion.name,
          versionId: latestVersion.id,
          versionNumber: latestVersion.version,
        });
      } else {
        standardVersionCache.set(standardId, null);
      }
    }

    const resolved_ver = standardVersionCache.get(standardId);
    if (resolved_ver) {
      resolved.push(resolved_ver);
    } else {
      unresolved.push({ family: 'standard', componentId: standardId });
    }
  }

  // Resolve skills
  for (const skillId of components.skillIds) {
    if (!skillVersionCache.has(skillId)) {
      const latestVersion =
        await ports.skillsPort.getLatestSkillVersion(skillId);
      if (latestVersion) {
        skillVersionCache.set(skillId, {
          family: 'skill',
          componentId: skillId,
          name: latestVersion.name,
          versionId: latestVersion.id,
          versionNumber: latestVersion.version,
        });
      } else {
        skillVersionCache.set(skillId, null);
      }
    }

    const resolved_ver = skillVersionCache.get(skillId);
    if (resolved_ver) {
      resolved.push(resolved_ver);
    } else {
      unresolved.push({ family: 'skill', componentId: skillId });
    }
  }

  return { resolved, unresolved };
};

/** The greatest release version by parsed triple, or '0.0.0' for none. */
export const currentVersionOf = (releases: PackageRelease[]): string => {
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
