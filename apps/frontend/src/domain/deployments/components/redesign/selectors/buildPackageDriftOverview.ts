import {
  DistributionStatus,
  type ActiveDistributedPackage,
  type ActiveDistributedPackagesByTarget,
  type DeployedRecipeTargetInfo,
  type DeployedSkillTargetInfo,
  type DeployedStandardTargetInfo,
  type GitRepo,
  type PackageId,
  type PendingRecipeInfo,
  type PendingSkillInfo,
  type PendingStandardInfo,
  type Target,
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
  isDeleted: boolean;
  isPending: boolean;
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
  flags: { isDeleted?: boolean; isPending?: boolean } = {},
): ArtifactAccumulator {
  const key = artifactKey(kind, id);
  const existing = pkg.artifacts.get(key);
  if (existing) {
    if (packmindVersion > existing.packmindVersion) {
      existing.packmindVersion = packmindVersion;
    }
    if (flags.isDeleted) existing.isDeleted = true;
    if (flags.isPending === false) existing.isPending = false;
    return existing;
  }
  const created: ArtifactAccumulator = {
    id,
    kind,
    name,
    packmindVersion,
    isDeleted: !!flags.isDeleted,
    isPending: !!flags.isPending,
    installs: [],
  };
  pkg.artifacts.set(key, created);
  return created;
}

function deployedDriftReason(
  isDeleted: boolean,
  deployedVersion: number,
  packmindVersion: number,
): RepoInstall['driftReason'] {
  if (isDeleted) return 'needs-removal';
  if (deployedVersion < packmindVersion) return 'behind';
  return 'aligned';
}

function pushStandard(
  pkg: PackageAccumulator,
  info: DeployedStandardTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  const isDeleted = !!info.isDeleted;
  const artifact = ensureArtifact(
    pkg,
    'standard',
    info.standard.id,
    info.standard.name,
    info.latestVersion.version,
    { isDeleted, isPending: false },
  );
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: info.deployedVersion.version,
    lastDeployedAt: info.deploymentDate,
    driftReason: deployedDriftReason(
      isDeleted,
      info.deployedVersion.version,
      info.latestVersion.version,
    ),
  });
}

function pushRecipe(
  pkg: PackageAccumulator,
  info: DeployedRecipeTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  const isDeleted = !!info.isDeleted;
  const artifact = ensureArtifact(
    pkg,
    'command',
    info.recipe.id,
    info.recipe.name,
    info.latestVersion.version,
    { isDeleted, isPending: false },
  );
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: info.deployedVersion.version,
    lastDeployedAt: info.deploymentDate,
    driftReason: deployedDriftReason(
      isDeleted,
      info.deployedVersion.version,
      info.latestVersion.version,
    ),
  });
}

function pushSkill(
  pkg: PackageAccumulator,
  info: DeployedSkillTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  const isDeleted = !!info.isDeleted;
  const artifact = ensureArtifact(
    pkg,
    'skill',
    info.skill.id,
    info.skill.name,
    info.latestVersion.version,
    { isDeleted, isPending: false },
  );
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: info.deployedVersion.version,
    lastDeployedAt: info.deploymentDate,
    driftReason: deployedDriftReason(
      isDeleted,
      info.deployedVersion.version,
      info.latestVersion.version,
    ),
  });
}

function pushPendingStandard(
  pkg: PackageAccumulator,
  info: PendingStandardInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  const artifact = ensureArtifact(pkg, 'standard', info.id, info.name, 0, {
    isPending: true,
  });
  // Only mark as pending if no deployed install has registered first.
  if (artifact.installs.length === 0 && !artifact.isDeleted) {
    artifact.isPending = true;
  }
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: 0,
    lastDeployedAt: '',
    driftReason: 'not-distributed',
  });
}

function pushPendingRecipe(
  pkg: PackageAccumulator,
  info: PendingRecipeInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  const artifact = ensureArtifact(pkg, 'command', info.id, info.name, 0, {
    isPending: true,
  });
  if (artifact.installs.length === 0 && !artifact.isDeleted) {
    artifact.isPending = true;
  }
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: 0,
    lastDeployedAt: '',
    driftReason: 'not-distributed',
  });
}

function pushPendingSkill(
  pkg: PackageAccumulator,
  info: PendingSkillInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
): void {
  const artifact = ensureArtifact(pkg, 'skill', info.id, info.name, 0, {
    isPending: true,
  });
  if (artifact.installs.length === 0 && !artifact.isDeleted) {
    artifact.isPending = true;
  }
  artifact.installs.push({
    repo,
    target,
    branch,
    deployedVersion: 0,
    lastDeployedAt: '',
    driftReason: 'not-distributed',
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

function toDistributionStatus(
  status: DistributionStatus | undefined | null,
): DistributionStatus | null {
  return status ?? null;
}

function toDistributionDate(date: string | undefined | null): string | null {
  return date && date.length > 0 ? date : null;
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
        lastDistributionStatus: toDistributionStatus(
          active.lastDistributionStatus,
        ),
        lastDistributedAt: toDistributionDate(active.lastDistributedAt),
      });
      for (const s of active.deployedStandards)
        pushStandard(pkg, s, repoRef, targetRef, branch);
      for (const r of active.deployedRecipes)
        pushRecipe(pkg, r, repoRef, targetRef, branch);
      for (const k of active.deployedSkills)
        pushSkill(pkg, k, repoRef, targetRef, branch);
      for (const s of active.pendingStandards)
        pushPendingStandard(pkg, s, repoRef, targetRef, branch);
      for (const r of active.pendingRecipes)
        pushPendingRecipe(pkg, r, repoRef, targetRef, branch);
      for (const k of active.pendingSkills)
        pushPendingSkill(pkg, k, repoRef, targetRef, branch);
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
        isDeleted: a.isDeleted,
        isPending: a.isPending,
        installs: [...a.installs],
      })),
    ),
    installLocations: sortInstallLocations(p.installLocations),
  }));
}

export function packageHasDrift(pkg: PackageDrift): boolean {
  return pkg.artifacts.some((a) =>
    a.installs.some((i) => i.driftReason !== 'aligned'),
  );
}

export function packageBehindInstallCount(pkg: PackageDrift): number {
  const behind = new Set<string>();
  for (const a of pkg.artifacts) {
    for (const i of a.installs) {
      if (i.driftReason !== 'aligned') {
        behind.add(`${i.repo.id}:${i.target.id}`);
      }
    }
  }
  return behind.size;
}

export function totalBehindInstallCount(packages: PackageDrift[]): number {
  let total = 0;
  for (const pkg of packages) {
    total += packageBehindInstallCount(pkg);
  }
  return total;
}

export function packageHasFailedDistribution(pkg: PackageDrift): boolean {
  return pkg.installLocations.some(
    (loc) => loc.lastDistributionStatus === DistributionStatus.failure,
  );
}

export function packageFailedInstallCount(pkg: PackageDrift): number {
  let n = 0;
  for (const loc of pkg.installLocations) {
    if (loc.lastDistributionStatus === DistributionStatus.failure) n++;
  }
  return n;
}

export function totalFailedInstallCount(packages: PackageDrift[]): number {
  let total = 0;
  for (const pkg of packages) total += packageFailedInstallCount(pkg);
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
