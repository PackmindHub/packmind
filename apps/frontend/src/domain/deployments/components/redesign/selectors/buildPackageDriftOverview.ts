import {
  DistributionStatus,
  parsePackageVersionSpec,
  type ActiveDistributedPackage,
  type ActiveDistributedPackagesByTarget,
  type DeployedCommandTargetInfo,
  type DeployedSkillTargetInfo,
  type DeployedStandardTargetInfo,
  type GitRepo,
  type PackageId,
  type PendingCommandInfo,
  type PendingSkillInfo,
  type PendingStandardInfo,
  type Target,
} from '@packmind/types';

import { installDriftEntries, isRootTargetPath } from './installDriftEntries';
import { needsAttention } from './destinationStanding';
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
  latestReleaseVersion: string | null;
  hasUnreleasedChanges: boolean;
};

function toRepoRef(gitRepo: GitRepo): RepoRef {
  return {
    id: gitRepo.id,
    owner: gitRepo.owner,
    name: gitRepo.repo,
    providerId: gitRepo.providerId,
  };
}

function toTargetRef(target: Target): TargetRef {
  return {
    id: target.id,
    name: target.name,
    isDefault: isRootTargetPath(target.path),
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
    /*
     * Taken from whichever destination of this package is seen first, and not
     * merged across them: both are facts about the package itself, so every
     * destination of it carries the same pair.
     */
    latestReleaseVersion: active.latestReleaseVersion,
    hasUnreleasedChanges: active.hasUnreleasedChanges,
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

/**
 * Whether this destination's lateness against the live package means anything.
 *
 * It does not, for a destination pinned to a release. Such a repository holds
 * exactly what that release pinned: its components being older than the live
 * ones, a component deleted since still sitting there, and a component added
 * since being absent are all the pin working as asked, not drift. Reporting
 * them is what made a pinned repository read as behind the moment anyone edited
 * a component — including one sitting on the newest release there is.
 *
 * How far such a destination has fallen behind is a question about releases,
 * and `destinationStanding` answers it from the pin and the package's release
 * state instead.
 */
function measuresAgainstLivePackage(versionSpec: string | null): boolean {
  return parsePackageVersionSpec(versionSpec)?.kind !== 'exact';
}

function deployedDriftReason(
  isDeleted: boolean,
  deployedVersion: number,
  packmindVersion: number,
  measuresAgainstLive: boolean,
): RepoInstall['driftReason'] {
  if (!measuresAgainstLive) return 'aligned';
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
  measuresAgainstLive: boolean,
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
      measuresAgainstLive,
    ),
  });
}

function pushCommand(
  pkg: PackageAccumulator,
  info: DeployedCommandTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
  measuresAgainstLive: boolean,
): void {
  const isDeleted = !!info.isDeleted;
  const artifact = ensureArtifact(
    pkg,
    'command',
    info.command.id,
    info.command.name,
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
      measuresAgainstLive,
    ),
  });
}

function pushSkill(
  pkg: PackageAccumulator,
  info: DeployedSkillTargetInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
  measuresAgainstLive: boolean,
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
      measuresAgainstLive,
    ),
  });
}

function pushPendingStandard(
  pkg: PackageAccumulator,
  info: PendingStandardInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
  measuresAgainstLive: boolean,
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
    driftReason: measuresAgainstLive ? 'not-distributed' : 'aligned',
  });
}

function pushPendingCommand(
  pkg: PackageAccumulator,
  info: PendingCommandInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
  measuresAgainstLive: boolean,
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
    driftReason: measuresAgainstLive ? 'not-distributed' : 'aligned',
  });
}

function pushPendingSkill(
  pkg: PackageAccumulator,
  info: PendingSkillInfo,
  repo: RepoRef,
  target: TargetRef,
  branch: string,
  measuresAgainstLive: boolean,
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
    driftReason: measuresAgainstLive ? 'not-distributed' : 'aligned',
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
        lastDistributionError: active.lastDistributionError ?? null,
        versionSpec: active.versionSpec ?? null,
      });
      const measuresAgainstLive = measuresAgainstLivePackage(
        active.versionSpec ?? null,
      );
      for (const s of active.deployedStandards)
        pushStandard(pkg, s, repoRef, targetRef, branch, measuresAgainstLive);
      for (const r of active.deployedCommands)
        pushCommand(pkg, r, repoRef, targetRef, branch, measuresAgainstLive);
      for (const k of active.deployedSkills)
        pushSkill(pkg, k, repoRef, targetRef, branch, measuresAgainstLive);
      for (const s of active.pendingStandards)
        pushPendingStandard(
          pkg,
          s,
          repoRef,
          targetRef,
          branch,
          measuresAgainstLive,
        );
      for (const r of active.pendingCommands)
        pushPendingCommand(
          pkg,
          r,
          repoRef,
          targetRef,
          branch,
          measuresAgainstLive,
        );
      for (const k of active.pendingSkills)
        pushPendingSkill(
          pkg,
          k,
          repoRef,
          targetRef,
          branch,
          measuresAgainstLive,
        );
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
    latestReleaseVersion: p.latestReleaseVersion,
    hasUnreleasedChanges: p.hasUnreleasedChanges,
  }));
}

/**
 * Whether any destination of this package needs a hand.
 *
 * Read off each landing's standing rather than off its artifacts, because the
 * two answers parted company once pins became real: a pinned destination
 * waiting on a release has no late artifact at all — every one of them is
 * exactly what its release pinned — and is still not where it should be.
 *
 * Not the same question as whether there is anything to send, which is what
 * `packageHasSendableWork` answers. A destination that needs a release needs
 * one from a person, not from this app.
 */
export function packageHasDrift(pkg: PackageDrift): boolean {
  return installDriftEntries(pkg).some((entry) =>
    needsAttention(entry.standing),
  );
}

/**
 * Whether distributing this package would actually send something.
 *
 * What gates every gesture that pushes: a destination sitting on the newest
 * release of a package that has moved past it reads behind and has nothing
 * coming — the commit would be empty and the row would read behind afterwards.
 * Offering the button there is the bug this split exists to end.
 */
export function packageHasSendableWork(pkg: PackageDrift): boolean {
  return installDriftEntries(pkg).some(
    (entry) => entry.standing.remedy === 'update',
  );
}

function destinationKey(repoId: string, targetId: string): string {
  return `${repoId}:${targetId}`;
}

/**
 * Distinct repositories this package is distributed to, counted once however
 * many targets of a repository it lands on.
 *
 * An `InstallLocation` is a (repo, target) pair, so its plain length is a
 * number of distributions rather than of places: a package on the root and on
 * `apps/frontend` of one repository reaches one repository.
 */
export function packageRepositoryCount(pkg: PackageDrift): number {
  const repos = new Set<string>();
  for (const loc of pkg.installLocations) repos.add(loc.repo.id);
  return repos.size;
}

export function packageBehindInstallCount(pkg: PackageDrift): number {
  const behind = new Set<string>();
  for (const entry of installDriftEntries(pkg)) {
    if (needsAttention(entry.standing)) {
      behind.add(destinationKey(entry.repo.id, entry.target.id));
    }
  }
  return behind.size;
}

/** Destinations of this package a distribution would actually move forward. */
export function packageSendableInstallCount(pkg: PackageDrift): number {
  const sendable = new Set<string>();
  for (const entry of installDriftEntries(pkg)) {
    if (entry.standing.remedy === 'update') {
      sendable.add(destinationKey(entry.repo.id, entry.target.id));
    }
  }
  return sendable.size;
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

/**
 * Every place this package is installed is mid-distribution.
 *
 * The fourth state of a landing, beside aligned, drifted and failed: the copy
 * out there is behind and the run that puts it right is already going, so it
 * needs reading and not a hand. `buildPackageDestinations` has carried the same
 * state under the same name since the Context pane was written, and
 * `buildSpaceDestinations` now counts destinations by it.
 *
 * Nothing is ranked here. A location cannot be `in_progress` and `failure` at
 * once, but a package can hold several, and which of the two wins is the
 * caller's question.
 */
export function packageIsWaiting(pkg: PackageDrift): boolean {
  return (
    pkg.installLocations.length > 0 &&
    pkg.installLocations.every(
      (loc) => loc.lastDistributionStatus === DistributionStatus.in_progress,
    )
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

/**
 * How many destinations of this package need a hand: behind on at least one
 * artifact, or last distributed with a failure.
 *
 * A union rather than the sum of the two counts, because a destination whose
 * last push failed is usually also behind, and adding them up would say "2
 * destinations" about one repository.
 */
export function packageAttentionInstallCount(pkg: PackageDrift): number {
  const needingAttention = new Set<string>();
  for (const entry of installDriftEntries(pkg)) {
    if (needsAttention(entry.standing)) {
      needingAttention.add(destinationKey(entry.repo.id, entry.target.id));
    }
  }
  for (const loc of pkg.installLocations) {
    if (loc.lastDistributionStatus === DistributionStatus.failure) {
      needingAttention.add(destinationKey(loc.repo.id, loc.target.id));
    }
  }
  return needingAttention.size;
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
