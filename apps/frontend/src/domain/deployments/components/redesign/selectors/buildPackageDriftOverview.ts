import type {
  ActiveDistributedPackage,
  ActiveDistributedPackagesByTarget,
  DeployedRecipeTargetInfo,
  DeployedSkillTargetInfo,
  DeployedStandardTargetInfo,
  GitRepo,
  PackageId,
  Target,
} from '@packmind/types';

import type {
  ArtifactDrift,
  ArtifactId,
  ArtifactKind,
  InstallLocation,
  PackageDrift,
  RepoInstall,
  RepoRef,
  TargetRef,
} from '../types';

type ArtifactAccumulator = {
  id: ArtifactId;
  kind: ArtifactKind;
  name: string;
  packmindVersion: number;
  installs: RepoInstall[];
};

type PackageAccumulator = {
  id: PackageId;
  name: string;
  description: string;
  artifacts: Map<string, ArtifactAccumulator>;
  installLocations: InstallLocation[];
};

const ROOT_PATHS = new Set(['', '/', '.', './']);

function toRepoRef(gitRepo: GitRepo): RepoRef {
  return {
    id: gitRepo.id,
    owner: gitRepo.owner,
    name: gitRepo.repo,
  };
}

function toTargetRef(target: Target): TargetRef {
  return {
    id: target.id,
    name: target.name,
    isDefault: ROOT_PATHS.has(target.path),
  };
}

function artifactKey(kind: ArtifactKind, id: ArtifactId): string {
  return `${kind}:${id}`;
}

function ensurePackage(
  packages: Map<PackageId, PackageAccumulator>,
  active: ActiveDistributedPackage,
): PackageAccumulator {
  const existing = packages.get(active.packageId);
  if (existing) return existing;
  const created: PackageAccumulator = {
    id: active.packageId,
    name: active.package.name,
    description: active.package.description,
    artifacts: new Map(),
    installLocations: [],
  };
  packages.set(active.packageId, created);
  return created;
}

function ensureArtifact(
  pkg: PackageAccumulator,
  kind: ArtifactKind,
  id: ArtifactId,
  name: string,
  packmindVersion: number,
): ArtifactAccumulator {
  const key = artifactKey(kind, id);
  const existing = pkg.artifacts.get(key);
  if (existing) {
    if (packmindVersion > existing.packmindVersion) {
      existing.packmindVersion = packmindVersion;
    }
    return existing;
  }
  const created: ArtifactAccumulator = {
    id,
    kind,
    name,
    packmindVersion,
    installs: [],
  };
  pkg.artifacts.set(key, created);
  return created;
}

function pushStandard(
  pkg: PackageAccumulator,
  info: DeployedStandardTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  if (info.isDeleted) return;
  const artifact = ensureArtifact(
    pkg,
    'standard',
    info.standard.id,
    info.standard.name,
    info.latestVersion.version,
  );
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: info.deployedVersion.version,
    lastDeployedAt: info.deploymentDate,
  });
}

function pushRecipe(
  pkg: PackageAccumulator,
  info: DeployedRecipeTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  if (info.isDeleted) return;
  const artifact = ensureArtifact(
    pkg,
    'command',
    info.recipe.id,
    info.recipe.name,
    info.latestVersion.version,
  );
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: info.deployedVersion.version,
    lastDeployedAt: info.deploymentDate,
  });
}

function pushSkill(
  pkg: PackageAccumulator,
  info: DeployedSkillTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  if (info.isDeleted) return;
  const artifact = ensureArtifact(
    pkg,
    'skill',
    info.skill.id,
    info.skill.name,
    info.latestVersion.version,
  );
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: info.deployedVersion.version,
    lastDeployedAt: info.deploymentDate,
  });
}

function sortArtifacts(artifacts: ArtifactDrift[]): ArtifactDrift[] {
  const kindOrder: Record<ArtifactKind, number> = {
    standard: 0,
    command: 1,
    skill: 2,
  };
  return [...artifacts].sort((a, b) => {
    const k = kindOrder[a.kind] - kindOrder[b.kind];
    if (k !== 0) return k;
    return a.name.localeCompare(b.name);
  });
}

function sortInstallLocations(locations: InstallLocation[]): InstallLocation[] {
  return [...locations].sort((a, b) => {
    const repoCmp = `${a.repo.owner}/${a.repo.name}`.localeCompare(
      `${b.repo.owner}/${b.repo.name}`,
    );
    if (repoCmp !== 0) return repoCmp;
    const branchCmp = a.branch.localeCompare(b.branch);
    if (branchCmp !== 0) return branchCmp;
    return a.target.name.localeCompare(b.target.name);
  });
}

export function buildPackageDriftOverview(
  byTarget: ActiveDistributedPackagesByTarget[],
): PackageDrift[] {
  const packages = new Map<PackageId, PackageAccumulator>();

  for (const targetEntry of byTarget) {
    const gitRepo = targetEntry.gitRepo;
    if (!gitRepo) continue;

    const repoRef = toRepoRef(gitRepo);
    const targetRef = toTargetRef(targetEntry.target);
    const branch = gitRepo.branch;

    for (const active of targetEntry.packages) {
      const pkg = ensurePackage(packages, active);
      pkg.installLocations.push({
        repo: repoRef,
        target: targetRef,
        branch,
      });
      for (const s of active.deployedStandards)
        pushStandard(pkg, s, repoRef, targetRef, branch);
      for (const r of active.deployedRecipes)
        pushRecipe(pkg, r, repoRef, targetRef, branch);
      for (const k of active.deployedSkills)
        pushSkill(pkg, k, repoRef, targetRef, branch);
    }
  }

  return Array.from(packages.values()).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    artifacts: sortArtifacts(
      Array.from(p.artifacts.values()).map((a) => ({
        id: a.id,
        kind: a.kind,
        name: a.name,
        packmindVersion: a.packmindVersion,
        installs: [...a.installs],
      })),
    ),
    installLocations: sortInstallLocations(p.installLocations),
  }));
}

export function packageHasDrift(pkg: PackageDrift): boolean {
  return pkg.artifacts.some((a) =>
    a.installs.some((i) => i.deployedVersion < a.packmindVersion),
  );
}

export function packageBehindInstallCount(pkg: PackageDrift): number {
  const behind = new Set<string>();
  for (const a of pkg.artifacts) {
    for (const i of a.installs) {
      if (i.deployedVersion < a.packmindVersion) {
        behind.add(`${i.repo.id}:${i.target.id}`);
      }
    }
  }
  return behind.size;
}

export function totalBehindInstallCount(packages: PackageDrift[]): number {
  let total = 0;
  for (const pkg of packages) {
    const behindKeys = new Set<string>();
    for (const a of pkg.artifacts) {
      for (const i of a.installs) {
        if (i.deployedVersion < a.packmindVersion) {
          behindKeys.add(`${i.repo.id}:${i.target.id}`);
        }
      }
    }
    total += behindKeys.size;
  }
  return total;
}

export function sortPackagesByDriftFirst(
  packages: PackageDrift[],
): PackageDrift[] {
  return [...packages].sort((a, b) => {
    const driftA = packageHasDrift(a);
    const driftB = packageHasDrift(b);
    if (driftA !== driftB) return driftA ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
