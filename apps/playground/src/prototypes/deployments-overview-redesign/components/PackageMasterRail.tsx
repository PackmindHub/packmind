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
import { LuRotateCw, LuSearch } from 'react-icons/lu';
import { packageBehindInstallCount, packageHasDrift } from '../data';
import type { PackageDrift } from '../types';

type PackageMasterRailProps = {
  packages: PackageDrift[];
  selectedPackageId: string | null;
  onSelect: (packageId: string) => void;
  bulkSelected: Set<string>;
  onToggleBulk: (packageId: string) => void;
  onSetBulkSelection: (next: Set<string>) => void;
  onDistributeBulk: () => void;
};

type DriftFilter = 'all' | 'drift' | 'aligned';

export function PackageMasterRail({
  packages,
  selectedPackageId,
  onSelect,
  bulkSelected,
  onToggleBulk,
  onSetBulkSelection,
  onDistributeBulk,
}: Readonly<PackageMasterRailProps>) {
  const [query, setQuery] = useState('');
  const [driftFilter, setDriftFilter] = useState<DriftFilter>('all');

  const counts = useMemo(() => {
    let drift = 0;
    for (const p of packages) if (packageHasDrift(p)) drift++;
    return { all: packages.length, drift, aligned: packages.length - drift };
  }, [packages]);

  const filtered = useMemo(() => {
    let list = packages;
    if (driftFilter === 'drift') list = list.filter(packageHasDrift);
    else if (driftFilter === 'aligned')
      list = list.filter((p) => !packageHasDrift(p));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [packages, query, driftFilter]);

  const visibleDrifted = useMemo(
    () => filtered.filter(packageHasDrift),
    [filtered],
  );

  const bulkDistributionCount = useMemo(() => {
    let n = 0;
    for (const p of packages) {
      if (bulkSelected.has(p.id)) n += packageBehindInstallCount(p);
    }
    return n;
  }, [packages, bulkSelected]);

  const selectionActive = bulkSelected.size > 0;

  const handleSelectAllVisible = () => {
    const next = new Set(bulkSelected);
    for (const p of visibleDrifted) next.add(p.id);
    onSetBulkSelection(next);
  };

  const handleClearVisible = () => {
    const next = new Set(bulkSelected);
    for (const p of visibleDrifted) next.delete(p.id);
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
            color="text.faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Packages
          </PMText>
          <PMText
            fontSize="11px"
            color="text.faded"
            fontVariantNumeric="tabular-nums"
          >
            {packages.length}
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
            placeholder="Filter packages"
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
          filtered.map((p) => (
            <PackageRow
              key={p.id}
              pkg={p}
              selected={p.id === selectedPackageId}
              bulkSelected={bulkSelected.has(p.id)}
              selectionActive={selectionActive}
              onSelect={() => onSelect(p.id)}
              onToggleBulk={() => onToggleBulk(p.id)}
            />
          ))
        )}
      </PMBox>

      <RailActionBar
        bulkSelectionSize={bulkSelected.size}
        bulkDistributionCount={bulkDistributionCount}
        visibleDrifted={visibleDrifted}
        visibleDriftedSelectedCount={
          visibleDrifted.filter((p) => bulkSelected.has(p.id)).length
        }
        onSelectAllVisible={handleSelectAllVisible}
        onClearVisible={handleClearVisible}
        onClearAll={handleClearAll}
        onDistribute={onDistributeBulk}
      />
    </PMBox>
  );
}

type PackageRowProps = {
  pkg: PackageDrift;
  selected: boolean;
  bulkSelected: boolean;
  selectionActive: boolean;
  onSelect: () => void;
  onToggleBulk: () => void;
};

function PackageRow({
  pkg,
  selected,
  bulkSelected,
  selectionActive,
  onSelect,
  onToggleBulk,
}: Readonly<PackageRowProps>) {
  const behindInstallCount = packageBehindInstallCount(pkg);
  const hasDrift = packageHasDrift(pkg);
  const totalInstalls = pkg.installLocations.length;
  const [hovered, setHovered] = useState(false);
  const showCheckbox = hasDrift && (bulkSelected || selectionActive || hovered);

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
        width="32px"
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        onClick={(e) => e.stopPropagation()}
      >
        {hasDrift && (
          <PMBox
            opacity={showCheckbox ? 1 : 0}
            transition="opacity 100ms ease-out"
          >
            <PMCheckbox
              size="sm"
              checked={bulkSelected}
              onCheckedChange={() => onToggleBulk()}
              aria-label={`Select ${pkg.name} for bulk distribute`}
            />
          </PMBox>
        )}
      </PMBox>

      <PMBox
        as="button"
        type="button"
        onClick={onSelect}
        bg="transparent"
        border="none"
        cursor="pointer"
        flex={1}
        minW={0}
        textAlign="left"
        paddingY={2.5}
        paddingRight={3}
        _focusVisible={{
          outline: 'none',
          boxShadow: 'inset 0 0 0 2px var(--chakra-colors-branding-primary)',
        }}
        aria-pressed={selected}
        aria-label={`Package ${pkg.name}, ${behindInstallCount} of ${totalInstalls} distributions behind`}
      >
        <PMHStack gap={3} align="center" justify="space-between">
          <PMText
            fontSize="sm"
            fontWeight={selected ? 'semibold' : 'medium'}
            color="text.primary"
            truncate
            flex={1}
            minW={0}
          >
            {pkg.name}
          </PMText>
          <PMTooltip
            label={
              hasDrift
                ? `${behindInstallCount} of ${totalInstalls} distributions behind`
                : `${totalInstalls} distributions aligned`
            }
            showArrow
            openDelay={200}
          >
            <PMBox
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="20px"
              height="20px"
              cursor="help"
              flexShrink={0}
            >
              <PMBox
                width="8px"
                height="8px"
                borderRadius="full"
                bg={hasDrift ? 'orange.500' : 'green.500'}
                aria-hidden
              />
            </PMBox>
          </PMTooltip>
        </PMHStack>
      </PMBox>
    </PMBox>
  );
}

type RailActionBarProps = {
  bulkSelectionSize: number;
  bulkDistributionCount: number;
  visibleDrifted: PackageDrift[];
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
            aria-label="Select all visible drifted packages"
          />
          <PMText
            fontSize="xs"
            color="text.secondary"
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
            type="button"
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
  const message = (() => {
    if (query)
      return driftFilter === 'all'
        ? `No packages match “${query}”.`
        : `No ${driftFilter === 'drift' ? 'drifted' : 'aligned'} packages match “${query}”.`;
    if (driftFilter === 'drift') return 'No packages currently drifting.';
    if (driftFilter === 'aligned') return 'No fully aligned packages.';
    return 'No packages.';
  })();
  return (
    <PMVStack gap={2} align="start" padding={4}>
      <PMText fontSize="xs" color="secondary">
        {message}
      </PMText>
      <PMBox
        as="button"
        type="button"
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
  counts: { all: number; drift: number; aligned: number };
  onChange: (value: DriftFilter) => void;
};

const FILTER_ITEMS: Array<{
  value: DriftFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'drift', label: 'Drift', dotColor: 'orange.500' },
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
            type="button"
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
                color={active ? 'text.primary' : 'text.secondary'}
                fontWeight={active ? 'semibold' : 'medium'}
              >
                {item.label}
              </PMText>
              <PMText
                fontSize="11px"
                color="text.faded"
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
