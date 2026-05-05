import {
  ActiveDistributedPackage,
  ActiveDistributedPackagesByTarget,
  GitRepo,
  Target,
  TargetId,
} from '@packmind/types';

export type TargetSection = {
  id: TargetId;
  target: Target;
  packageGroups: ActiveDistributedPackage[];
  inSyncCount: number;
  outdatedCount: number;
  hasOutdated: boolean;
};

export type RepoSection = {
  gitRepo: GitRepo;
  targets: TargetSection[];
};

export type BuildRepositorySectionsInput = {
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>;
};

export function buildRepositorySections({
  entries,
}: BuildRepositorySectionsInput): RepoSection[] {
  const sections = new Map<string, RepoSection>();

  entries.forEach((entry) => {
    if (!entry.gitRepo) return;
    if (entry.packages.length === 0) return;

    const packageGroups = [...entry.packages].sort((a, b) =>
      a.package.name.localeCompare(b.package.name),
    );
    const counts = countArtifacts(packageGroups);
    const targetSection: TargetSection = {
      id: entry.target.id,
      target: entry.target,
      packageGroups,
      inSyncCount: counts.inSync,
      outdatedCount: counts.outdated,
      hasOutdated: counts.outdated > 0,
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

function countArtifacts(groups: ReadonlyArray<ActiveDistributedPackage>): {
  inSync: number;
  outdated: number;
} {
  let inSync = 0;
  let outdated = 0;

  groups.forEach((group) => {
    [
      ...group.deployedRecipes,
      ...group.deployedStandards,
      ...group.deployedSkills,
    ].forEach((item) => {
      if (item.isUpToDate && !item.isDeleted) inSync += 1;
      else outdated += 1;
    });
    outdated +=
      group.pendingRecipes.length +
      group.pendingStandards.length +
      group.pendingSkills.length;
  });

  return { inSync, outdated };
}

function repoLabel(gitRepo: GitRepo): string {
  return `${gitRepo.owner}/${gitRepo.repo}:${gitRepo.branch}`.toLowerCase();
}
