import { useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { LuClock, LuRotateCw, LuSearch } from 'react-icons/lu';
import type { GitProviderId, GitRepoId } from '@packmind/types';
import {
  repositoryBehindInstallCount,
  repositoryDriftedTargetCount,
  repositoryFailedInstallCount,
  repositoryHasDrift,
  repositoryHasFailedDistribution,
  repositoryLockProfile,
  type RepositoryLockProfile,
} from '../selectors/buildRepositoryDriftOverview';
import type { RepositoryDrift } from '../types';

type RepositoryMasterRailProps = {
  repositories: RepositoryDrift[];
  selectedRepositoryId: GitRepoId | null;
  onSelect: (repositoryId: GitRepoId) => void;
  bulkSelected: Set<GitRepoId>;
  onToggleBulk: (repositoryId: GitRepoId) => void;
  onSetBulkSelection: (next: Set<GitRepoId>) => void;
  onDistributeBulk: () => void;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
};

type DriftFilter = 'all' | 'drift' | 'failed' | 'aligned';

export function RepositoryMasterRail({
  repositories,
  selectedRepositoryId,
  onSelect,
  bulkSelected,
  onToggleBulk,
  onSetBulkSelection,
  onDistributeBulk,
  providersWithToken,
  isProvidersLoading,
}: Readonly<RepositoryMasterRailProps>) {
  const [query, setQuery] = useState('');
  const [driftFilter, setDriftFilter] = useState<DriftFilter>('all');

  const counts = useMemo(() => {
    let drift = 0;
    let failed = 0;
    for (const r of repositories) {
      if (repositoryHasDrift(r)) drift++;
      if (repositoryHasFailedDistribution(r)) failed++;
    }
    return {
      all: repositories.length,
      drift,
      failed,
      aligned: repositories.length - drift,
    };
  }, [repositories]);

  const filtered = useMemo(() => {
    let list = repositories;
    if (driftFilter === 'drift') list = list.filter(repositoryHasDrift);
    else if (driftFilter === 'failed')
      list = list.filter(repositoryHasFailedDistribution);
    else if (driftFilter === 'aligned')
      list = list.filter((r) => !repositoryHasDrift(r));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        `${r.repo.owner}/${r.repo.name}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [repositories, query, driftFilter]);

  const visibleDrifted = useMemo(
    () => filtered.filter(repositoryHasDrift),
    [filtered],
  );

  const bulkDistributionCount = useMemo(() => {
    let n = 0;
    for (const r of repositories) {
      if (bulkSelected.has(r.id)) n += repositoryBehindInstallCount(r);
    }
    return n;
  }, [repositories, bulkSelected]);

  const selectionActive = bulkSelected.size > 0;

  const handleSelectAllVisible = () => {
    const next = new Set(bulkSelected);
    for (const r of visibleDrifted) next.add(r.id);
    onSetBulkSelection(next);
  };

  const handleClearVisible = () => {
    const next = new Set(bulkSelected);
    for (const r of visibleDrifted) next.delete(r.id);
    onSetBulkSelection(next);
  };

  const handleClearAll = () => onSetBulkSelection(new Set());

  return (
    <PMBox
      width="320px"
      flexShrink={0}
      bg="background.primary"
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      <PMVStack
        gap={2}
        paddingX={3}
        paddingY={3}
        align="stretch"
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack justify="space-between" align="center">
          <PMText
            fontSize="11px"
            color="faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Repositories
          </PMText>
          <PMText
            fontSize="11px"
            color="faded"
            fontVariantNumeric="tabular-nums"
          >
            {repositories.length}
          </PMText>
        </PMHStack>
        <PMBox position="relative">
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
            placeholder="Filter repositories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="sm"
            paddingLeft="32px"
          />
        </PMBox>
        <DriftFilterControl
          value={driftFilter}
          counts={counts}
          onChange={setDriftFilter}
        />
      </PMVStack>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filtered.length === 0 ? (
          <FilteredZero
            query={query}
            driftFilter={driftFilter}
            onClear={() => {
              setQuery('');
              setDriftFilter('all');
            }}
          />
        ) : (
          filtered.map((r) => (
            <RepositoryRow
              key={r.id}
              repo={r}
              selected={r.id === selectedRepositoryId}
              bulkSelected={bulkSelected.has(r.id)}
              selectionActive={selectionActive}
              lockProfile={repositoryLockProfile(
                r,
                providersWithToken,
                isProvidersLoading,
              )}
              onSelect={() => onSelect(r.id)}
              onToggleBulk={() => onToggleBulk(r.id)}
            />
          ))
        )}
      </PMBox>

      <RailActionBar
        bulkSelectionSize={bulkSelected.size}
        bulkDistributionCount={bulkDistributionCount}
        visibleDrifted={visibleDrifted}
        visibleDriftedSelectedCount={
          visibleDrifted.filter((r) => bulkSelected.has(r.id)).length
        }
        onSelectAllVisible={handleSelectAllVisible}
        onClearVisible={handleClearVisible}
        onClearAll={handleClearAll}
        onDistribute={onDistributeBulk}
      />
    </PMBox>
  );
}

type RepositoryRowProps = {
  repo: RepositoryDrift;
  selected: boolean;
  bulkSelected: boolean;
  selectionActive: boolean;
  lockProfile: RepositoryLockProfile;
  onSelect: () => void;
  onToggleBulk: () => void;
};

function RepositoryRow({
  repo,
  selected,
  bulkSelected,
  selectionActive,
  lockProfile,
  onSelect,
  onToggleBulk,
}: Readonly<RepositoryRowProps>) {
  const behindInstallCount = repositoryBehindInstallCount(repo);
  const driftedTargets = repositoryDriftedTargetCount(repo);
  const hasDrift = behindInstallCount > 0;
  const hasFailure = repositoryHasFailedDistribution(repo);
  const failedInstallCount = repositoryFailedInstallCount(repo);
  const totalTargets = repo.targets.length;
  const [hovered, setHovered] = useState(false);
  const showCheckbox = hasDrift && (bulkSelected || selectionActive || hovered);

  const dotColor = hasFailure
    ? 'red.500'
    : hasDrift
      ? lockProfile === 'all-in-progress'
        ? 'blue.300'
        : 'orange.500'
      : 'green.500';

  const summaryLine = (() => {
    if (hasFailure) {
      return `${failedInstallCount} failed`;
    }
    if (hasDrift) {
      const targetWord = driftedTargets === 1 ? 'target' : 'targets';
      return `${driftedTargets} ${targetWord} drifted`;
    }
    const targetWord = totalTargets === 1 ? 'target' : 'targets';
    return `${totalTargets} ${targetWord} aligned`;
  })();

  const tooltipLabel = hasFailure
    ? `${failedInstallCount} distribution${failedInstallCount === 1 ? '' : 's'} failed`
    : hasDrift
      ? lockProfile === 'all-no-app-token'
        ? `${behindInstallCount} drifted, all via packmind-cli install`
        : lockProfile === 'all-in-progress'
          ? `${behindInstallCount} distribution${behindInstallCount === 1 ? '' : 's'} in progress`
          : `${behindInstallCount} of ${totalTargets} target${totalTargets === 1 ? '' : 's'} need redistribution`
      : `${totalTargets} target${totalTargets === 1 ? '' : 's'} aligned`;

  const ariaLabel = `Repository ${repo.repo.owner}/${repo.repo.name}, ${summaryLine}`;
  const showLockTag = hasDrift && !hasFailure && lockProfile !== 'none';

  return (
    <PMBox
      position="relative"
      bg={selected ? 'background.secondary' : 'transparent'}
      _hover={selected ? undefined : { bg: 'background.tertiary' }}
      borderBottom="1px solid"
      borderColor="border.tertiary"
      transition="background-color 120ms ease-out"
      display="flex"
      alignItems="stretch"
      paddingLeft={3}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {selected && (
        <PMBox
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width="2px"
          bg="branding.primary"
          aria-hidden
        />
      )}

      <PMBox
        width="16px"
        flexShrink={0}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        onClick={(e) => e.stopPropagation()}
      >
        {hasDrift && (
          <PMBox
            opacity={showCheckbox ? 1 : 0}
            transition="opacity 100ms ease-out"
            display="inline-flex"
            alignItems="center"
          >
            <PMCheckbox
              size="sm"
              checked={bulkSelected}
              onCheckedChange={() => onToggleBulk()}
              aria-label={`Select ${repo.repo.owner}/${repo.repo.name} for bulk distribute`}
            />
          </PMBox>
        )}
      </PMBox>

      <PMBox
        as="button"
        onClick={onSelect}
        bg="transparent"
        border="none"
        cursor="pointer"
        flex={1}
        minW={0}
        textAlign="left"
        paddingY={2.5}
        paddingLeft={2}
        paddingRight={3}
        _focusVisible={{
          outline: 'none',
          boxShadow: 'inset 0 0 0 2px var(--chakra-colors-branding-primary)',
        }}
        aria-pressed={selected}
        aria-label={ariaLabel}
      >
        <PMHStack gap={2} align="start" justify="space-between">
          <PMVStack gap="2px" align="start" flex={1} minW={0}>
            <PMText
              fontSize="sm"
              fontWeight={selected ? 'semibold' : 'medium'}
              color="primary"
              truncate
              maxW="100%"
            >
              {repo.repo.owner}/{repo.repo.name}
            </PMText>
            <PMHStack gap={1.5} align="center" maxW="100%">
              <PMText
                fontSize="11px"
                color="faded"
                fontVariantNumeric="tabular-nums"
                truncate
              >
                {repo.branch}
              </PMText>
              <PMBox
                width="2px"
                height="2px"
                borderRadius="full"
                bg="border.tertiary"
                aria-hidden
                flexShrink={0}
              />
              <PMText
                fontSize="11px"
                color={
                  hasFailure ? 'error' : hasDrift ? 'warning' : 'secondary'
                }
                truncate
              >
                {summaryLine}
              </PMText>
            </PMHStack>
          </PMVStack>
          <PMHStack gap={1.5} align="center" flexShrink={0} paddingTop="3px">
            {showLockTag && (
              <PMBox display="inline-flex" alignItems="center">
                {lockProfile === 'all-no-app-token' ? (
                  <PMText
                    as="span"
                    fontFamily="mono"
                    fontSize="10px"
                    fontWeight="medium"
                    color="warning"
                    bg="background.tertiary"
                    paddingX={1}
                    paddingY="1px"
                    borderRadius="sm"
                    letterSpacing="0.04em"
                    textTransform="uppercase"
                  >
                    CLI
                  </PMText>
                ) : (
                  <PMIcon fontSize="xs" color="blue.300" aria-hidden>
                    <LuClock />
                  </PMIcon>
                )}
              </PMBox>
            )}
            <PMTooltip label={tooltipLabel} showArrow openDelay={200}>
              <PMBox
                display="flex"
                alignItems="center"
                justifyContent="center"
                width="20px"
                height="20px"
                cursor="help"
              >
                <PMBox
                  width="8px"
                  height="8px"
                  borderRadius="full"
                  bg={dotColor}
                  aria-hidden
                />
              </PMBox>
            </PMTooltip>
          </PMHStack>
        </PMHStack>
      </PMBox>
    </PMBox>
  );
}

type RailActionBarProps = {
  bulkSelectionSize: number;
  bulkDistributionCount: number;
  visibleDrifted: RepositoryDrift[];
  visibleDriftedSelectedCount: number;
  onSelectAllVisible: () => void;
  onClearVisible: () => void;
  onClearAll: () => void;
  onDistribute: () => void;
};

function RailActionBar({
  bulkSelectionSize,
  bulkDistributionCount,
  visibleDrifted,
  visibleDriftedSelectedCount,
  onSelectAllVisible,
  onClearVisible,
  onClearAll,
  onDistribute,
}: Readonly<RailActionBarProps>) {
  if (bulkSelectionSize === 0 && visibleDrifted.length === 0) return null;

  if (bulkSelectionSize === 0) {
    return (
      <PMBox
        paddingX={3}
        paddingY={2.5}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        bg="background.primary"
      >
        <PMButton
          variant="secondary"
          size="sm"
          width="100%"
          onClick={onSelectAllVisible}
        >
          Select all drifted ({visibleDrifted.length})
        </PMButton>
      </PMBox>
    );
  }

  const allVisibleSelected =
    visibleDrifted.length > 0 &&
    visibleDriftedSelectedCount === visibleDrifted.length;
  const someVisibleSelected =
    visibleDriftedSelectedCount > 0 && !allVisibleSelected;

  return (
    <PMBox
      paddingX={3}
      paddingY={3}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
    >
      <PMVStack gap={2.5} align="stretch">
        <PMHStack gap={2} align="center" minW={0}>
          <PMCheckbox
            size="sm"
            checked={
              allVisibleSelected
                ? true
                : someVisibleSelected
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(details) => {
              if (details.checked === true) onSelectAllVisible();
              else onClearVisible();
            }}
            disabled={visibleDrifted.length === 0}
            aria-label="Select all visible drifted repositories"
          />
          <PMText
            fontSize="xs"
            color="secondary"
            fontVariantNumeric="tabular-nums"
            truncate
            flex={1}
            minW={0}
          >
            {bulkSelectionSize} selected · {bulkDistributionCount} distribution
            {bulkDistributionCount === 1 ? '' : 's'}
          </PMText>
        </PMHStack>
        <PMHStack gap={2} justify="space-between" align="center">
          <PMBox
            as="button"
            onClick={onClearAll}
            fontSize="xs"
            color="text.faded"
            bg="transparent"
            border="none"
            cursor="pointer"
            padding={0}
            _hover={{ color: 'text.primary' }}
          >
            Clear
          </PMBox>
          <PMButton variant="primary" size="sm" onClick={onDistribute}>
            <PMIcon fontSize="sm">
              <LuRotateCw />
            </PMIcon>
            Distribute
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

function FilteredZero({
  query,
  driftFilter,
  onClear,
}: Readonly<{
  query: string;
  driftFilter: DriftFilter;
  onClear: () => void;
}>) {
  const filterLabel =
    driftFilter === 'drift'
      ? 'drifted'
      : driftFilter === 'failed'
        ? 'failed'
        : 'aligned';
  const message = (() => {
    if (query)
      return driftFilter === 'all'
        ? `No repositories match “${query}”.`
        : `No ${filterLabel} repositories match “${query}”.`;
    if (driftFilter === 'drift') return 'No repositories currently drifting.';
    if (driftFilter === 'failed')
      return 'No repositories with failed distributions.';
    if (driftFilter === 'aligned') return 'No fully aligned repositories.';
    return 'No repositories.';
  })();
  return (
    <PMVStack gap={2} align="start" padding={4}>
      <PMText fontSize="xs" color="secondary">
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

type DriftFilterControlProps = {
  value: DriftFilter;
  counts: { all: number; drift: number; failed: number; aligned: number };
  onChange: (value: DriftFilter) => void;
};

const FILTER_ITEMS: Array<{
  value: DriftFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'drift', label: 'Drift', dotColor: 'orange.500' },
  { value: 'failed', label: 'Failed', dotColor: 'red.500' },
  { value: 'aligned', label: 'Aligned', dotColor: 'green.500' },
];

function DriftFilterControl({
  value,
  counts,
  onChange,
}: Readonly<DriftFilterControlProps>) {
  return (
    <PMHStack
      gap={0}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
      role="tablist"
      aria-label="Filter by drift state"
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
            flex={1}
            bg={active ? 'background.secondary' : 'transparent'}
            border="none"
            borderLeftWidth={idx === 0 ? 0 : '1px'}
            borderColor="border.tertiary"
            cursor="pointer"
            paddingY="6px"
            paddingX={2}
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
