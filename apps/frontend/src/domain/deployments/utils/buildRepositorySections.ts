import {
  ActiveDistributedPackagesByTarget,
  GitRepo,
  Package,
  PackageId,
  Target,
  TargetId,
} from '@packmind/types';
import {
  groupTargetByPackage,
  GroupTargetByPackageLookups,
  PackageGroup,
} from './groupTargetByPackage';

export type TargetSection = {
  id: TargetId;
  target: Target;
  packageGroups: PackageGroup[];
  inSyncCount: number;
  outdatedCount: number;
  pendingCount: number;
  hasOutdated: boolean;
};

export type RepoSection = {
  gitRepo: GitRepo;
  targets: TargetSection[];
};

export type BuildRepositorySectionsInput = {
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>;
  packages: ReadonlyArray<Package>;
  lookups: GroupTargetByPackageLookups | undefined;
};

export function buildRepositorySections({
  entries,
  packages,
  lookups,
}: BuildRepositorySectionsInput): RepoSection[] {
  const sections = new Map<string, RepoSection>();

  entries.forEach((entry) => {
    if (!entry.gitRepo) return;

    const activePackageIds = new Set(entry.packages.map((p) => p.packageId));
    const packageGroups = groupTargetByPackage(
      {
        recipes: entry.deployedRecipes,
        standards: entry.deployedStandards,
        skills: entry.deployedSkills,
      },
      packages,
      lookups,
      activePackageIds,
    );

    if (packageGroups.length === 0) return;

    const counts = countArtifacts(packageGroups);
    const targetSection: TargetSection = {
      id: entry.target.id,
      target: entry.target,
      packageGroups,
      inSyncCount: counts.inSync,
      outdatedCount: counts.outdated,
      pendingCount: counts.pending,
      hasOutdated: counts.outdated + counts.pending > 0,
    };

    const repoId = entry.gitRepo.id;
    const existing = sections.get(repoId);
    if (existing) {
      existing.targets.push(targetSection);
    } else {
      sections.set(repoId, {
        gitRepo: entry.gitRepo,
        targets: [targetSection],
      });
    }
  });

  sections.forEach((section) => {
    section.targets.sort((a, b) => a.target.name.localeCompare(b.target.name));
  });

  return Array.from(sections.values()).sort((a, b) =>
    repoLabel(a.gitRepo).localeCompare(repoLabel(b.gitRepo)),
  );
}

function countArtifacts(groups: ReadonlyArray<PackageGroup>): {
  inSync: number;
  outdated: number;
  pending: number;
} {
  let inSync = 0;
  let outdated = 0;
  let pending = 0;

  groups.forEach((group) => {
    [...group.recipes, ...group.standards, ...group.skills].forEach((item) => {
      if (item.isUpToDate && !item.isDeleted) inSync += 1;
      else outdated += 1;
    });
    pending +=
      group.pendingRecipes.length +
      group.pendingStandards.length +
      group.pendingSkills.length;
  });

  return { inSync, outdated, pending };
}

function repoLabel(gitRepo: GitRepo): string {
  return `${gitRepo.owner}/${gitRepo.repo}:${gitRepo.branch}`.toLowerCase();
}
