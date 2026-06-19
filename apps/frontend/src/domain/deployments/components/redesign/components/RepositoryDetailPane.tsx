import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  PMAlert,
  PMBadge,
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMInput,
  PMLink,
  PMSpinner,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuArrowUpRight,
  LuBookOpen,
  LuChevronDown,
  LuChevronRight,
  LuGitBranch,
  LuRotateCw,
  LuSearch,
  LuTerminal,
  LuTrash2,
  LuTriangleAlert,
  LuWandSparkles,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import {
  DistributionStatus,
  type GitProviderId,
  type GitRepoId,
  type PackageId,
  type TargetId,
} from '@packmind/types';
import {
  packageHasDrift,
  packageHasFailedDistribution,
} from '../selectors/buildPackageDriftOverview';
import {
  formatRelativeDate,
  installDriftEntries,
  type DriftArtifactEntry,
} from '../selectors/installDriftEntries';
import {
  repositoryBehindInstallCount,
  repositoryDriftedTargetCount,
  repositoryFailedInstallCount,
  repositoryHasDrift,
  repositoryHasFailedDistribution,
  repositoryLockProfile,
  targetBehindInstallCount,
  targetFailedInstallCount,
} from '../selectors/buildRepositoryDriftOverview';
import type {
  ArtifactKind,
  PackageDrift,
  RepositoryDrift,
  TargetDrift,
} from '../types';

const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookOpen,
  command: LuTerminal,
  skill: LuWandSparkles,
};

const KIND_NOUN: Record<ArtifactKind, string> = {
  standard: 'standard',
  command: 'command',
  skill: 'skill',
};

const DISTRIBUTION_VERB: Record<DistributionStatus, string> = {
  [DistributionStatus.success]: 'Distributed',
  [DistributionStatus.failure]: 'Failed',
  [DistributionStatus.in_progress]: 'Started',
  [DistributionStatus.no_changes]: 'Checked',
  [DistributionStatus.pending_merge]: 'Awaiting merge',
  [DistributionStatus.to_be_removed]: 'Marked for removal',
  [DistributionStatus.removed]: 'Removed',
};

type RepositoryDetailPaneProps = {
  repo: RepositoryDrift;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onSyncPackageOnTarget: (
    packageId: PackageId,
    repoId: GitRepoId,
    targetId: TargetId,
  ) => void;
  onSyncRepository: (repoId: GitRepoId) => void;
  /** Link to a single package's distribution history, used to surface error logs. */
  packageHistoryHref: (packageId: PackageId) => string | null;
};

type PackageFilter = 'all' | 'drift' | 'failed' | 'aligned';

type PackageRowKey = string;

function packageRowKey(targetId: TargetId, packageId: PackageId): string {
  return `${targetId}::${packageId}`;
}

/**
 * Sort order within a target section: failed first, then drifted, then
 * aligned (alphabetical inside each group). Aligned packages always sink
 * to the bottom so attention lands on what needs action.
 */
function comparePackagesByStatus(a: PackageDrift, b: PackageDrift): number {
  const aFailed = packageHasFailedDistribution(a);
  const bFailed = packageHasFailedDistribution(b);
  if (aFailed !== bFailed) return aFailed ? -1 : 1;
  const aDrift = packageHasDrift(a);
  const bDrift = packageHasDrift(b);
  if (aDrift !== bDrift) return aDrift ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export function RepositoryDetailPane({
  repo,
  providersWithToken,
  isProvidersLoading,
  onSyncPackageOnTarget,
  onSyncRepository,
  packageHistoryHref,
}: Readonly<RepositoryDetailPaneProps>) {
  const lockProfile = repositoryLockProfile(
    repo,
    providersWithToken,
    isProvidersLoading,
  );
  const hasDrift = repositoryHasDrift(repo);
  const hasFailure = repositoryHasFailedDistribution(repo);
  const driftedTargets = repositoryDriftedTargetCount(repo);
  const behindInstallCount = repositoryBehindInstallCount(repo);
  const failedInstallCount = repositoryFailedInstallCount(repo);

  const [selectedKeys, setSelectedKeys] = useState<Set<PackageRowKey>>(
    () => new Set(),
  );
  const [packageQuery, setPackageQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState<PackageFilter>('all');

  useEffect(() => {
    setSelectedKeys(new Set());
    setPackageQuery('');
    setPackageFilter('all');
  }, [repo.id]);

  const packageCounts = useMemo(() => {
    let drift = 0;
    let failed = 0;
    let total = 0;
    for (const t of repo.targets) {
      for (const p of t.packages) {
        total++;
        if (packageHasDrift(p)) drift++;
        if (packageHasFailedDistribution(p)) failed++;
      }
    }
    return {
      all: total,
      drift,
      failed,
      aligned: total - drift,
    };
  }, [repo]);

  const filteredTargets = useMemo(() => {
    const q = packageQuery.trim().toLowerCase();
    const matchesFilter = (p: PackageDrift): boolean => {
      if (packageFilter === 'drift') return packageHasDrift(p);
      if (packageFilter === 'failed') return packageHasFailedDistribution(p);
      if (packageFilter === 'aligned') return !packageHasDrift(p);
      return true;
    };
    return repo.targets
      .map((t) => ({
        ...t,
        packages: t.packages
          .filter((p) => {
            if (!matchesFilter(p)) return false;
            if (!q) return true;
            return (
              p.name.toLowerCase().includes(q) ||
              t.target.name.toLowerCase().includes(q)
            );
          })
          .sort(comparePackagesByStatus),
      }))
      .filter((t) => t.packages.length > 0);
  }, [repo, packageFilter, packageQuery]);

  const hasActiveFilter = packageFilter !== 'all' || packageQuery.length > 0;
  const clearFilters = () => {
    setPackageFilter('all');
    setPackageQuery('');
  };

  const driftedRowKeys = useMemo(() => {
    const keys: PackageRowKey[] = [];
    for (const t of repo.targets) {
      for (const p of t.packages) {
        if (packageHasDrift(p)) keys.push(packageRowKey(t.id, p.id));
      }
    }
    return keys;
  }, [repo]);

  const toggleRow = (key: PackageRowKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedDriftedCount = useMemo(() => {
    let n = 0;
    for (const k of driftedRowKeys) if (selectedKeys.has(k)) n++;
    return n;
  }, [driftedRowKeys, selectedKeys]);

  const headerLockTooltip = (() => {
    if (lockProfile === 'all-no-app-token') {
      return 'Use `packmind-cli install` to update distributions on this repository.';
    }
    if (lockProfile === 'all-in-progress') {
      return 'A distribution is in progress for every drifted target.';
    }
    return null;
  })();
  const repoSyncDisabled = lockProfile !== 'none';

  return (
    <PMVStack gap={0} align="stretch" minH={0} h="100%">
      <PMBox
        paddingX={6}
        paddingY={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        bg="background.primary"
      >
        <PMVStack gap={2.5} align="stretch">
          <PMHStack gap={3} align="start" justify="space-between">
            <PMVStack gap={1} align="start" flex={1} minW={0}>
              <PMHeading level="h3" color="primary">
                {repo.repo.owner}/{repo.repo.name}
              </PMHeading>
              <PMHStack gap={2} align="center">
                <PMHStack
                  gap="4px"
                  align="center"
                  color="text.secondary"
                  aria-label={`Branch ${repo.branch}`}
                >
                  <PMIcon fontSize="xs">
                    <LuGitBranch />
                  </PMIcon>
                  <PMText
                    fontSize="xs"
                    fontFamily="mono"
                    fontVariantNumeric="tabular-nums"
                  >
                    {repo.branch}
                  </PMText>
                </PMHStack>
              </PMHStack>
            </PMVStack>
            {hasDrift && (
              <PMTooltip label={headerLockTooltip} placement="top">
                <PMButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onSyncRepository(repo.id)}
                  disabled={repoSyncDisabled}
                  title={`Distribute all drift for ${repo.repo.owner}/${repo.repo.name}`}
                >
                  <PMIcon fontSize="sm">
                    <LuRotateCw />
                  </PMIcon>
                  Distribute repository
                </PMButton>
              </PMTooltip>
            )}
          </PMHStack>
          <PMHStack gap={5} align="center" wrap="wrap">
            <SummaryStat
              label="Targets"
              value={repo.targets.length.toString()}
            />
            <SummaryStat
              label="Packages"
              value={packageCounts.all.toString()}
            />
            {hasDrift ? (
              <SummaryStat
                label="Drift"
                value={`${driftedTargets} target${driftedTargets === 1 ? '' : 's'}, ${behindInstallCount} distribution${behindInstallCount === 1 ? '' : 's'}`}
                tone="warn"
              />
            ) : (
              <SummaryStat label="Status" value="Aligned" tone="ok" />
            )}
            {hasFailure && (
              <SummaryStat
                label="Failed"
                value={`${failedInstallCount} distribution${failedInstallCount === 1 ? '' : 's'}`}
                tone="error"
              />
            )}
          </PMHStack>
          {lockProfile === 'all-no-app-token' && (
            <PMAlert.Root status="warning">
              <PMAlert.Indicator>
                <PMIcon>
                  <LuTriangleAlert />
                </PMIcon>
              </PMAlert.Indicator>
              <PMAlert.Content>
                <PMAlert.Title>
                  Use `packmind-cli install` to update distributions on this
                  repository.
                </PMAlert.Title>
              </PMAlert.Content>
            </PMAlert.Root>
          )}
        </PMVStack>
      </PMBox>

      <PMBox
        paddingX={6}
        paddingY={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        bg="background.primary"
      >
        <PMHStack gap={3} align="center" wrap="wrap">
          <PMBox position="relative" flex={1} minW="200px" maxW="320px">
            <PMBox
              position="absolute"
              left="10px"
              top="50%"
              transform="translateY(-50%)"
              color="text.faded"
              pointerEvents="none"
              display="flex"
              alignItems="center"
            >
              <PMIcon fontSize="sm">
                <LuSearch />
              </PMIcon>
            </PMBox>
            <PMInput
              placeholder="Filter by package or target"
              value={packageQuery}
              onChange={(e) => setPackageQuery(e.target.value)}
              size="sm"
              paddingLeft="32px"
            />
          </PMBox>
          <PackageFilterControl
            value={packageFilter}
            counts={packageCounts}
            onChange={setPackageFilter}
          />
        </PMHStack>
      </PMBox>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filteredTargets.length === 0 ? (
          <FilteredZero
            packageFilter={packageFilter}
            packageQuery={packageQuery}
            hasActiveFilter={hasActiveFilter}
            onClear={clearFilters}
          />
        ) : (
          <PMVStack gap={0} align="stretch">
            {filteredTargets.map((t) => (
              <TargetSection
                key={t.id}
                target={t}
                providersWithToken={providersWithToken}
                isProvidersLoading={isProvidersLoading}
                selectedKeys={selectedKeys}
                onToggleRow={toggleRow}
                onSyncPackageOnTarget={(packageId) =>
                  onSyncPackageOnTarget(packageId, repo.id, t.id)
                }
                packageHistoryHref={packageHistoryHref}
              />
            ))}
          </PMVStack>
        )}
      </PMBox>

      {hasDrift && (
        <PMBox
          paddingX={6}
          paddingY={2.5}
          borderTopWidth="1px"
          borderColor="border.tertiary"
          bg="background.secondary"
          position="sticky"
          bottom={0}
        >
          <PMHStack gap={3} align="center" justify="space-between">
            <PMText fontSize="xs" color="secondary">
              {selectedDriftedCount === 0
                ? 'Select packages to redistribute.'
                : `${selectedDriftedCount} of ${driftedRowKeys.length} drifted selected.`}
            </PMText>
            <PMButton
              variant="primary"
              size="sm"
              disabled={selectedDriftedCount === 0 || repoSyncDisabled}
              onClick={() => {
                for (const key of selectedKeys) {
                  if (!driftedRowKeys.includes(key)) continue;
                  const [targetIdStr, packageIdStr] = key.split('::');
                  onSyncPackageOnTarget(
                    packageIdStr as PackageId,
                    repo.id,
                    targetIdStr as TargetId,
                  );
                }
              }}
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              Redistribute selected
            </PMButton>
          </PMHStack>
        </PMBox>
      )}
    </PMVStack>
  );
}

type TargetSectionProps = {
  target: TargetDrift;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  selectedKeys: Set<PackageRowKey>;
  onToggleRow: (key: PackageRowKey) => void;
  onSyncPackageOnTarget: (packageId: PackageId) => void;
  packageHistoryHref: (packageId: PackageId) => string | null;
};

function TargetSection({
  target,
  providersWithToken,
  isProvidersLoading,
  selectedKeys,
  onToggleRow,
  onSyncPackageOnTarget,
  packageHistoryHref,
}: Readonly<TargetSectionProps>) {
  const behind = targetBehindInstallCount(target);
  const failed = targetFailedInstallCount(target);
  const isAligned = behind === 0 && failed === 0;

  return (
    <PMBox borderBottomWidth="1px" borderColor="border.tertiary">
      <PMHStack
        gap={2}
        align="center"
        paddingX={6}
        paddingY={1.5}
        bg="background.tertiary"
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack gap={2} align="center" flex={1} minW={0}>
          {target.target.isDefault ? (
            <PMText fontSize="xs" color="secondary" fontWeight="medium">
              Repository root
            </PMText>
          ) : (
            <PMText
              fontSize="xs"
              color="primary"
              fontWeight="medium"
              fontFamily="mono"
              truncate
            >
              {target.target.name}
            </PMText>
          )}
        </PMHStack>
        <PMText
          fontSize="xs"
          color={failed > 0 ? 'error' : behind > 0 ? 'warning' : 'secondary'}
          fontVariantNumeric="tabular-nums"
          flexShrink={0}
        >
          {isAligned
            ? `${target.packages.length} aligned`
            : failed > 0
              ? `${failed} failed`
              : `${behind} drifted`}
        </PMText>
      </PMHStack>

      <PMVStack gap={0} align="stretch">
        {target.packages.map((p) => (
          <PackageOnTargetRow
            key={p.id}
            pkg={p}
            rowKey={packageRowKey(target.id, p.id)}
            selected={selectedKeys.has(packageRowKey(target.id, p.id))}
            providersWithToken={providersWithToken}
            isProvidersLoading={isProvidersLoading}
            onToggle={() => onToggleRow(packageRowKey(target.id, p.id))}
            onSync={() => onSyncPackageOnTarget(p.id)}
            historyHref={packageHistoryHref(p.id)}
          />
        ))}
      </PMVStack>
    </PMBox>
  );
}

type PackageOnTargetRowProps = {
  pkg: PackageDrift;
  rowKey: PackageRowKey;
  selected: boolean;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onToggle: () => void;
  onSync: () => void;
  historyHref: string | null;
};

const LOCK_TOOLTIP: Record<string, string> = {
  'in-progress': 'Distribution in progress for this package on this target.',
  'no-app-token': 'Use `packmind-cli install` to update this distribution.',
};

function PackageOnTargetRow({
  pkg,
  selected,
  providersWithToken,
  isProvidersLoading,
  onToggle,
  onSync,
  historyHref,
}: Readonly<PackageOnTargetRowProps>) {
  const [expanded, setExpanded] = useState(false);
  const hasDrift = packageHasDrift(pkg);
  const hasFailure = packageHasFailedDistribution(pkg);

  const entries = useMemo(() => installDriftEntries(pkg), [pkg]);
  // Each scoped PackageDrift has exactly one install location.
  const entry = entries[0];
  const behindCount = entry?.behindArtifacts.length ?? 0;
  const alignedCount = entry?.alignedArtifactCount ?? 0;
  const totalArtifactsOnInstall = behindCount + alignedCount;

  const lockReason = (() => {
    if (isProvidersLoading) return null;
    if (entry?.lastDistributionStatus === DistributionStatus.in_progress) {
      return 'in-progress' as const;
    }
    if (!providersWithToken.has(pkg.installLocations[0]?.repo.providerId)) {
      return 'no-app-token' as const;
    }
    return null;
  })();

  const checkboxDisabled = lockReason !== null || !hasDrift;
  const syncDisabled = !hasDrift || lockReason !== null;

  return (
    <PMBox
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _last={{ borderBottom: 'none' }}
      bg={hasDrift && selected ? 'background.secondary' : 'background.primary'}
      transition="background-color 120ms ease-out"
    >
      <PMHStack gap={3} align="center" paddingX={6} paddingY={3}>
        <PMBox flexShrink={0} display="flex" alignItems="center" width="20px">
          {hasDrift && (
            <PMTooltip
              label={lockReason ? LOCK_TOOLTIP[lockReason] : null}
              placement="top"
            >
              <PMBox display="inline-flex" alignItems="center">
                <PMCheckbox
                  size="sm"
                  checked={selected}
                  disabled={checkboxDisabled}
                  onCheckedChange={onToggle}
                  aria-label={`Select ${pkg.name} for redistribution`}
                />
              </PMBox>
            </PMTooltip>
          )}
        </PMBox>

        <PMBox
          as="button"
          onClick={() => {
            if (!hasDrift) return;
            setExpanded((v) => !v);
          }}
          bg="transparent"
          border="none"
          cursor={hasDrift ? 'pointer' : 'default'}
          flex={1}
          minW={0}
          textAlign="left"
          paddingY={1}
          _hover={hasDrift ? { color: 'text.primary' } : undefined}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'branding.primary',
            outlineOffset: '2px',
            borderRadius: 'sm',
          }}
          aria-expanded={expanded}
          aria-disabled={!hasDrift}
        >
          <PMVStack gap={0.5} align="start">
            <PMHStack gap={2} align="center" maxW="100%">
              {hasDrift && (
                <PMIcon fontSize="sm" color="text.secondary">
                  {expanded ? <LuChevronDown /> : <LuChevronRight />}
                </PMIcon>
              )}
              <PMText
                fontSize="sm"
                fontWeight="medium"
                color="primary"
                truncate
              >
                {pkg.name}
              </PMText>
            </PMHStack>
            {pkg.description && (
              <PMText fontSize="xs" color="faded" truncate maxW="60ch">
                {pkg.description}
              </PMText>
            )}
          </PMVStack>
        </PMBox>

        <PMVStack gap={0.5} align="flex-end" flexShrink={0}>
          <PackageRowStateLine
            entry={entry}
            hasDrift={hasDrift}
            hasFailure={hasFailure}
            behindCount={behindCount}
            totalArtifactsOnInstall={totalArtifactsOnInstall}
          />
          {entry?.lastDistributedAt && (
            <PackageRowEventLine
              status={entry.lastDistributionStatus}
              lastAt={entry.lastDistributedAt}
              hasFailure={hasFailure}
              historyHref={historyHref}
            />
          )}
        </PMVStack>

        <PMTooltip
          label={lockReason ? LOCK_TOOLTIP[lockReason] : null}
          placement="top"
        >
          <PMBox display="inline-flex">
            <PMButton
              variant="tertiary"
              size="sm"
              disabled={syncDisabled}
              onClick={onSync}
              aria-label={`Distribute ${pkg.name} on this target`}
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
            </PMButton>
          </PMBox>
        </PMTooltip>
      </PMHStack>

      {expanded && hasDrift && entry && (
        <PMBox
          paddingLeft="56px"
          paddingRight={6}
          paddingBottom={3}
          paddingTop={1}
          bg="background.secondary"
        >
          <PMVStack gap={0} align="stretch">
            {entry.behindArtifacts.map((b) => (
              <DriftArtifactRow
                key={`${b.artifact.id}-${b.reason}`}
                entry={b}
              />
            ))}
          </PMVStack>
        </PMBox>
      )}
    </PMBox>
  );
}

type PackageRowStateLineProps = {
  entry: ReturnType<typeof installDriftEntries>[number] | undefined;
  hasDrift: boolean;
  hasFailure: boolean;
  behindCount: number;
  totalArtifactsOnInstall: number;
};

function PackageRowStateLine({
  entry,
  hasDrift,
  hasFailure,
  behindCount,
  totalArtifactsOnInstall,
}: Readonly<PackageRowStateLineProps>) {
  const inProgress =
    entry?.lastDistributionStatus === DistributionStatus.in_progress;

  if (inProgress) {
    return (
      <PMHStack gap={2} align="center">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="blue.300"
          aria-hidden
        />
        <PMHStack gap={1.5} align="center" color="blue.300">
          <PMSpinner size="xs" />
          <PMText fontSize="xs">Distributing…</PMText>
        </PMHStack>
      </PMHStack>
    );
  }

  if (hasFailure) {
    return (
      <PMHStack gap={2} align="center">
        <PMBadge colorPalette="red" size="sm">
          <PMIcon fontSize="xs">
            <LuTriangleAlert />
          </PMIcon>
          Failed
        </PMBadge>
        {hasDrift && (
          <PMText
            fontSize="xs"
            color="warning"
            fontVariantNumeric="tabular-nums"
          >
            {behindCount} of {totalArtifactsOnInstall} behind
          </PMText>
        )}
      </PMHStack>
    );
  }

  if (hasDrift) {
    return (
      <PMHStack gap={2} align="center">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="orange.500"
          aria-hidden
        />
        <PMText fontSize="xs" color="warning" fontVariantNumeric="tabular-nums">
          {behindCount} of {totalArtifactsOnInstall} behind
        </PMText>
      </PMHStack>
    );
  }

  return (
    <PMHStack gap={2} align="center">
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg="green.500"
        aria-hidden
      />
      <PMText fontSize="xs" color="success">
        Aligned
      </PMText>
    </PMHStack>
  );
}

function PackageRowEventLine({
  status,
  lastAt,
  hasFailure,
  historyHref,
}: Readonly<{
  status: DistributionStatus | null;
  lastAt: string;
  hasFailure: boolean;
  historyHref: string | null;
}>) {
  const verb = status ? DISTRIBUTION_VERB[status] : 'Last activity';
  const text = `${verb} ${formatRelativeDate(lastAt)}`;
  if (hasFailure && historyHref) {
    return (
      <PMLink asChild variant="underline" fontSize="11px" color="error">
        <Link to={historyHref}>
          {text}
          <PMIcon fontSize="xs" marginLeft="2px">
            <LuArrowUpRight />
          </PMIcon>
        </Link>
      </PMLink>
    );
  }
  return (
    <PMText fontSize="11px" color="faded" fontVariantNumeric="tabular-nums">
      {text}
    </PMText>
  );
}

function DriftArtifactRow({ entry }: Readonly<{ entry: DriftArtifactEntry }>) {
  const Icon = KIND_ICON[entry.artifact.kind];
  return (
    <PMHStack
      gap={3}
      align="center"
      paddingY={1.5}
      paddingX={2}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _last={{ borderBottom: 'none' }}
    >
      <PMIcon fontSize="sm" color="text.faded">
        <Icon />
      </PMIcon>
      <PMText
        fontSize="sm"
        color="secondary"
        fontFamily={entry.artifact.kind === 'command' ? 'mono' : undefined}
        flex={1}
        minW={0}
        truncate
      >
        {entry.artifact.name}
      </PMText>
      <DriftReasonIndicator entry={entry} />
    </PMHStack>
  );
}

function DriftReasonIndicator({
  entry,
}: Readonly<{ entry: DriftArtifactEntry }>) {
  if (entry.reason === 'needs-removal') {
    return (
      <PMTooltip
        label={`The ${KIND_NOUN[entry.artifact.kind]} deletion will be effective on the repository after redistribution.`}
        placement="top"
      >
        <PMHStack gap={1.5} align="center" cursor="help">
          <PMIcon fontSize="xs" color="red.500">
            <LuTrash2 />
          </PMIcon>
          <PMBadge colorPalette="red" size="sm">
            Needs removal
          </PMBadge>
        </PMHStack>
      </PMTooltip>
    );
  }
  if (entry.reason === 'not-distributed') {
    return (
      <PMTooltip
        label="Added to the package — will be pushed on next distribution."
        placement="top"
      >
        <PMBadge colorPalette="red" size="sm">
          Not distributed
        </PMBadge>
      </PMTooltip>
    );
  }
  return (
    <PMHStack gap={2} align="center">
      <PMText fontSize="xs" color="warning" fontVariantNumeric="tabular-nums">
        v{entry.deployedVersion}
      </PMText>
      <PMIcon fontSize="xs" color="text.faded">
        <LuArrowRight />
      </PMIcon>
      <PMText
        fontSize="xs"
        color="primary"
        fontWeight="medium"
        fontVariantNumeric="tabular-nums"
      >
        v{entry.artifact.packmindVersion}
      </PMText>
    </PMHStack>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: Readonly<{
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'error';
}>) {
  const color =
    tone === 'error'
      ? 'error'
      : tone === 'warn'
        ? 'warning'
        : tone === 'ok'
          ? 'success'
          : 'primary';
  return (
    <PMHStack gap={1.5} align="baseline">
      <PMText
        fontSize="11px"
        textTransform="uppercase"
        letterSpacing="wider"
        color="faded"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText
        fontSize="sm"
        fontWeight="medium"
        color={color}
        fontVariantNumeric="tabular-nums"
      >
        {value}
      </PMText>
    </PMHStack>
  );
}

type PackageFilterControlProps = {
  value: PackageFilter;
  counts: { all: number; drift: number; failed: number; aligned: number };
  onChange: (value: PackageFilter) => void;
};

const FILTER_ITEMS: Array<{
  value: PackageFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'drift', label: 'Drift', dotColor: 'orange.500' },
  { value: 'failed', label: 'Failed', dotColor: 'red.500' },
  { value: 'aligned', label: 'Aligned', dotColor: 'green.500' },
];

function PackageFilterControl({
  value,
  counts,
  onChange,
}: Readonly<PackageFilterControlProps>) {
  return (
    <PMHStack
      gap={0}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
      role="tablist"
      aria-label="Filter packages by drift state"
    >
      {FILTER_ITEMS.map((item, idx) => {
        const active = value === item.value;
        const count = counts[item.value];
        return (
          <PMBox
            key={item.value}
            as="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            bg={active ? 'background.secondary' : 'transparent'}
            border="none"
            borderLeftWidth={idx === 0 ? 0 : '1px'}
            borderColor="border.tertiary"
            cursor="pointer"
            paddingY="6px"
            paddingX={2.5}
            transition="background-color 120ms ease-out"
            _hover={active ? undefined : { bg: 'background.tertiary' }}
            _focusVisible={{
              outline: 'none',
              boxShadow:
                'inset 0 0 0 2px var(--chakra-colors-branding-primary)',
            }}
          >
            <PMHStack gap="6px" align="center" justify="center">
              {item.dotColor && (
                <PMBox
                  width="6px"
                  height="6px"
                  borderRadius="full"
                  bg={item.dotColor}
                  aria-hidden
                />
              )}
              <PMText
                fontSize="xs"
                color={active ? 'primary' : 'secondary'}
                fontWeight={active ? 'semibold' : 'medium'}
              >
                {item.label}
              </PMText>
              <PMText
                fontSize="11px"
                color="faded"
                fontVariantNumeric="tabular-nums"
              >
                {count}
              </PMText>
            </PMHStack>
          </PMBox>
        );
      })}
    </PMHStack>
  );
}

function FilteredZero({
  packageFilter,
  packageQuery,
  hasActiveFilter,
  onClear,
}: Readonly<{
  packageFilter: PackageFilter;
  packageQuery: string;
  hasActiveFilter: boolean;
  onClear: () => void;
}>) {
  if (!hasActiveFilter) {
    return (
      <PMVStack gap={2} align="center" paddingY={10}>
        <PMText fontSize="sm" color="secondary">
          No packages on this repository yet.
        </PMText>
      </PMVStack>
    );
  }
  const filterLabel =
    packageFilter === 'drift'
      ? 'drifted'
      : packageFilter === 'failed'
        ? 'failed'
        : 'aligned';
  const message = packageQuery
    ? packageFilter === 'all'
      ? `No packages match “${packageQuery}”.`
      : `No ${filterLabel} packages match “${packageQuery}”.`
    : packageFilter === 'drift'
      ? 'No drifted packages on this repository.'
      : packageFilter === 'failed'
        ? 'No failed distributions on this repository.'
        : 'No aligned packages on this repository.';
  return (
    <PMVStack gap={2} align="start" padding={6}>
      <PMText fontSize="sm" color="secondary">
        {message}
      </PMText>
      <PMBox
        as="button"
        fontSize="xs"
        color="branding.primary"
        bg="transparent"
        border="none"
        cursor="pointer"
        padding={0}
        _hover={{ color: 'blue.300' }}
        onClick={onClear}
      >
        Clear filters
      </PMBox>
    </PMVStack>
  );
}
