import { differenceInDays, formatDistanceToNowStrict } from 'date-fns';
import type { DistributionStatus } from '@packmind/types';
import type {
  ArtifactDrift,
  InstallDriftReason,
  InstallLocation,
  PackageDrift,
  RepoInstall,
  RepoRef,
  TargetRef,
} from '../types';

export const STALE_DAYS_THRESHOLD = 60;

export function relativeDaysAgo(iso: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, differenceInDays(new Date(), parsed));
}

export function formatRelativeDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

export function isInstallBehind(install: RepoInstall): boolean {
  return install.driftReason !== 'aligned';
}

export function artifactBehindCount(art: ArtifactDrift): number {
  return art.installs.filter(isInstallBehind).length;
}

export type DriftArtifactEntry = {
  artifact: ArtifactDrift;
  reason: InstallDriftReason;
  deployedVersion: number;
  /** Empty string when the artifact was never distributed on this install. */
  lastDeployedAt: string;
};

export type InstallDriftEntry = {
  repo: RepoRef;
  target: TargetRef;
  branch: string;
  mostRecentDeployedAt: string | null;
  mostRecentDeployedAtDays: number;
  lastDistributionStatus: DistributionStatus | null;
  lastDistributedAt: string | null;
  behindArtifacts: DriftArtifactEntry[];
  alignedArtifactCount: number;
};

function locationKey(repoId: string, targetId: string): string {
  return `${repoId}::${targetId}`;
}

function emptyEntry(location: InstallLocation): InstallDriftEntry {
  return {
    repo: location.repo,
    target: location.target,
    branch: location.branch,
    mostRecentDeployedAt: null,
    mostRecentDeployedAtDays: Number.POSITIVE_INFINITY,
    lastDistributionStatus: location.lastDistributionStatus,
    lastDistributedAt: location.lastDistributedAt,
    behindArtifacts: [],
    alignedArtifactCount: 0,
  };
}

export function installDriftEntries(pkg: PackageDrift): InstallDriftEntry[] {
  const byLocation = new Map<string, InstallDriftEntry>();
  for (const location of pkg.installLocations) {
    byLocation.set(
      locationKey(location.repo.id, location.target.id),
      emptyEntry(location),
    );
  }
  for (const artifact of pkg.artifacts) {
    for (const inst of artifact.installs) {
      const entry = byLocation.get(locationKey(inst.repo.id, inst.target.id));
      if (!entry) continue;
      // Only deployed installs feed the "latest push" indicator — pending installs
      // have an empty lastDeployedAt because nothing ever shipped there.
      if (inst.lastDeployedAt) {
        const days = relativeDaysAgo(inst.lastDeployedAt);
        if (days < entry.mostRecentDeployedAtDays) {
          entry.mostRecentDeployedAtDays = days;
          entry.mostRecentDeployedAt = inst.lastDeployedAt;
        }
      }
      if (inst.driftReason === 'aligned') {
        entry.alignedArtifactCount += 1;
      } else {
        entry.behindArtifacts.push({
          artifact,
          reason: inst.driftReason,
          deployedVersion: inst.deployedVersion,
          lastDeployedAt: inst.lastDeployedAt,
        });
      }
    }
  }

  const entries = Array.from(byLocation.values());
  const drifted: InstallDriftEntry[] = [];
  const aligned: InstallDriftEntry[] = [];
  for (const entry of entries) {
    if (entry.behindArtifacts.length > 0) drifted.push(entry);
    else aligned.push(entry);
  }

  const driftedRepoMaxBehind = new Map<string, number>();
  for (const entry of drifted) {
    const current = driftedRepoMaxBehind.get(entry.repo.id) ?? 0;
    if (entry.behindArtifacts.length > current) {
      driftedRepoMaxBehind.set(entry.repo.id, entry.behindArtifacts.length);
    }
  }

  const cmpRepo = (a: InstallDriftEntry, b: InstallDriftEntry) =>
    (a.repo.owner + a.repo.name).localeCompare(b.repo.owner + b.repo.name);

  const cmpTarget = (a: InstallDriftEntry, b: InstallDriftEntry) => {
    if (a.target.isDefault && !b.target.isDefault) return -1;
    if (!a.target.isDefault && b.target.isDefault) return 1;
    return a.target.name.localeCompare(b.target.name);
  };

  drifted.sort((a, b) => {
    const aRepoMax = driftedRepoMaxBehind.get(a.repo.id) ?? 0;
    const bRepoMax = driftedRepoMaxBehind.get(b.repo.id) ?? 0;
    if (aRepoMax !== bRepoMax) return bRepoMax - aRepoMax;
    const repoCmp = cmpRepo(a, b);
    if (repoCmp !== 0) return repoCmp;
    const aBehind = a.behindArtifacts.length;
    const bBehind = b.behindArtifacts.length;
    if (aBehind !== bBehind) return bBehind - aBehind;
    return cmpTarget(a, b);
  });

  aligned.sort((a, b) => {
    const repoCmp = cmpRepo(a, b);
    if (repoCmp !== 0) return repoCmp;
    return cmpTarget(a, b);
  });

  return [...drifted, ...aligned];
}

export function packageMostRecentPush(
  pkg: PackageDrift,
): { label: string; days: number } | null {
  let best: { iso: string; days: number } | null = null;
  for (const art of pkg.artifacts) {
    for (const inst of art.installs) {
      if (!inst.lastDeployedAt) continue;
      const days = relativeDaysAgo(inst.lastDeployedAt);
      if (!best || days < best.days) {
        best = { iso: inst.lastDeployedAt, days };
      }
    }
  }
  if (!best) return null;
  return { label: formatRelativeDate(best.iso), days: best.days };
}
