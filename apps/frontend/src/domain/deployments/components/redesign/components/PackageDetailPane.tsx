import { useEffect, useMemo, useState } from 'react';
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
  PMSpinner,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuBookOpen,
  LuChevronDown,
  LuChevronRight,
  LuGitBranch,
  LuRotateCw,
  LuSearch,
  LuTerminal,
  LuTrash2,
  LuWandSparkles,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { format } from 'date-fns';
import {
  DistributionStatus,
  type GitProviderId,
  type PackageId,
} from '@packmind/types';
import { packageBehindInstallCount } from '../selectors/buildPackageDriftOverview';
import {
  installDriftEntries,
  packageMostRecentPush,
  STALE_DAYS_THRESHOLD,
  formatRelativeDate,
  type DriftArtifactEntry,
  type InstallDriftEntry,
} from '../selectors/installDriftEntries';
import {
  installLockReason,
  type InstallLockReason,
} from '../selectors/installLock';
import type { ArtifactKind, PackageDrift } from '../types';

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
  [DistributionStatus.pending_merge]: 'Pending merge',
  [DistributionStatus.to_be_removed]: 'Marked for removal',
  [DistributionStatus.removed]: 'Removed',
};

function formatAbsoluteDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return format(parsed, 'yyyy-MM-dd h:mm a');
}

type PackageDetailPaneProps = {
  pkg: PackageDrift;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onSyncPackage: (pkgId: PackageId, installKeys?: string[]) => void;
};

type InstallDriftFilter = 'all' | 'drift' | 'aligned';

function installKey(repoId: string, targetId: string): string {
  return `${repoId}::${targetId}`;
}

export function PackageDetailPane({
  pkg,
  providersWithToken,
  isProvidersLoading,
  onSyncPackage,
}: Readonly<PackageDetailPaneProps>) {
  const totalInstalls = pkg.installLocations.length;
  const behindInstallCount = packageBehindInstallCount(pkg);
  const hasDrift = behindInstallCount > 0;
  const mostRecentPush = useMemo(() => packageMostRecentPush(pkg), [pkg]);

  const entries = useMemo(() => installDriftEntries(pkg), [pkg]);
  const lockByKey = useMemo(() => {
    const map = new Map<string, InstallLockReason | null>();
    for (const e of entries) {
      map.set(
        installKey(e.repo.id, e.target.id),
        installLockReason(e, providersWithToken, isProvidersLoading),
      );
    }
    return map;
  }, [entries, providersWithToken, isProvidersLoading]);
  const driftedKeys = useMemo(
    () =>
      entries
        .filter((e) => e.behindArtifacts.length > 0)
        .map((e) => installKey(e.repo.id, e.target.id)),
    [entries],
  );
  const driftedLockCounts = useMemo(() => {
    let inProgress = 0;
    let noAppToken = 0;
    for (const key of driftedKeys) {
      const reason = lockByKey.get(key) ?? null;
      if (reason === 'in-progress') inProgress++;
      else if (reason === 'no-app-token') noAppToken++;
    }
    return {
      inProgress,
      noAppToken,
      locked: inProgress + noAppToken,
    };
  }, [driftedKeys, lockByKey]);
  const allDriftedLocked =
    driftedKeys.length > 0 && driftedLockCounts.locked === driftedKeys.length;
  const headerLockTooltip = (() => {
    if (!allDriftedLocked) return null;
    if (driftedLockCounts.inProgress === driftedKeys.length) {
      return 'A distribution is already in progress for every drifted target.';
    }
    if (driftedLockCounts.noAppToken === driftedKeys.length) {
      return 'Every drifted target lives on a provider without a token — use `packmind-cli install`.';
    }
    return 'Every drifted target is either in progress or distributed via `packmind-cli install`.';
  })();

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const [repoQuery, setRepoQuery] = useState('');
  const [installFilter, setInstallFilter] = useState<InstallDriftFilter>('all');

  useEffect(() => {
    setSelectedKeys(new Set());
    setRepoQuery('');
    setInstallFilter('all');
  }, [pkg.id]);

  const installCounts = useMemo(() => {
    let drift = 0;
    for (const e of entries) {
      if (e.behindArtifacts.length > 0) drift++;
    }
    return {
      all: entries.length,
      drift,
      aligned: entries.length - drift,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (installFilter === 'drift')
      list = list.filter((e) => e.behindArtifacts.length > 0);
    else if (installFilter === 'aligned')
      list = list.filter((e) => e.behindArtifacts.length === 0);
    const q = repoQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const full = `${e.repo.owner}/${e.repo.name}`.toLowerCase();
        return (
          full.includes(q) ||
          e.branch.toLowerCase().includes(q) ||
          e.target.name.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [entries, installFilter, repoQuery]);

  const hasActiveFilter = installFilter !== 'all' || repoQuery.length > 0;
  const clearFilters = () => {
    setInstallFilter('all');
    setRepoQuery('');
  };

  const toggleInstall = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedDriftedCount = useMemo(() => {
    let count = 0;
    for (const key of driftedKeys) {
      if (selectedKeys.has(key) && !lockByKey.get(key)) count += 1;
    }
    return count;
  }, [driftedKeys, selectedKeys, lockByKey]);

  return (
    <PMVStack gap={0} align="stretch" minH={0}>
      <PMBox
        paddingX={6}
        paddingY={5}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        bg="background.primary"
      >
        <PMVStack gap={3} align="stretch">
          <PMHStack gap={3} align="start" justify="space-between">
            <PMVStack gap={1.5} align="start" flex={1} minW={0}>
              <PMHeading level="h2" color="primary">
                {pkg.name}
              </PMHeading>
              <PMText fontSize="sm" color="secondary" maxW="68ch">
                {pkg.description}
              </PMText>
            </PMVStack>
            {hasDrift && (
              <PMTooltip label={headerLockTooltip} placement="top">
                <PMButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onSyncPackage(pkg.id)}
                  disabled={allDriftedLocked}
                  title={`Distribute package across ${behindInstallCount} distribution${behindInstallCount === 1 ? '' : 's'}`}
                >
                  <PMIcon fontSize="sm">
                    <LuRotateCw />
                  </PMIcon>
                  Distribute package
                </PMButton>
              </PMTooltip>
            )}
          </PMHStack>
          <PMHStack gap={5} align="center" wrap="wrap">
            <SummaryStat
              label="Artifacts"
              value={pkg.artifacts.length.toString()}
            />
            <SummaryStat
              label="Distributions"
              value={totalInstalls.toString()}
            />
            {hasDrift ? (
              <SummaryStat
                label="Drift"
                value={`${behindInstallCount} distribution${behindInstallCount === 1 ? '' : 's'} behind`}
                tone="warn"
              />
            ) : (
              <SummaryStat
                label="Latest push"
                value={mostRecentPush?.label ?? '—'}
                tone={
                  mostRecentPush && mostRecentPush.days >= STALE_DAYS_THRESHOLD
                    ? 'warn'
                    : 'ok'
                }
              />
            )}
          </PMHStack>
          {!hasDrift && (
            <PMAlert.Root status="success">
              <PMAlert.Indicator />
              <PMAlert.Title>
                All {totalInstalls} distribution
                {totalInstalls === 1 ? '' : 's'} are on the latest version of
                every bundled artifact.
              </PMAlert.Title>
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
              placeholder="Filter by repo, branch, or target"
              value={repoQuery}
              onChange={(e) => setRepoQuery(e.target.value)}
              size="sm"
              paddingLeft="32px"
            />
          </PMBox>
          <InstallFilterControl
            value={installFilter}
            counts={installCounts}
            onChange={setInstallFilter}
          />
        </PMHStack>
      </PMBox>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filteredEntries.length === 0 ? (
          <InstallEmptyState
            installFilter={installFilter}
            repoQuery={repoQuery}
            hasActiveFilter={hasActiveFilter}
            onClear={clearFilters}
          />
        ) : (
          <PMVStack gap={0} align="stretch">
            {filteredEntries.map((entry) => {
              const key = installKey(entry.repo.id, entry.target.id);
              return (
                <InstallRow
                  key={key}
                  entry={entry}
                  selected={selectedKeys.has(key)}
                  lockReason={lockByKey.get(key) ?? null}
                  onToggle={() => toggleInstall(key)}
                />
              );
            })}
          </PMVStack>
        )}
      </PMBox>

      {hasDrift && (
        <PMBox
          paddingX={6}
          paddingY={4}
          borderTopWidth="1px"
          borderColor="border.tertiary"
          bg="background.secondary"
          position="sticky"
          bottom={0}
        >
          <PMHStack gap={3} align="center" justify="space-between">
            <PMText fontSize="xs" color="secondary">
              {selectedDriftedCount === 0
                ? 'Select distributions to redistribute the package.'
                : `${selectedDriftedCount} of ${behindInstallCount} drifted distribution${behindInstallCount === 1 ? '' : 's'} selected.`}
            </PMText>
            <PMButton
              variant="primary"
              size="sm"
              disabled={selectedDriftedCount === 0}
              onClick={() =>
                onSyncPackage(
                  pkg.id,
                  Array.from(selectedKeys).filter((k) =>
                    driftedKeys.includes(k),
                  ),
                )
              }
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              Redistribute to selected
            </PMButton>
          </PMHStack>
        </PMBox>
      )}
    </PMVStack>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: Readonly<{
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warn';
}>) {
  const color =
    tone === 'warn' ? 'warning' : tone === 'ok' ? 'success' : 'primary';
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

type InstallRowProps = {
  entry: InstallDriftEntry;
  selected: boolean;
  lockReason: InstallLockReason | null;
  onToggle: () => void;
};

const LOCK_CHECKBOX_TOOLTIP: Record<InstallLockReason, string> = {
  'in-progress': 'Distribution in progress for this target.',
  'no-app-token':
    'This provider has no token — use `packmind-cli install` to update this distribution.',
};

function InstallRow({
  entry,
  selected,
  lockReason,
  onToggle,
}: Readonly<InstallRowProps>) {
  const behindCount = entry.behindArtifacts.length;
  const hasDrift = behindCount > 0;
  const [expanded, setExpanded] = useState(false);
  const totalArtifactsOnInstall = behindCount + entry.alignedArtifactCount;
  const checkboxDisabled = lockReason !== null;

  return (
    <PMBox
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg={hasDrift && selected ? 'background.secondary' : 'background.primary'}
      transition="background-color 120ms ease-out"
    >
      <PMHStack gap={3} align="center" paddingX={6} paddingY={3}>
        <PMBox flexShrink={0} display="flex" alignItems="center" width="20px">
          {hasDrift ? (
            <PMTooltip
              label={lockReason ? LOCK_CHECKBOX_TOOLTIP[lockReason] : null}
              placement="top"
            >
              <PMBox display="inline-flex" alignItems="center">
                <PMCheckbox
                  size="sm"
                  checked={selected}
                  disabled={checkboxDisabled}
                  onCheckedChange={() => onToggle()}
                  aria-label={`Select ${entry.repo.owner}/${entry.repo.name}${entry.target.isDefault ? '' : ' (' + entry.target.name + ')'}`}
                />
              </PMBox>
            </PMTooltip>
          ) : null}
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
          _hover={{ color: 'text.primary' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'branding.primary',
            outlineOffset: '2px',
            borderRadius: 'sm',
          }}
          aria-expanded={expanded}
          aria-disabled={!hasDrift}
        >
          <PMHStack gap={2} align="center" wrap="wrap">
            {hasDrift && (
              <PMIcon fontSize="sm" color="text.secondary">
                {expanded ? <LuChevronDown /> : <LuChevronRight />}
              </PMIcon>
            )}
            <PMText fontSize="sm" fontWeight="medium" color="primary" truncate>
              {entry.repo.owner}/{entry.repo.name}
            </PMText>
            <BranchChip branch={entry.branch} />
            {!entry.target.isDefault && <TargetChip name={entry.target.name} />}
          </PMHStack>
        </PMBox>

        <PMVStack gap={0.5} align="flex-end" flexShrink={0}>
          <RowStateLine
            entry={entry}
            hasDrift={hasDrift}
            behindCount={behindCount}
            totalArtifactsOnInstall={totalArtifactsOnInstall}
            lockReason={lockReason}
          />
          <DistributionEventLine entry={entry} />
        </PMVStack>
      </PMHStack>

      {expanded && hasDrift && (
        <PMBox
          paddingLeft="56px"
          paddingRight={6}
          paddingBottom={3}
          paddingTop={1}
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

function BranchChip({ branch }: Readonly<{ branch: string }>) {
  const isDefault = branch === 'main';
  return (
    <PMHStack
      gap="4px"
      align="center"
      color={isDefault ? 'text.faded' : 'text.secondary'}
      flexShrink={0}
      aria-label={`Branch ${branch}`}
    >
      <PMIcon fontSize="xs">
        <LuGitBranch />
      </PMIcon>
      <PMText
        fontSize="11px"
        fontFamily="mono"
        fontVariantNumeric="tabular-nums"
        lineHeight="1.4"
      >
        {branch}
      </PMText>
    </PMHStack>
  );
}

type RowStateLineProps = {
  entry: InstallDriftEntry;
  hasDrift: boolean;
  behindCount: number;
  totalArtifactsOnInstall: number;
  lockReason: InstallLockReason | null;
};

function RowStateLine({
  entry,
  hasDrift,
  behindCount,
  totalArtifactsOnInstall,
  lockReason,
}: Readonly<RowStateLineProps>) {
  const inProgress =
    entry.lastDistributionStatus === DistributionStatus.in_progress;

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
          {lockReason === 'no-app-token' && (
            <>
              {', via '}
              <PMText
                as="span"
                fontFamily="mono"
                fontSize="11px"
                color="warning"
                paddingX={1}
                paddingY="1px"
                bg="background.tertiary"
                borderRadius="sm"
              >
                packmind-cli install
              </PMText>
            </>
          )}
        </PMText>
      </PMHStack>
    );
  }

  if (!entry.lastDistributionStatus && !entry.mostRecentDeployedAt) {
    return (
      <PMHStack gap={2} align="center">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          borderWidth="1px"
          borderColor="border.tertiary"
          aria-hidden
        />
        <PMText fontSize="xs" color="faded">
          Never distributed
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
      <PMText fontSize="xs" color="faded">
        Aligned
      </PMText>
    </PMHStack>
  );
}

function DistributionEventLine({
  entry,
}: Readonly<{ entry: InstallDriftEntry }>) {
  const anchorIso = entry.lastDistributedAt ?? entry.mostRecentDeployedAt;
  if (!anchorIso) return null;
  const verb = entry.lastDistributionStatus
    ? DISTRIBUTION_VERB[entry.lastDistributionStatus]
    : 'Pushed';
  const failed = entry.lastDistributionStatus === DistributionStatus.failure;
  const stale =
    !failed &&
    entry.lastDistributionStatus !== DistributionStatus.in_progress &&
    entry.mostRecentDeployedAtDays >= STALE_DAYS_THRESHOLD;
  const color = failed ? 'red.500' : stale ? 'orange.500' : 'text.faded';
  return (
    <PMTooltip label={formatAbsoluteDate(anchorIso)} placement="top">
      <PMHStack
        gap="4px"
        align="center"
        color={color}
        aria-label={`${verb} ${anchorIso}`}
        cursor="help"
      >
        <PMText fontSize="11px" fontVariantNumeric="tabular-nums">
          {verb} {formatRelativeDate(anchorIso)}
        </PMText>
      </PMHStack>
    </PMTooltip>
  );
}

function TargetChip({ name }: Readonly<{ name: string }>) {
  return (
    <PMBox
      paddingX="6px"
      paddingY="1px"
      borderRadius="sm"
      bg="background.tertiary"
      color="text.secondary"
      fontFamily="mono"
      fontSize="11px"
      fontVariantNumeric="tabular-nums"
      lineHeight="1.4"
      flexShrink={0}
      aria-label={`Target ${name}`}
    >
      {name}
    </PMBox>
  );
}

const INSTALL_FILTER_ITEMS: Array<{
  value: InstallDriftFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'drift', label: 'Drift', dotColor: 'orange.500' },
  { value: 'aligned', label: 'Aligned', dotColor: 'green.500' },
];

function InstallFilterControl({
  value,
  counts,
  onChange,
}: Readonly<{
  value: InstallDriftFilter;
  counts: { all: number; drift: number; aligned: number };
  onChange: (next: InstallDriftFilter) => void;
}>) {
  return (
    <PMHStack
      gap={0}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
      role="tablist"
      aria-label="Filter distributions"
    >
      {INSTALL_FILTER_ITEMS.map((item, idx) => {
        const active = value === item.value;
        const count = counts[item.value];
        const disabled = count === 0 && !active;
        return (
          <PMBox
            key={item.value}
            as="button"
            role="tab"
            aria-selected={active}
            aria-disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onChange(item.value);
            }}
            bg={active ? 'background.secondary' : 'transparent'}
            border="none"
            borderLeftWidth={idx === 0 ? 0 : '1px'}
            borderColor="border.tertiary"
            cursor={disabled ? 'not-allowed' : 'pointer'}
            opacity={disabled ? 0.5 : 1}
            paddingY="6px"
            paddingX={2.5}
            transition="background-color 120ms ease-out"
            _hover={
              active || disabled ? undefined : { bg: 'background.tertiary' }
            }
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

function InstallEmptyState({
  installFilter,
  repoQuery,
  hasActiveFilter,
  onClear,
}: Readonly<{
  installFilter: InstallDriftFilter;
  repoQuery: string;
  hasActiveFilter: boolean;
  onClear: () => void;
}>) {
  const message = (() => {
    if (repoQuery && installFilter !== 'all') {
      const label = installFilter === 'drift' ? 'drifted' : 'aligned';
      return `No ${label} distributions match “${repoQuery}”.`;
    }
    if (repoQuery) return `No distributions match “${repoQuery}”.`;
    if (installFilter === 'drift') return 'No drifted distributions.';
    if (installFilter === 'aligned') return 'No aligned distributions.';
    return 'No distributions.';
  })();
  return (
    <PMVStack gap={2} align="start" paddingX={6} paddingY={6}>
      <PMText fontSize="sm" color="secondary">
        {message}
      </PMText>
      {hasActiveFilter && (
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
      )}
    </PMVStack>
  );
}
