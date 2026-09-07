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
  PMIconButton,
  PMInput,
  PMLink,
  PMSpinner,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowUpRight,
  LuChevronDown,
  LuChevronRight,
  LuGitBranch,
  LuInfo,
  LuPackage,
  LuRotateCw,
  LuSearch,
  LuTriangleAlert,
} from 'react-icons/lu';
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
} from '../selectors/installDriftEntries';
import {
  repositoryBehindInstallCount,
  repositoryDriftedPackageCount,
  repositoryFailedInstallCount,
  repositoryHasDrift,
  repositoryHasFailedDistribution,
  repositoryLockProfile,
  targetDriftedPackageCount,
  targetFailedPackageCount,
} from '../selectors/buildRepositoryDriftOverview';
import type { PackageDrift, RepositoryDrift, TargetDrift } from '../types';
import { DriftArtifactRow } from './DriftArtifactRow';
import {
  ADD_GIT_CONNECTION_LABEL,
  NO_GIT_CONNECTION_BODY,
  NO_GIT_CONNECTION_TITLE,
  NO_GIT_CONNECTION_TOOLTIP,
  NO_GIT_CONNECTION_WHY,
  NO_GIT_CONNECTION_WHY_LABEL,
} from '../../noGitConnection';

const DISTRIBUTION_VERB: Record<DistributionStatus, string> = {
  [DistributionStatus.success]: 'Distributed',
  [DistributionStatus.failure]: 'Failed',
  [DistributionStatus.in_progress]: 'Started',
  [DistributionStatus.no_changes]: 'Checked',
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
  /**
   * Where a reader goes to connect this repository's provider, so the banner
   * that says the app cannot write here can also offer the way out.
   *
   * Built by the caller, like the history link above it: this pane is handed
   * its hrefs rather than reading the route params, which is what lets both
   * surfaces that render it keep their own url shapes. Null while the caller
   * has no organisation to point at, where the banner keeps its explanation
   * and drops the offer rather than linking somewhere that does not exist.
   */
  gitSettingsHref: string | null;
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
  gitSettingsHref,
}: Readonly<RepositoryDetailPaneProps>) {
  const lockProfile = repositoryLockProfile(
    repo,
    providersWithToken,
    isProvidersLoading,
  );
  const hasDrift = repositoryHasDrift(repo);
  const hasFailure = repositoryHasFailedDistribution(repo);
  const driftedPackages = repositoryDriftedPackageCount(repo);
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
      return NO_GIT_CONNECTION_TOOLTIP;
    }
    if (lockProfile === 'all-in-progress') {
      return 'A distribution is in progress for every drifted target.';
    }
    return null;
  })();
  const repoSyncDisabled = lockProfile !== 'none';

  /**
   * One call per picked landing, which is what the per-row button does too: a
   * selection here is a handful of package-on-target pairs, not a repository.
   */
  const distributeSelected = () => {
    for (const key of selectedKeys) {
      if (!driftedRowKeys.includes(key)) continue;
      const [targetIdStr, packageIdStr] = key.split('::');
      onSyncPackageOnTarget(
        packageIdStr as PackageId,
        repo.id,
        targetIdStr as TargetId,
      );
    }
  };

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
            {/*
              One action slot, whose scope follows what the reader has picked.
              Ticking rows narrows it from the repository to the handful of
              distributions selected, and Clear widens it back.

              The narrow scope used to live in a strip pinned to the bottom of
              the pane. In the full-bleed Distribution layout the bottom of the
              pane is the bottom of the page, and the rail's action bar is
              already down there, so the two read as one footer of buttons
              under a surface that is otherwise all content. The strip also
              stood there permanently to say "Select packages to distribute."
              beside a disabled button, which is an instruction, not an action.

              Here instead, because this slot is right-aligned in a row whose
              other half is elastic: the selection can take it over without
              moving a single row of the list underneath. A band above the list
              could not, it would wrap and push every row down by its own
              height on the first tick.
            */}
            {selectedDriftedCount > 0 ? (
              <PMHStack gap={2} align="center" flexShrink={0}>
                <PMText
                  fontSize="xs"
                  color="secondary"
                  fontVariantNumeric="tabular-nums"
                >
                  {selectedDriftedCount} selected
                </PMText>
                <PMBox
                  as="button"
                  onClick={() => setSelectedKeys(new Set())}
                  fontSize="xs"
                  /*
                    A step quieter than the count beside it, but not the faded
                    ramp: text.faded lands at 4.54:1 on this background, which
                    clears AA by four hundredths and is too thin a margin for
                    something meant to be clicked. text.tertiary is 8.35:1.
                  */
                  color="text.tertiary"
                  bg="transparent"
                  border="none"
                  cursor="pointer"
                  padding={0}
                  _hover={{ color: 'text.primary' }}
                  aria-label="Clear the selection and act on the whole repository again"
                >
                  Clear selection
                </PMBox>
                {/*
                  Never disabled, and it needs no lock tooltip: a row's
                  checkbox is only enabled when that row has drift and its
                  provider is neither mid-distribution nor missing a token, so
                  a selection existing at all is proof there is something here
                  this button can commit.
                */}
                <PMButton
                  variant="primary"
                  size="sm"
                  onClick={distributeSelected}
                  title={`Distribute the ${selectedDriftedCount} selected distribution${selectedDriftedCount === 1 ? '' : 's'}`}
                >
                  <PMIcon fontSize="sm">
                    <LuRotateCw />
                  </PMIcon>
                  Distribute selected
                </PMButton>
              </PMHStack>
            ) : (
              hasDrift && (
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
              )
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
                value={`${driftedPackages} package${driftedPackages === 1 ? '' : 's'}, ${behindInstallCount} distribution${behindInstallCount === 1 ? '' : 's'}`}
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
          {/*
            The banner names what the app cannot do, then what to run instead.
            It used to be one line, "use `packmind install` to update
            distributions on this repository", which told the reader what to
            type and nothing about why the app would not do it for them. The
            wording, and the reason it is worded this way, are in
            `noGitConnection`.

            The link is here because the sentence names an alternative, and an
            alternative a reader cannot reach is a remark rather than an
            option. Secondary, and after the text: this is a state to
            understand before it is a state to fix, and the fix belongs to an
            admin who may not be the person reading.
          */}
          {lockProfile === 'all-no-app-token' && (
            <PMAlert.Root status="warning">
              <PMAlert.Indicator>
                <PMIcon>
                  <LuTriangleAlert />
                </PMIcon>
              </PMAlert.Indicator>
              <PMAlert.Content>
                <PMHStack gap={1.5} align="center">
                  <PMAlert.Title>{NO_GIT_CONNECTION_TITLE}</PMAlert.Title>
                  {/*
                    The explanation, one hover away. A real button rather than
                    the hoverable box this pattern usually is, so the reader on
                    a keyboard reaches it and the one on a touch screen can tap
                    it: a tooltip nobody can open is the same as not writing it.
                    And a `PMIconButton` rather than a boxed one, because a bare
                    `button` element gets the browser's own blue ring when
                    focused, which is the one thing on this screen that would
                    not be Packmind's.
                  */}
                  <PMTooltip label={NO_GIT_CONNECTION_WHY} placement="top">
                    <PMIconButton
                      aria-label={NO_GIT_CONNECTION_WHY_LABEL}
                      variant="ghost"
                      size="xs"
                      cursor="help"
                      minW="auto"
                      height="auto"
                    >
                      <PMIcon as={LuInfo} />
                    </PMIconButton>
                  </PMTooltip>
                </PMHStack>
                <PMAlert.Description>
                  {NO_GIT_CONNECTION_BODY}
                </PMAlert.Description>
                {gitSettingsHref && (
                  <PMBox paddingTop={2}>
                    <PMButton variant="secondary" size="xs" asChild>
                      <Link to={gitSettingsHref}>
                        {ADD_GIT_CONNECTION_LABEL}
                      </Link>
                    </PMButton>
                  </PMBox>
                )}
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
              placeholder="Search packages"
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
                /*
                 * Read off the repository and not off `filteredTargets`: a
                 * single target loses its header, and it must not gain one
                 * back because a filter hid its sibling.
                 */
                showHeader={repo.targets.length > 1}
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
    </PMVStack>
  );
}

type TargetSectionProps = {
  target: TargetDrift;
  /**
   * The repository has more than one target, so its sections have to say which
   * of them they are. With one target the header states the repository's own
   * numbers a second time, under a name the reader did not need.
   */
  showHeader: boolean;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  selectedKeys: Set<PackageRowKey>;
  onToggleRow: (key: PackageRowKey) => void;
  onSyncPackageOnTarget: (packageId: PackageId) => void;
  packageHistoryHref: (packageId: PackageId) => string | null;
};

function TargetSection({
  target,
  showHeader,
  providersWithToken,
  isProvidersLoading,
  selectedKeys,
  onToggleRow,
  onSyncPackageOnTarget,
  packageHistoryHref,
}: Readonly<TargetSectionProps>) {
  const drifted = targetDriftedPackageCount(target);
  const failed = targetFailedPackageCount(target);
  const isAligned = drifted === 0 && failed === 0;

  return (
    <PMBox borderBottomWidth="1px" borderColor="border.tertiary">
      {showHeader && (
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
            color={failed > 0 ? 'error' : drifted > 0 ? 'warning' : 'secondary'}
            fontVariantNumeric="tabular-nums"
            flexShrink={0}
          >
            {/*
              One unit across the three, the package, because that is what the
              list under this header holds. `aligned` counted packages while the
              other two counted distributions, and a distribution of a package to
              another target of the same repository counted here too.
            */}
            {isAligned
              ? `${target.packages.length} aligned`
              : failed > 0
                ? `${failed} failed`
                : `${drifted} drifted`}
          </PMText>
        </PMHStack>
      )}

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
  'in-progress': 'Distributing this package to this target.',
  'no-app-token': NO_GIT_CONNECTION_TOOLTIP,
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
      {/*
        44px, which is the height of the destination rows on a package's
        Distribution tab. This row used to be 72: twelve pixels of padding
        above and below, and a second line under the name for the package
        description.

        Six pixels of padding rather than that tab's eight, because the tallest
        thing in this row is the distribute button and it carries its own
        inset. The two rows come out the same height, which is the point.
      */}
      <PMHStack gap={3} align="center" paddingX={6} paddingY={1.5}>
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
                  aria-label={`Select ${pkg.name} for distribution`}
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
          {/*
            The name alone. The description used to sit under it, which cost
            the row its second line and repeated itself once per target the
            package landed on: the same sentence three times down a repository
            with three targets. It is inventory, and this pane is about state.
            The package's own screen carries it, one row up from here.
          */}
          <PMHStack gap={2} align="center" maxW="100%">
            {/*
              The slot is kept when there is nothing to expand. An aligned
              package and a drifting one sit in the same list, and without it
              the aligned ones started a chevron's width to the left, which
              read as two lists rather than one.
            */}
            <PMBox
              flexShrink={0}
              width="14px"
              display="flex"
              alignItems="center"
            >
              {hasDrift && (
                <PMIcon fontSize="sm" color="text.secondary">
                  {expanded ? <LuChevronDown /> : <LuChevronRight />}
                </PMIcon>
              )}
            </PMBox>
            {/*
              The crate, the mark this app keeps for the container, from the
              sidebar to the Context rail. Named as the thing it is because
              the row under it is a component and now says so: a package and a
              component of it can carry the same name, and this pane had one
              of each called Typescript with nothing to tell them apart.
            */}
            <PMIcon fontSize="sm" color="text.secondary" flexShrink={0}>
              <LuPackage />
            </PMIcon>
            <PMText fontSize="sm" fontWeight="medium" color="primary" truncate>
              {pkg.name}
            </PMText>
          </PMHStack>
        </PMBox>

        {/*
          Where it stands and when it last moved, across rather than stacked,
          as they read on a package's Distribution tab. Wrapping, so a narrow
          pane falls back to the stack instead of squeezing out the name.
        */}
        <PMHStack
          gap={3}
          align="center"
          justify="flex-end"
          rowGap={0.5}
          wrap="wrap"
          flexShrink={0}
        >
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
        </PMHStack>

        <PMTooltip
          label={lockReason ? LOCK_TOOLTIP[lockReason] : null}
          placement="top"
        >
          <PMBox display="inline-flex">
            {/*
              The per-row action at the size the Context component list gives
              its own, which is what let this row reach 44px: a `sm` button is
              36px tall, eight more than everything else in the row, so it set
              the height on its own and no amount of padding could get under
              it. Still a tile rather than a ghost icon, because this one
              commits to a repository.
            */}
            <PMIconButton
              variant="tertiary"
              size="xs"
              disabled={syncDisabled}
              onClick={onSync}
              aria-label={`Distribute ${pkg.name} on this target`}
            >
              <LuRotateCw />
            </PMIconButton>
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
            {behindCount} of {totalArtifactsOnInstall} component
            {totalArtifactsOnInstall === 1 ? '' : 's'} drifted
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
          {behindCount} of {totalArtifactsOnInstall} component
          {totalArtifactsOnInstall === 1 ? '' : 's'} drifted
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
