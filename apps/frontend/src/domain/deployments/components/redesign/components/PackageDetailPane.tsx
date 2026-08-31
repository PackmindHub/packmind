import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
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
import { format } from 'date-fns';
import { SelectionBar } from '../../SelectionBar';
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
};

function formatAbsoluteDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return format(parsed, 'yyyy-MM-dd h:mm a');
}

/**
 * Where the reader goes to see this package's distribution events, which is
 * where the details of a failure are: a route the pane links to, or a callback
 * the surface around the pane answers by showing the events itself.
 *
 * One destination in two shapes rather than two props, so a surface cannot
 * offer both and leave the pane to pick.
 */
export type DistributionHistoryTarget =
  | { readonly href: string }
  | { readonly onOpen: () => void };

type PackageDetailPaneProps = {
  pkg: PackageDrift;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onSyncPackage: (pkgId: PackageId, installKeys?: string[]) => void;
  /**
   * How to reach the distribution events, or null on a surface that already
   * lists them itself: a second way to reach what is on screen is not a way
   * out, it is a loop.
   */
  distributionHistory: DistributionHistoryTarget | null;
  /** Link to the package's detail page (default tab). */
  packagePageHref?: string | null;
  /**
   * When the pane is embedded on a surface that already shows the package name
   * and description (e.g. the package detail page), hide the identity header so
   * it isn't duplicated. The summary stats, distribute CTA, and install list
   * remain. Defaults to `false` (full header, as on the deployments overview).
   */
  hideIdentityHeader?: boolean;
  /**
   * Set by a surface that carries its own package-wide push, so the pane stops
   * carrying a second one and its header's `Distribute package` goes.
   *
   * The pane never offers a package-wide push of its own besides that button.
   * What the list offers is a subset push, from the selection bar above it, and
   * that is a different question: it acts on what was ticked and on nothing
   * else, so it does not compete with whatever the surface calls its own.
   *
   * Defaults to `false`, which is the deployments overview and the package
   * detail page: there the header button is the only package-wide push on
   * screen.
   */
  surfaceOwnsDistribute?: boolean;
  /**
   * The summary stats the surface already states above the pane, dropped here
   * rather than said a second time a row lower.
   *
   * Only the two inventory stats can be named: how many components the package
   * holds, and how many destinations it reaches. The rest of the row is state
   * rather than inventory, and a surface that had already said "3 destinations
   * behind" would not be showing this pane.
   *
   * A list and not a flag, because the two are not owned together. The context
   * surface states the component count on its Content tab in both editions,
   * and the destination count only where the `Targets` chip exists, which is
   * the edition that has a second channel to choose it against.
   *
   * Defaults to none, which is the deployments overview and the package detail
   * page: the rail beside the first says the destination count in passing, but
   * neither states the component count at all.
   */
  surfaceOwnsStats?: ReadonlyArray<'artifacts' | 'distributions'>;
};

type InstallDriftFilter = 'all' | 'drift' | 'failed' | 'aligned';

function installKey(repoId: string, targetId: string): string {
  return `${repoId}::${targetId}`;
}

export function PackageDetailPane({
  pkg,
  providersWithToken,
  isProvidersLoading,
  onSyncPackage,
  distributionHistory,
  packagePageHref,
  hideIdentityHeader = false,
  surfaceOwnsDistribute = false,
  surfaceOwnsStats = [],
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
  /*
   * The package-wide push in the header, which only exists to be the one
   * redistribute on a surface that offers none of its own.
   */
  const showHeaderDistribute = hasDrift && !surfaceOwnsDistribute;
  const headerLockTooltip = (() => {
    if (!allDriftedLocked) return null;
    if (driftedLockCounts.inProgress === driftedKeys.length) {
      return 'A distribution is already in progress for every drifted target.';
    }
    if (driftedLockCounts.noAppToken === driftedKeys.length) {
      return 'Every drifted target lives on a provider without a token — use `packmind install`.';
    }
    return 'Every drifted target is either in progress or distributed via `packmind install`.';
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
    let failed = 0;
    for (const e of entries) {
      if (e.behindArtifacts.length > 0) drift++;
      if (e.lastDistributionStatus === DistributionStatus.failure) failed++;
    }
    return {
      all: entries.length,
      drift,
      failed,
      aligned: entries.length - drift,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (installFilter === 'drift')
      list = list.filter((e) => e.behindArtifacts.length > 0);
    else if (installFilter === 'failed')
      list = list.filter(
        (e) => e.lastDistributionStatus === DistributionStatus.failure,
      );
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

  const splitByMode = useMemo(() => {
    const gitPush: InstallDriftEntry[] = [];
    const cliInstall: InstallDriftEntry[] = [];
    for (const entry of filteredEntries) {
      const reason =
        lockByKey.get(installKey(entry.repo.id, entry.target.id)) ?? null;
      if (reason === 'no-app-token') cliInstall.push(entry);
      else gitPush.push(entry);
    }
    return { gitPush, cliInstall };
  }, [filteredEntries, lockByKey]);

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

  /*
   * What a push from here would carry. Only the drifted ones: the list lets an
   * aligned row be ticked, and pushing it would be a distribution that changes
   * nothing.
   */
  const selectedDriftedKeys = useMemo(
    () => Array.from(selectedKeys).filter((key) => driftedKeys.includes(key)),
    [selectedKeys, driftedKeys],
  );

  return (
    <PMVStack gap={0} align="stretch" minH={0} h="100%">
      {/*
        Who this is, and nothing else. The state that used to sit under the name
        moved down to the row that filters on it, so a surface that names the
        package itself renders no band here at all rather than an empty one.
      */}
      {(!hideIdentityHeader || showHeaderDistribute) && (
        <PMBox
          paddingX={6}
          paddingY={3}
          borderBottomWidth="1px"
          borderColor="border.tertiary"
          bg="background.primary"
        >
          <PMHStack gap={3} align="start" justify="space-between">
            {!hideIdentityHeader && (
              <PMVStack gap={1} align="start" flex={1} minW={0}>
                <PMHStack gap={2} align="center" minW={0}>
                  <PMHeading level="h3" color="primary">
                    {pkg.name}
                  </PMHeading>
                  {packagePageHref && (
                    <PMTooltip
                      label="Open package page"
                      showArrow
                      openDelay={300}
                    >
                      <PMLink
                        asChild
                        aria-label={`Open ${pkg.name} package page`}
                      >
                        <Link to={packagePageHref}>
                          <PMBox
                            display="inline-flex"
                            alignItems="center"
                            justifyContent="center"
                            width="28px"
                            height="28px"
                            borderRadius="sm"
                            color="text.faded"
                            transition="color 120ms ease-out, background-color 120ms ease-out"
                            _hover={{
                              color: 'text.primary',
                              bg: 'background.tertiary',
                            }}
                          >
                            <PMIcon fontSize="sm">
                              <LuArrowUpRight />
                            </PMIcon>
                          </PMBox>
                        </Link>
                      </PMLink>
                    </PMTooltip>
                  )}
                </PMHStack>
                <PMText fontSize="sm" color="secondary" maxW="68ch">
                  {pkg.description}
                </PMText>
              </PMVStack>
            )}
            {showHeaderDistribute && (
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
        </PMBox>
      )}

      <PMBox
        paddingX={6}
        paddingY={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        bg="background.primary"
      >
        <PMHStack gap={3} align="center" wrap="wrap">
          <PMBox position="relative" flex={1} minW="180px" maxW="260px">
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
              placeholder="Filter by repo or target"
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
          {/*
            What the filter control does not already say, on the same row as it
            rather than on a band of its own above.

            The control states the drift and the failures, in numbers that also
            act: `Drift 6` and `Failed 1` were a summary stat and a filter chip
            saying the same figure 130px apart, and the one that acts is the one
            to keep. What is left is the inventory the surface has not claimed,
            how long since anything went out, and the way in to the events.
          */}
          <PMHStack gap={5} align="center" wrap="wrap" marginLeft="auto">
            {!surfaceOwnsStats.includes('artifacts') && (
              <SummaryStat
                label="Artifacts"
                value={pkg.artifacts.length.toString()}
              />
            )}
            {!surfaceOwnsStats.includes('distributions') && (
              <SummaryStat
                label="Distributions"
                value={totalInstalls.toString()}
              />
            )}
            <SummaryStat
              label="Latest push"
              value={mostRecentPush?.label ?? 'Never'}
              tone={
                mostRecentPush && mostRecentPush.days >= STALE_DAYS_THRESHOLD
                  ? 'warn'
                  : 'ok'
              }
            />
            {/*
              Shown whatever went wrong. It used to hide behind a failure
              alert that carried the same link, and that alert is gone: a
              full-width red band for one destination out of ten is urgency
              where the red `Failed 1` chip on this same row is a fact you can
              also click.
            */}
            {distributionHistory && (
              <PMLink
                asChild
                variant="underline"
                fontSize="sm"
                cursor="pointer"
              >
                <DistributionHistoryTrigger target={distributionHistory}>
                  Distribution history
                  <PMIcon fontSize="xs" marginLeft="4px">
                    <LuArrowUpRight />
                  </PMIcon>
                </DistributionHistoryTrigger>
              </PMLink>
            )}
          </PMHStack>
        </PMHStack>
      </PMBox>

      {/*
        What is ticked and what can be done with it, above the list rather than
        under it. A selection is made running down a list, so the row that was
        just ticked is near the pointer and the action has to be too. It used to
        be a footer below a scrolling region, which is the far end of the pane
        from the gesture that fills it.

        The same bar the component lists on this surface use, so picking a
        destination and picking a standard are one gesture with one shape.

        Shown on any pick, so ticking a row is always acknowledged, but it
        carries an action only when something ticked can actually be pushed: an
        aligned row is a legal pick and pushing it would change nothing.
      */}
      {selectedKeys.size > 0 && (
        <PMBox
          paddingX={6}
          paddingY={3}
          borderBottomWidth="1px"
          borderColor="border.tertiary"
          bg="background.primary"
        >
          <SelectionBar
            count={selectedKeys.size}
            actions={
              selectedDriftedCount > 0
                ? [
                    {
                      label: `Update ${selectedDriftedCount} destination${selectedDriftedCount === 1 ? '' : 's'}`,
                      icon: <LuRotateCw />,
                      onAct: () => onSyncPackage(pkg.id, selectedDriftedKeys),
                    },
                  ]
                : []
            }
            onClear={() => setSelectedKeys(new Set())}
          />
        </PMBox>
      )}

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
            {splitByMode.gitPush.length > 0 && (
              <>
                <ModeSectionHeader
                  mode="git-push"
                  count={splitByMode.gitPush.length}
                />
                {splitByMode.gitPush.map((entry) => {
                  const key = installKey(entry.repo.id, entry.target.id);
                  return (
                    <InstallRow
                      key={key}
                      entry={entry}
                      selected={selectedKeys.has(key)}
                      lockReason={lockByKey.get(key) ?? null}
                      onToggle={() => toggleInstall(key)}
                      distributionHistory={distributionHistory}
                    />
                  );
                })}
              </>
            )}
            {splitByMode.cliInstall.length > 0 && (
              <>
                <ModeSectionHeader
                  mode="cli-install"
                  count={splitByMode.cliInstall.length}
                />
                {splitByMode.cliInstall.map((entry) => {
                  const key = installKey(entry.repo.id, entry.target.id);
                  return (
                    <InstallRow
                      key={key}
                      entry={entry}
                      selected={selectedKeys.has(key)}
                      lockReason={lockByKey.get(key) ?? null}
                      onToggle={() => toggleInstall(key)}
                      distributionHistory={distributionHistory}
                    />
                  );
                })}
              </>
            )}
          </PMVStack>
        )}
      </PMBox>
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

type InstallRowProps = {
  entry: InstallDriftEntry;
  selected: boolean;
  lockReason: InstallLockReason | null;
  onToggle: () => void;
  distributionHistory: DistributionHistoryTarget | null;
};

const LOCK_CHECKBOX_TOOLTIP: Record<InstallLockReason, string> = {
  'in-progress': 'Distribution in progress for this target.',
  'no-app-token':
    'This provider has no token — use `packmind install` to update this distribution.',
};

function InstallRow({
  entry,
  selected,
  lockReason,
  onToggle,
  distributionHistory,
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
          />
          <DistributionEventLine
            entry={entry}
            distributionHistory={distributionHistory}
          />
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
};

function RowStateLine({
  entry,
  hasDrift,
  behindCount,
  totalArtifactsOnInstall,
}: Readonly<RowStateLineProps>) {
  const inProgress =
    entry.lastDistributionStatus === DistributionStatus.in_progress;
  const failed = entry.lastDistributionStatus === DistributionStatus.failure;

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

  if (failed) {
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
  distributionHistory,
}: Readonly<{
  entry: InstallDriftEntry;
  distributionHistory: DistributionHistoryTarget | null;
}>) {
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

  if (failed && distributionHistory) {
    return (
      <PMTooltip
        label={`Failed ${formatAbsoluteDate(anchorIso)} — view error details`}
        placement="top"
      >
        <PMLink asChild cursor="pointer">
          <DistributionHistoryTrigger
            target={distributionHistory}
            ariaLabel={`View distribution history (failed ${anchorIso})`}
          >
            <PMHStack gap="4px" align="center" color={color}>
              <PMText
                fontSize="11px"
                fontVariantNumeric="tabular-nums"
                textDecoration="underline"
                textUnderlineOffset="2px"
              >
                Failed {formatRelativeDate(anchorIso)}
              </PMText>
              <PMIcon fontSize="10px">
                <LuArrowUpRight />
              </PMIcon>
            </PMHStack>
          </DistributionHistoryTrigger>
        </PMLink>
      </PMTooltip>
    );
  }

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

/*
 * The element that opens the distribution events, drawn the same either way: a
 * router link when they are a page, a button when the surface around the pane
 * shows them itself. Both call sites wrap it in `PMLink asChild`, so the reader
 * is not asked to tell apart two controls that lead to the same list.
 */
function DistributionHistoryTrigger({
  target,
  ariaLabel,
  children,
}: Readonly<{
  target: DistributionHistoryTarget;
  ariaLabel?: string;
  children: ReactNode;
}>) {
  if ('href' in target) {
    return (
      <Link to={target.href} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={target.onOpen} aria-label={ariaLabel}>
      {children}
    </button>
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
  { value: 'failed', label: 'Failed', dotColor: 'red.500' },
  { value: 'aligned', label: 'Aligned', dotColor: 'green.500' },
];

function InstallFilterControl({
  value,
  counts,
  onChange,
}: Readonly<{
  value: InstallDriftFilter;
  counts: { all: number; drift: number; failed: number; aligned: number };
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
            /*
             * Spelled out, because the label and the count are two text nodes
             * side by side and a screen reader ran them together as "Drift6".
             */
            aria-label={`${item.label}, ${count} destination${count === 1 ? '' : 's'}`}
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

type DistributionMode = 'git-push' | 'cli-install';

const MODE_META: Record<
  DistributionMode,
  { icon: IconType; title: string; description: ReactNode }
> = {
  'git-push': {
    icon: LuGitBranch,
    title: 'Git push',
    description: 'Packmind commits directly on the configured branch.',
  },
  'cli-install': {
    icon: LuTerminal,
    title: 'CLI install',
    description: (
      <>
        Update by running{' '}
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
          packmind install
        </PMText>{' '}
        from each repo.
      </>
    ),
  },
};

function ModeSectionHeader({
  mode,
  count,
}: Readonly<{ mode: DistributionMode; count: number }>) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  return (
    <PMBox
      paddingX={6}
      paddingY={2.5}
      bg="background.secondary"
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _first={{ borderTopWidth: 0 }}
      position="sticky"
      top={0}
      zIndex={1}
    >
      {/*
        One line, with the note about the mode at the far end of it rather than
        under the title. Two headers of two lines each cost 80px of a list the
        reader came here to scroll, to carry a sentence they read the first time
        and have known ever since. It wraps back to two lines when the pane is
        too narrow to hold both, which is the one case where the note is worth
        the row.
      */}
      <PMHStack gap={2} align="center" wrap="wrap" rowGap={0.5}>
        <PMIcon fontSize="sm" color="text.secondary">
          <Icon />
        </PMIcon>
        <PMText fontSize="sm" fontWeight="semibold" color="primary">
          {meta.title}
        </PMText>
        <PMText fontSize="11px" color="faded" fontVariantNumeric="tabular-nums">
          · {count} distribution{count === 1 ? '' : 's'}
        </PMText>
        <PMText fontSize="xs" color="secondary" marginLeft="auto">
          {meta.description}
        </PMText>
      </PMHStack>
    </PMBox>
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
      const label =
        installFilter === 'drift'
          ? 'drifted'
          : installFilter === 'failed'
            ? 'failed'
            : 'aligned';
      return `No ${label} distributions match “${repoQuery}”.`;
    }
    if (repoQuery) return `No distributions match “${repoQuery}”.`;
    if (installFilter === 'drift') return 'No drifted distributions.';
    if (installFilter === 'failed') return 'No failed distributions.';
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
