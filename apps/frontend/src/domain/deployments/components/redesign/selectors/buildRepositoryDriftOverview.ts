import {
  DistributionStatus,
  type ActiveDistributedPackagesByTarget,
  type GitProviderId,
  type GitRepoId,
} from '@packmind/types';
import {
  buildPackageDriftOverview,
  packageBehindInstallCount,
  packageFailedInstallCount,
  packageHasDrift,
  packageHasFailedDistribution,
} from './buildPackageDriftOverview';
import type {
  PackageDrift,
  RepoRef,
  RepositoryDrift,
  TargetDrift,
} from '../types';

const ROOT_PATHS = new Set(['', '/', '.', './']);

type RepoAccumulator = {
  id: GitRepoId;
  repo: RepoRef;
  branch: string;
  targets: TargetDrift[];
};

/**
 * Pivots the deployments-by-target payload into a repo-centric view.
 * Each (repo, target) entry from the source produces one `TargetDrift`, and
 * targets sharing the same `gitRepo.id` are grouped under one `RepositoryDrift`.
 */
export function buildRepositoryDriftOverview(
  byTarget: ActiveDistributedPackagesByTarget[],
): RepositoryDrift[] {
  const repos = new Map<GitRepoId, RepoAccumulator>();

  for (const entry of byTarget) {
    if (!entry.gitRepo) continue;

    let accum = repos.get(entry.gitRepo.id);
    if (!accum) {
      accum = {
        id: entry.gitRepo.id,
        repo: {
          id: entry.gitRepo.id,
          owner: entry.gitRepo.owner,
          name: entry.gitRepo.repo,
          providerId: entry.gitRepo.providerId,
        },
        branch: entry.gitRepo.branch,
        targets: [],
      };
      repos.set(entry.gitRepo.id, accum);
    }

    // Build scoped packages by running the existing package selector on a
    // single-entry slice. Each resulting PackageDrift has installLocations
    // and artifact.installs restricted to this (repo, target) only.
    const packages = buildPackageDriftOverview([entry]);

    accum.targets.push({
      id: entry.targetId,
      target: {
        id: entry.target.id,
        name: entry.target.name,
        isDefault: ROOT_PATHS.has(entry.target.path),
      },
      packages,
    });
  }

  return Array.from(repos.values()).map((r) => ({
    id: r.id,
    repo: r.repo,
    branch: r.branch,
    targets: sortTargets(r.targets),
  }));
}

function sortTargets(targets: TargetDrift[]): TargetDrift[] {
  return [...targets].sort((a, b) => {
    if (a.target.isDefault && !b.target.isDefault) return -1;
    if (!a.target.isDefault && b.target.isDefault) return 1;
    return a.target.name.localeCompare(b.target.name);
  });
}

function targetHasDrift(target: TargetDrift): boolean {
  return target.packages.some(packageHasDrift);
}

function targetHasFailedDistribution(target: TargetDrift): boolean {
  return target.packages.some(packageHasFailedDistribution);
}

export function targetBehindInstallCount(target: TargetDrift): number {
  let n = 0;
  for (const p of target.packages) n += packageBehindInstallCount(p);
  return n;
}

export function targetFailedInstallCount(target: TargetDrift): number {
  let n = 0;
  for (const p of target.packages) n += packageFailedInstallCount(p);
  return n;
}

export function repositoryHasDrift(repo: RepositoryDrift): boolean {
  return repo.targets.some(targetHasDrift);
}

export function repositoryHasFailedDistribution(
  repo: RepositoryDrift,
): boolean {
  return repo.targets.some(targetHasFailedDistribution);
}

/**
 * Distinct (target, package) pairs needing redistribution on this repo. The
 * number matches the count the rail surfaces in its summary line.
 */
export function repositoryBehindInstallCount(repo: RepositoryDrift): number {
  let n = 0;
  for (const t of repo.targets) n += targetBehindInstallCount(t);
  return n;
}

export function repositoryFailedInstallCount(repo: RepositoryDrift): number {
  let n = 0;
  for (const t of repo.targets) n += targetFailedInstallCount(t);
  return n;
}

export function repositoryDriftedTargetCount(repo: RepositoryDrift): number {
  let n = 0;
  for (const t of repo.targets) if (targetHasDrift(t)) n++;
  return n;
}

export function totalDriftedRepoCount(repos: RepositoryDrift[]): number {
  let n = 0;
  for (const r of repos) if (repositoryHasDrift(r)) n++;
  return n;
}

export function totalFailedRepoCount(repos: RepositoryDrift[]): number {
  let n = 0;
  for (const r of repos) if (repositoryHasFailedDistribution(r)) n++;
  return n;
}

/**
 * Most recent `lastDistributedAt` across all (target, package) install
 * locations on the repo. Used for the rail subtitle and lastActivity sort.
 * Returns null when no install has ever been distributed.
 */
export function repositoryLastActivityAt(repo: RepositoryDrift): string | null {
  let best: string | null = null;
  for (const t of repo.targets) {
    for (const p of t.packages) {
      for (const loc of p.installLocations) {
        if (!loc.lastDistributedAt) continue;
        if (best === null || loc.lastDistributedAt > best) {
          best = loc.lastDistributedAt;
        }
      }
    }
  }
  return best;
}

/**
 * Dominant lock signal for the whole repository, used by the master rail to
 * flag repos the user cannot act on from the app.
 *
 * - `all-no-app-token`: provider has no token (whole repo is CLI-only).
 * - `all-in-progress`: every drifted install location is mid-distribution.
 * - `none`: at least one drifted install is actionable, or no drift.
 */
export type RepositoryLockProfile =
  | 'all-no-app-token'
  | 'all-in-progress'
  | 'none';

export function repositoryLockProfile(
  repo: RepositoryDrift,
  providersWithToken: Set<GitProviderId>,
  isProvidersLoading: boolean,
): RepositoryLockProfile {
  if (isProvidersLoading) return 'none';
  if (!repositoryHasDrift(repo)) return 'none';
  if (!providersWithToken.has(repo.repo.providerId)) {
    return 'all-no-app-token';
  }
  // No-app-token resolved at the provider level; only check per-install
  // in-progress status here. A drifted location is "in progress" when its
  // last distribution status is in_progress.
  let drifted = 0;
  let inProgress = 0;
  for (const t of repo.targets) {
    for (const p of t.packages) {
      for (const loc of p.installLocations) {
        const isDrifted = packageBehindInstallCount(p) > 0;
        if (!isDrifted) continue;
        drifted++;
        if (loc.lastDistributionStatus === DistributionStatus.in_progress) {
          inProgress++;
        }
      }
    }
  }
  if (drifted > 0 && inProgress === drifted) return 'all-in-progress';
  return 'none';
}

/**
 * Drift-first sort:
 *   1. Repos with failed distributions first,
 *   2. then repos with drift,
 *   3. then aligned repos.
 * Stable secondary by owner/name.
 */
export function sortRepositoriesByDriftFirst(
  repos: RepositoryDrift[],
): RepositoryDrift[] {
  return [...repos].sort((a, b) => {
    const fa = repositoryHasFailedDistribution(a);
    const fb = repositoryHasFailedDistribution(b);
    if (fa !== fb) return fa ? -1 : 1;
    const da = repositoryHasDrift(a);
    const db = repositoryHasDrift(b);
    if (da !== db) return da ? -1 : 1;
    return `${a.repo.owner}/${a.repo.name}`.localeCompare(
      `${b.repo.owner}/${b.repo.name}`,
    );
  });
}

/**
 * Flatten one repo's targets into a single list of scoped PackageDrifts,
 * each tagged with its target. Used by the detail pane to render targets
 * as vertical sections without re-keying by package id.
 */
export type ScopedTargetPackage = {
  target: TargetDrift['target'];
  targetId: TargetDrift['id'];
  pkg: PackageDrift;
};

export function flattenRepositoryTargetPackages(
  repo: RepositoryDrift,
): ScopedTargetPackage[] {
  const out: ScopedTargetPackage[] = [];
  for (const t of repo.targets) {
    for (const p of t.packages) {
      out.push({ target: t.target, targetId: t.id, pkg: p });
    }
  }
  return out;
}
